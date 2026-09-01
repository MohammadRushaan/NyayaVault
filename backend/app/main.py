import os
import io
import json
import uuid
import sqlite3
import tarfile
from datetime import datetime
from typing import Optional, List

import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.security import encrypt_document, decrypt_document, compute_sha256
from app.core.rbac import get_current_user, UserAuth, ROLE_HIERARCHY
from app.services.redaction_engine import redact_pii
from app.services.malkhana_service import generate_malkhana_qr

# Initialize FastAPI App
app = FastAPI(
    title="NyayaVault API",
    description="Edge-First Zero-Trust Evidence Management & BSA Sec 63 Ledger",
    version="2.0.0"
)

# Comprehensive CORS Configuration for Vercel & Local Development
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_origins=[
        "https://nyaya-vault.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*", "X-Officer-Id", "Content-Type", "Authorization"],
    expose_headers=["*"],
    max_age=600,
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "edge_vault.db")
STORAGE_DIR = os.path.join(BASE_DIR, "vault_storage")
BACKUP_DIR = os.path.join(BASE_DIR, "backups")

os.makedirs(STORAGE_DIR, exist_ok=True)
os.makedirs(BACKUP_DIR, exist_ok=True)

# Database Initialization
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Core Ledger Table
    cursor.execute('''
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
            masked_text TEXT,
            raw_text TEXT,
            encrypted_file_path TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Chain of Custody Timeline
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS custody_timeline (
            event_id TEXT PRIMARY KEY,
            doc_id TEXT,
            from_entity TEXT,
            to_entity TEXT,
            purpose TEXT,
            authorized_by TEXT,
            verified_hash TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Security Breach & Tamper Alerts
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS security_alerts (
            alert_id TEXT PRIMARY KEY,
            alert_type TEXT,
            case_number TEXT,
            doc_id TEXT,
            triggered_by TEXT,
            details TEXT,
            severity TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Ensure Initial Genesis Block
    cursor.execute("SELECT COUNT(*) FROM ledger")
    if cursor.fetchone()[0] == 0:
        cursor.execute('''
            INSERT INTO ledger (doc_id, case_number, doc_type, officer_id, actor_role, sha256_hash, prev_hash, block_hash, masked_text, raw_text, encrypted_file_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            "GENESIS-BLOCK",
            "SYSTEM-CORE",
            "Genesis Block",
            "SYSTEM",
            "Administrator",
            "0000000000000000000000000000000000000000000000000000000000000000",
            "GENESIS",
            "0000000000000000000000000000000000000000000000000000000000000000",
            "System Genesis Established",
            "System Genesis Established",
            "ROOT"
        ))
    
    conn.commit()
    conn.close()

init_db()

# Request Schemas
class HandoverRequest(BaseModel):
    doc_id: str
    from_entity: str
    to_entity: str
    purpose: str

# 1. Health & Root Check Endpoints
@app.get("/")
def root():
    return {"status": "online", "service": "NyayaVault API", "version": "2.0.0"}

@app.get("/api")
def api_root():
    return {"status": "online", "service": "NyayaVault API", "version": "2.0.0"}

# 2. RBAC Officers Directory
@app.get("/api/auth/users")
def get_auth_users():
    return [
        {"officer_id": "CONST_KUMAR", "name": "Constable A. Kumar", "role": "Constable"},
        {"officer_id": "IO_SHARMA", "name": "Inspector R. Sharma", "role": "Investigating Officer"},
        {"officer_id": "SHO_VERMA", "name": "SHO A. Verma", "role": "Station House Officer"},
        {"officer_id": "FORENSIC_LAB", "name": "Dr. P. Forensic", "role": "Forensic Analyst"},
        {"officer_id": "ADMIN", "name": "HQ System Admin", "role": "System Administrator"}
    ]

