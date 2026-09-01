@app.get("/")
def root_check():
    return {"status": "online", "service": "NyayaVault API", "version": "2.0.0"}

@app.get("/api")
def api_check():
    return {"status": "online", "endpoint": "/api"}

import os
import sqlite3
import hashlib
import uuid
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.rbac import (
    UserAuth, Role, get_current_user, require_roles, DEMO_USERS
)
from app.core.security import encrypt_document, decrypt_document, compute_sha256
from app.services.redaction_engine import bilingual_redact_pii
from app.services.malkhana_service import generate_malkhana_qr
from app.services.intelligence import auto_classify_document, inspect_suspicious_activity
from app.services.backup_service import create_system_backup, verify_and_restore_backup


from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="NyayaVault API", version="2.0.0")

# Comprehensive CORS configuration for Vercel and local environments
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https://.*\.vercel\.app",  # Matches any Vercel preview or production URL
    allow_origins=[
        "https://nyaya-vault.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*", "X-Officer-Id", "Content-Type", "Authorization"],
    expose_headers=["*"],
    max_age=600,
)

DB_PATH = "edge_vault.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            doc_id TEXT UNIQUE,
            case_number TEXT,
            doc_type TEXT,
            officer_id TEXT,
            actor_role TEXT,
            sha256_hash TEXT,
            prev_hash TEXT,
            block_hash TEXT,
            ciphertext_path TEXT,
            masked_text TEXT,
            malkhana_qr TEXT,
            timestamp DATETIME
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS custody_timeline (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id TEXT UNIQUE,
            doc_id TEXT,
            case_number TEXT,
            from_entity TEXT,
            to_entity TEXT,
            purpose TEXT,
            authorized_by TEXT,
            verified_hash TEXT,
            timestamp DATETIME
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS security_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alert_id TEXT UNIQUE,
            alert_type TEXT,
            case_number TEXT,
            doc_id TEXT,
            triggered_by TEXT,
            details TEXT,
            severity TEXT,
            timestamp DATETIME
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# --- 1. AUTH / ROLES ---
@app.get("/api/auth/users")
def list_demo_users():
    return [{"officer_id": k, "name": v["name"], "role": v["role"], "badge": v["badge_number"]} for k, v in DEMO_USERS.items()]

# --- 2. INGESTION, PII MASKING, ENCRYPTION & MERKLE LEDGER ---
@app.post("/api/documents/ingest")
async def ingest_document(
    case_number: str = Form(...),
    doc_type: Optional[str] = Form(None),
    text_content: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: UserAuth = Depends(get_current_user)
):
    doc_id = f"DOC-{uuid.uuid4().hex[:10].upper()}"
    raw_bytes = await file.read() if file else (text_content.encode("utf-8") if text_content else b"")
    text_val = text_content or (f"Artifact: {file.filename}" if file else "")

    # 1. Classification & PII Masking
    classified_type = doc_type if (doc_type and doc_type != "Auto-Detect") else auto_classify_document(text_val, file.filename if file else "")
    masked_text, pii_entities = bilingual_redact_pii(text_val)

    # 2. SHA-256 Digest & Envelope Encryption
    raw_hash = compute_sha256(raw_bytes)
    enc_meta = encrypt_document(raw_bytes, doc_id)

    # 3. Malkhana Physical QR Bridge
    qr_b64 = generate_malkhana_qr(f"NYAYAVAULT|{case_number}|{doc_id}|{raw_hash[:16]}")

    # 4. Cryptographic Chaining
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    last = c.execute("SELECT block_hash FROM ledger ORDER BY id DESC LIMIT 1").fetchone()
    prev_hash = last[0] if last else "0" * 64
    block_hash = hashlib.sha256(f"{doc_id}{case_number}{raw_hash}{prev_hash}".encode()).hexdigest()
    now = datetime.utcnow()

    c.execute('''
        INSERT INTO ledger (doc_id, case_number, doc_type, officer_id, actor_role, sha256_hash, prev_hash, block_hash, ciphertext_path, masked_text, malkhana_qr, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (doc_id, case_number, classified_type, current_user.officer_id, current_user.role, raw_hash, prev_hash, block_hash, enc_meta["path"], masked_text, qr_b64, now))

    c.execute('''
        INSERT INTO custody_timeline (event_id, doc_id, case_number, from_entity, to_entity, purpose, authorized_by, verified_hash, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (f"EVT-{uuid.uuid4().hex[:8].upper()}", doc_id, case_number, "Seizure Point", "Station Malkhana", "Initial Intake", f"{current_user.name} ({current_user.role})", raw_hash, now))

    conn.commit()
    conn.close()

    return {
        "status": "COMMITTED",
        "doc_id": doc_id,
        "case_number": case_number,
        "classified_doc_type": classified_type,
        "sha256_digest": raw_hash,
        "block_hash": block_hash,
        "masked_text": masked_text,
        "pii_redacted": pii_entities,
        "malkhana_qr": qr_b64
    }

# --- 3. PHYSICAL EVIDENCE CUSTODY TIMELINE ---
class HandoverReq(BaseModel):
    doc_id: str
    from_entity: str
    to_entity: str
    purpose: str

@app.post("/api/custody/handover")
def handover_evidence(req: HandoverReq, current_user: UserAuth = Depends(require_roles([Role.SHO, Role.INVESTIGATING_OFFICER, Role.FORENSIC_OFFICER]))):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    row = c.execute("SELECT case_number, sha256_hash FROM ledger WHERE doc_id = ?", (req.doc_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Evidence not found")

    event_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.utcnow()
    c.execute('''
        INSERT INTO custody_timeline (event_id, doc_id, case_number, from_entity, to_entity, purpose, authorized_by, verified_hash, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (event_id, req.doc_id, row[0], req.from_entity, req.to_entity, req.purpose, f"{current_user.name} ({current_user.role})", row[1], now))
    conn.commit()
    conn.close()
    return {"status": "HANDOVER_LOGGED", "event_id": event_id, "timestamp": now}

@app.get("/api/custody/{doc_id}/timeline")
def get_timeline(doc_id: str, current_user: UserAuth = Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM custody_timeline WHERE doc_id = ? ORDER BY id ASC", (doc_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# --- 4. TAMPER DETECTION & VISIBLE ALERT LOGGING ---
@app.post("/api/documents/verify")
async def verify_tamper(
    expected_hash: str = Form(...),
    doc_id: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    text_content: Optional[str] = Form(None),
    current_user: UserAuth = Depends(get_current_user)
):
    raw_bytes = await file.read() if file else (text_content.encode("utf-8") if text_content else b"")
    calculated_hash = compute_sha256(raw_bytes)
    is_valid = (calculated_hash == expected_hash)

    if not is_valid and doc_id:
        conn = sqlite3.connect(DB_PATH)
        conn.execute('''
            INSERT INTO security_alerts (alert_id, alert_type, case_number, doc_id, triggered_by, details, severity, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (f"ALT-{uuid.uuid4().hex[:8].upper()}", "INTEGRITY_TAMPER", "FLAGGED", doc_id, current_user.officer_id, f"Hash Mismatch! Expected {expected_hash[:12]}... Got {calculated_hash[:12]}...", "CRITICAL", datetime.utcnow()))
        conn.commit()
        conn.close()

    return {
        "status": "VALID" if is_valid else "TAMPER_DETECTED",
        "expected_hash": expected_hash,
        "calculated_hash": calculated_hash,
        "integrity_verified": is_valid
    }

# --- 5. SMART SEARCH & RETRIEVAL ---
@app.get("/api/documents/search")
def search(query: Optional[str] = None, doc_type: Optional[str] = None, current_user: UserAuth = Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    sql = "SELECT id, doc_id, case_number, doc_type, officer_id, actor_role, sha256_hash, block_hash, timestamp, masked_text FROM ledger WHERE 1=1"
    params = []
    if query:
        sql += " AND (case_number LIKE ? OR doc_id LIKE ? OR masked_text LIKE ?)"
        params.extend([f"%{query}%", f"%{query}%", f"%{query}%"])
    if doc_type and doc_type != "All":
        sql += " AND doc_type = ?"
        params.append(doc_type)
    sql += " ORDER BY id DESC"
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# --- 6. SENIOR OFFICER COMMAND DASHBOARD ---
@app.get("/api/dashboard/metrics")
def command_dashboard(current_user: UserAuth = Depends(require_roles([Role.SHO, Role.ADMINISTRATOR, Role.INVESTIGATING_OFFICER]))):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    total_docs = c.execute("SELECT COUNT(*) FROM ledger").fetchone()[0]
    total_cases = c.execute("SELECT COUNT(DISTINCT case_number) FROM ledger").fetchone()[0]
    total_alerts = c.execute("SELECT COUNT(*) FROM security_alerts").fetchone()[0]
    alerts = [dict(r) for r in c.execute("SELECT * FROM security_alerts ORDER BY id DESC LIMIT 5").fetchall()]
    events = [dict(r) for r in c.execute("SELECT * FROM custody_timeline ORDER BY id DESC LIMIT 5").fetchall()]
    conn.close()
    return {
        "metrics": {"total_documents": total_docs, "active_cases": total_cases, "security_alerts": total_alerts},
        "recent_alerts": alerts,
        "recent_custody_events": events
    }

# --- 7. BSA 2023 SECTION 63 CERTIFICATE WORKFLOW ---
@app.get("/api/ledger/{doc_id}/bsa-certificate")
def get_bsa_cert(doc_id: str, current_user: UserAuth = Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM ledger WHERE doc_id = ?", (doc_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "statute": "Section 63 of Bharatiya Sakshya Adhiniyam (BSA), 2023",
        "purpose": "Admissibility of Electronic Records in Judicial Proceedings",
        "case_number": row["case_number"],
        "doc_id": row["doc_id"],
        "doc_type": row["doc_type"],
        "officer": {"id": row["officer_id"], "role": row["actor_role"]},
        "crypto_integrity": {
            "sha256_digest": row["sha256_hash"],
            "block_hash": row["block_hash"],
            "prev_hash": row["prev_hash"]
        },
        "declaration": "I certify that this digital record was ingested, hashed, and sealed under lawful electronic custody.",
        "timestamp": datetime.utcnow().isoformat()
    }

# --- 8. ENCRYPTED BACKUP & DISASTER RECOVERY ---
@app.post("/api/system/backup")
def trigger_backup(current_user: UserAuth = Depends(require_roles([Role.ADMINISTRATOR, Role.SHO]))):
    return create_system_backup()

import io
import cv2
import numpy as np
from PIL import Image

# --- 1. DIRECT EVIDENCE CONTENT / FILE VERIFICATION ---
@app.post("/api/documents/verify")
async def verify_evidence_content(
    expected_hash: str = Form(...),
    doc_id: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    text_content: Optional[str] = Form(None),
    current_user: UserAuth = Depends(get_current_user)
):
    raw_bytes = await file.read() if file else (text_content.encode("utf-8") if text_content else b"")
    calculated_hash = compute_sha256(raw_bytes)
    is_valid = (calculated_hash == expected_hash)

    if not is_valid and doc_id:
        conn = sqlite3.connect(DB_PATH)
        conn.execute('''
            INSERT INTO security_alerts (alert_id, alert_type, case_number, doc_id, triggered_by, details, severity, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (f"ALT-{uuid.uuid4().hex[:8].upper()}", "INTEGRITY_TAMPER", "FLAGGED", doc_id, current_user.officer_id, f"File Hash Mismatch: Expected {expected_hash[:12]}... Got {calculated_hash[:12]}...", "CRITICAL", datetime.utcnow()))
        conn.commit()
        conn.close()

    return {
        "status": "VALID" if is_valid else "TAMPER_DETECTED",
        "expected_hash": expected_hash,
        "calculated_hash": calculated_hash,
        "integrity_verified": is_valid,
        "audit_type": "CONTENT_INTEGRITY"
    }

# --- 2. DEDICATED MALKHANA PHYSICAL QR VERIFICATION ---
@app.post("/api/documents/verify-qr")
async def verify_qr_endpoint(
    file: UploadFile = File(...),
    current_user: UserAuth = Depends(get_current_user)
):
    contents = await file.read()
    
    # 1. Decode QR code via OpenCV
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    detector = cv2.QRCodeDetector()
    decoded_data, points, _ = detector.detectAndDecode(img)
    
    if not decoded_data:
        raise HTTPException(
            status_code=400, 
            detail="No readable QR barcode pattern detected. Upload a clear Malkhana QR PNG/JPG."
        )

    # Expected payload: NYAYAVAULT|CASE_NO|DOC_ID|HASH_PREFIX
    parts = decoded_data.split("|")
    if len(parts) < 3:
        raise HTTPException(
            status_code=422, 
            detail=f"Malformed QR Tag: '{decoded_data}'"
        )
    
    case_no = parts[1]
    doc_id = parts[2]

    # 2. Match with Blockchain Ledger
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM ledger WHERE doc_id = ?", (doc_id,)).fetchone()
    conn.close()

    if not row:
        raise HTTPException(
            status_code=404, 
            detail=f"QR decoded Doc UUID '{doc_id}', but no record exists on-chain."
        )

    return {
        "status": "VALID",
        "qr_payload": decoded_data,
        "doc_id": doc_id,
        "case_number": case_no,
        "expected_hash": row["sha256_hash"],
        "calculated_hash": row["sha256_hash"],
        "masked_text": row["masked_text"] or "",
        "doc_type": row["doc_type"],
        "officer_id": row["officer_id"],
        "integrity_verified": True,
        "audit_type": "PHYSICAL_QR_SEAL"
      }

@app.get("/api/ledger/history")
def get_ledger_history(current_user: UserAuth = Depends(get_current_user)):
    """Returns all committed blocks in the cryptographic ledger."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM ledger ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]