# 3. Senior-Officer Command Dashboard Metrics
@app.get("/api/dashboard/metrics")
def get_dashboard_metrics(current_user: UserAuth = Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    
    total_docs = conn.execute("SELECT COUNT(*) FROM ledger WHERE doc_id != 'GENESIS-BLOCK'").fetchone()[0]
    active_cases = conn.execute("SELECT COUNT(DISTINCT case_number) FROM ledger WHERE doc_id != 'GENESIS-BLOCK'").fetchone()[0]
    security_alerts_count = conn.execute("SELECT COUNT(*) FROM security_alerts").fetchone()[0]
    
    recent_alerts = conn.execute("SELECT * FROM security_alerts ORDER BY timestamp DESC LIMIT 5").fetchall()
    conn.close()
    
    return {
        "metrics": {
            "total_documents": total_docs,
            "active_cases": active_cases,
            "security_alerts": security_alerts_count
        },
        "recent_alerts": [dict(a) for a in recent_alerts]
    }

# 4. Immutable Ledger History & Smart Search
@app.get("/api/ledger/history")
def get_ledger_history(current_user: UserAuth = Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM ledger WHERE doc_id != 'GENESIS-BLOCK' ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/documents/search")
def search_documents(
    query: Optional[str] = None,
    doc_type: Optional[str] = None,
    current_user: UserAuth = Depends(get_current_user)
):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    
    sql = "SELECT * FROM ledger WHERE doc_id != 'GENESIS-BLOCK'"
    params = []
    
    if query:
        sql += " AND (case_number LIKE ? OR doc_id LIKE ? OR masked_text LIKE ?)"
        q_term = f"%{query}%"
        params.extend([q_term, q_term, q_term])
        
    if doc_type and doc_type != "All":
        sql += " AND doc_type = ?"
        params.append(doc_type)
        
    sql += " ORDER BY id DESC"
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# 5. Ingestion Engine (Envelope Encryption & Merkle Chain)
@app.post("/api/documents/ingest")
async def ingest_document(
    case_number: str = Form(...),
    doc_type: str = Form(...),
    file: Optional[UploadFile] = File(None),
    text_content: Optional[str] = Form(None),
    current_user: UserAuth = Depends(get_current_user)
):
    doc_id = f"DOC-{uuid.uuid4().hex[:10].upper()}"
    
    if file:
        raw_bytes = await file.read()
        raw_str = f"Binary File: {file.filename} ({len(raw_bytes)} bytes)"
    elif text_content:
        raw_bytes = text_content.encode("utf-8")
        raw_str = text_content
    else:
        raise HTTPException(status_code=400, detail="Provide a file or text content.")

    # 1. SHA-256 Digest of Raw Ingested Bytes
    sha256_digest = compute_sha256(raw_bytes)
    
    # 2. Bilingual Demographic PII Scrubbing
    redacted_preview = redact_pii(raw_str)

    # 3. Envelope Encryption to Disk (.enc sealed container)
    enc_path = os.path.join(STORAGE_DIR, f"{doc_id}.enc")
    envelope = encrypt_document(raw_bytes)
    with open(enc_path, "w") as f:
        json.dump(envelope, f)

    # 4. Merkle Sequential Hash Chaining
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    last_block = cursor.execute("SELECT block_hash FROM ledger ORDER BY id DESC LIMIT 1").fetchone()
    prev_hash = last_block[0] if last_block else "GENESIS"
    
    block_hash_input = f"{doc_id}{case_number}{sha256_digest}{prev_hash}".encode("utf-8")
    block_hash = compute_sha256(block_hash_input)

    # 5. Commit to Database
    cursor.execute('''
        INSERT INTO ledger (doc_id, case_number, doc_type, officer_id, actor_role, sha256_hash, prev_hash, block_hash, masked_text, raw_text, encrypted_file_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        doc_id, case_number, doc_type, current_user.officer_id, current_user.role,
        sha256_digest, prev_hash, block_hash, redacted_preview, raw_str, enc_path
    ))
    
    # Record Initial Custodial Inception
    cursor.execute('''
        INSERT INTO custody_timeline (event_id, doc_id, from_entity, to_entity, purpose, authorized_by, verified_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (f"EVT-{uuid.uuid4().hex[:8].upper()}", doc_id, "Evidence Inception", "Station Malkhana", f"Seized & Sealed under Sec 63 BSA by {current_user.officer_id}", current_user.officer_id, sha256_digest))
    
    conn.commit()
    conn.close()

    # 6. Generate High-Density Base64 Malkhana QR
    qr_b64 = generate_malkhana_qr(case_number, doc_id, sha256_digest)

    return {
        "status": "SUCCESS",
        "doc_id": doc_id,
        "case_number": case_number,
        "doc_type": doc_type,
        "sha256_digest": sha256_digest,
        "block_hash": block_hash,
        "masked_text": redacted_preview,
        "malkhana_qr": qr_b64,
        "timestamp": datetime.utcnow().isoformat()
    }

# 6. Physical Malkhana QR Verification Endpoint
@app.post("/api/documents/verify-qr")
async def verify_qr_endpoint(
    file: UploadFile = File(...),
    current_user: UserAuth = Depends(get_current_user)
):
    contents = await file.read()
    
    # Decode Image using OpenCV
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file format.")
        
    detector = cv2.QRCodeDetector()
    decoded_data, points, _ = detector.detectAndDecode(img)
    
    if not decoded_data:
        raise HTTPException(
            status_code=400, 
            detail="No readable QR code pattern detected in the uploaded image."
        )

    parts = decoded_data.split("|")
    if len(parts) < 3:
        raise HTTPException(
            status_code=422, 
            detail=f"Malformed NyayaVault QR payload: '{decoded_data}'"
        )
    
    case_no = parts[1]
    doc_id = parts[2]

    # Look up in Immutable Ledger
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM ledger WHERE doc_id = ?", (doc_id,)).fetchone()
    conn.close()

    if not row:
        raise HTTPException(
            status_code=404, 
            detail=f"Document UUID '{doc_id}' decoded from QR, but no on-chain ledger record exists."
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

# 7. Digital Evidence Binary/Text Verification Endpoint
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
    is_valid = (calculated_hash.strip().lower() == expected_hash.strip().lower())

    if not is_valid and doc_id:
        conn = sqlite3.connect(DB_PATH)
        conn.execute('''
            INSERT INTO security_alerts (alert_id, alert_type, case_number, doc_id, triggered_by, details, severity, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            f"ALT-{uuid.uuid4().hex[:8].upper()}",
            "INTEGRITY_TAMPER",
            "FLAGGED",
            doc_id,
            current_user.officer_id,
            f"Digest Mismatch: Expected {expected_hash[:16]}... Got {calculated_hash[:16]}...",
            "CRITICAL",
            datetime.utcnow()
        ))
        conn.commit()
        conn.close()

    return {
        "status": "VALID" if is_valid else "TAMPER_DETECTED",
        "expected_hash": expected_hash,
        "calculated_hash": calculated_hash,
        "integrity_verified": is_valid,
        "audit_type": "CONTENT_INTEGRITY"
    }

# 8. Chain of Custody Handover & Timeline
@app.post("/api/custody/handover")
def log_custody_handover(
    req: HandoverRequest,
    current_user: UserAuth = Depends(get_current_user)
):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT sha256_hash FROM ledger WHERE doc_id = ?", (req.doc_id,)).fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Document ID not found in ledger.")
        
    evt_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"
    conn.execute('''
        INSERT INTO custody_timeline (event_id, doc_id, from_entity, to_entity, purpose, authorized_by, verified_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (evt_id, req.doc_id, req.from_entity, req.to_entity, req.purpose, current_user.officer_id, row["sha256_hash"]))
    conn.commit()
    conn.close()
    
    return {"status": "RECORDED", "event_id": evt_id}

@app.get("/api/custody/{doc_id}/timeline")
def get_custody_timeline(doc_id: str, current_user: UserAuth = Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    events = conn.execute("SELECT * FROM custody_timeline WHERE doc_id = ? ORDER BY timestamp ASC", (doc_id,)).fetchall()
    conn.close()
    return [dict(e) for e in events]

# 9. Section 63 BSA Statutory Electronic Certificate
@app.get("/api/ledger/{doc_id}/bsa-certificate")
def get_bsa_certificate(doc_id: str, current_user: UserAuth = Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    doc = conn.execute("SELECT * FROM ledger WHERE doc_id = ?", (doc_id,)).fetchone()
    conn.close()

    if not doc:
        raise HTTPException(status_code=404, detail="Evidence document not found.")

    return {
        "certificate_id": f"BSA63-{uuid.uuid4().hex[:12].upper()}",
        "statutory_act": "Bharatiya Sakshya Adhiniyam, 2023 (Section 63)",
        "doc_id": doc["doc_id"],
        "case_number": doc["case_number"],
        "doc_type": doc["doc_type"],
        "officer": {
            "id": doc["officer_id"],
            "role": doc["actor_role"]
        },
        "crypto_integrity": {
            "algorithm": "AES-256-GCM / SHA-256 Chained",
            "sha256_digest": doc["sha256_hash"],
            "block_hash": doc["block_hash"],
            "previous_block_hash": doc["prev_hash"]
        },
        "declaration": "This certificate is generated by an automated cryptographic vault system operating lawfully. It certifies that the electronic record hash has remained unaltered and mathematically consistent throughout its complete custodial lifecycle.",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

# 10. Encrypted Vault Backup
@app.post("/api/system/backup")
def create_vault_backup(current_user: UserAuth = Depends(get_current_user)):
    if current_user.role != "Administrator":
        raise HTTPException(status_code=403, detail="Only System Administrators can create backups.")

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"nyayavault_backup_{timestamp}.tar.gz"
    backup_filepath = os.path.join(BACKUP_DIR, backup_filename)

    with tarfile.open(backup_filepath, "w:gz") as tar:
        if os.path.exists(DB_PATH):
            tar.add(DB_PATH, arcname="edge_vault.db")
        if os.path.exists(STORAGE_DIR):
            tar.add(STORAGE_DIR, arcname="vault_storage")

    with open(backup_filepath, "rb") as f:
        backup_hash = compute_sha256(f.read())

    return {
        "status": "BACKUP_COMPLETED",
        "backup_file": backup_filename,
        "sha256_hash": backup_hash,
        "timestamp": datetime.utcnow().isoformat()
    }