import os
import uuid
import time
import json
import sqlite3
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.core.security import ZeroTrustCrypto
from app.services.redaction_engine import LocalRedactor
from app.services.bsa_certificate import BSACertificateService
from app.services.malkhana_service import MalkhanaQRService

app = FastAPI(title="NyayaVault Enterprise Legal Core", version="4.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "vault_storage"
STORAGE_DIR.mkdir(exist_ok=True)
DB_PATH = BASE_DIR / "edge_vault.db"

MASTER_KEK = os.getenv("MASTER_KEK", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")
crypto = ZeroTrustCrypto(MASTER_KEK)

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                doc_id TEXT UNIQUE,
                case_number TEXT,
                doc_type TEXT,
                sha256_hash TEXT,
                actor_id TEXT,
                actor_role TEXT,
                action TEXT,
                block_hash TEXT,
                prev_hash TEXT,
                raw_text TEXT,
                redacted_text TEXT,
                bsa_certificate TEXT,
                malkhana_qr TEXT,
                encrypted_file_path TEXT
            )
        """)
        conn.commit()

init_db()

@app.post("/api/documents/ingest")
async def ingest_document(
    case_number: str = Form(...),
    doc_type: str = Form(...),
    officer_id: str = Form(...),
    actor_role: str = Form(...),
    text_content: str = Form(None),
    file: UploadFile = File(None)
):
    if file:
        raw_content = await file.read()
        filename = file.filename
    elif text_content:
        raw_content = text_content.encode("utf-8")
        filename = "direct_entry.txt"
    else:
        raise HTTPException(status_code=400, detail="Provide an uploaded image/document or text content.")

    doc_uuid = str(uuid.uuid4())

    # Process OCR & Redaction
    if text_content and not file:
        extracted_text = text_content
        redacted_preview = LocalRedactor.sanitize(extracted_text)
    else:
        extracted_text, redacted_preview = LocalRedactor.process_and_sanitize(raw_content, filename)

    # Envelope Encryption
    envelope = crypto.envelope_encrypt(raw_content)

    # Save physical encrypted ciphertext file to disk (.enc)
    enc_file_path = STORAGE_DIR / f"{doc_uuid}.enc"
    with open(enc_file_path, "w", encoding="utf-8") as f:
        json.dump(envelope, f, indent=2)

    # Merkle Block Linkage
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT block_hash FROM ledger ORDER BY id DESC LIMIT 1")
        last_row = cursor.fetchone()
        prev_hash = last_row[0] if last_row else "0" * 64

        cursor.execute("SELECT COUNT(*) FROM ledger")
        block_idx = cursor.fetchone()[0] + 1

        block_data = f"{block_idx}{doc_uuid}{envelope['sha256_hash']}{prev_hash}"
        block_hash = crypto.compute_sha256(block_data.encode())

        bsa_cert = BSACertificateService.generate(
            case_no=case_number,
            doc_id=doc_uuid,
            sha256_hash=envelope["sha256_hash"],
            officer_id=officer_id,
            role=actor_role
        )

        malkhana_qr = MalkhanaQRService.generate_evidence_tag(
            case_number=case_number,
            doc_id=doc_uuid,
            sha256_hash=envelope["sha256_hash"],
            doc_type=doc_type,
            actor_id=officer_id
        )

        cursor.execute("""
            INSERT INTO ledger (
                timestamp, doc_id, case_number, doc_type, sha256_hash,
                actor_id, actor_role, action, block_hash, prev_hash,
                raw_text, redacted_text, bsa_certificate, malkhana_qr, encrypted_file_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            int(time.time()), doc_uuid, case_number, doc_type, envelope["sha256_hash"],
            officer_id, actor_role, "DOCUMENT_GENESIS_INGESTION", block_hash, prev_hash,
            extracted_text, redacted_preview, json.dumps(bsa_cert), malkhana_qr, str(enc_file_path)
        ))
        conn.commit()

    return {
        "status": "SUCCESS",
        "doc_id": doc_uuid,
        "sha256_hash": envelope["sha256_hash"],
        "block_hash": block_hash,
        "raw_text": extracted_text,
        "redacted_preview": redacted_preview,
        "bsa_certificate": bsa_cert,
        "malkhana_qr": malkhana_qr,
        "disk_storage_path": str(enc_file_path)
    }

@app.get("/api/ledger/history")
def get_ledger_history():
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM ledger ORDER BY id DESC")
        rows = cursor.fetchall()
        return [
            {
                "id": r["id"],
                "timestamp": r["timestamp"],
                "doc_id": r["doc_id"],
                "case_number": r["case_number"],
                "doc_type": r["doc_type"],
                "sha256_hash": r["sha256_hash"],
                "actor_id": r["actor_id"],
                "actor_role": r["actor_role"],
                "action": r["action"],
                "block_hash": r["block_hash"],
                "raw_text": r["raw_text"],
                "redacted_text": r["redacted_text"],
                "bsa_certificate": json.loads(r["bsa_certificate"]),
                "malkhana_qr": r["malkhana_qr"],
                "encrypted_file_path": r["encrypted_file_path"]
            }
            for r in rows
        ]

@app.post("/api/documents/verify")
async def verify_integrity(
    expected_hash: str = Form(...),
    file: UploadFile = File(None),
    text_content: str = Form(None)
):
    if file:
        raw_content = await file.read()
    elif text_content:
        raw_content = text_content.encode("utf-8")
    else:
        raise HTTPException(status_code=400, detail="Provide a file or text content to verify.")

    computed_hash = crypto.compute_sha256(raw_content)
    is_valid = computed_hash.strip().lower() == expected_hash.strip().lower()

    return {
        "is_intact": is_valid,
        "computed_hash": computed_hash,
        "expected_hash": expected_hash,
        "verdict": "VERIFIED_AUTHENTIC_EVIDENCE" if is_valid else "SECURITY_ALERT_TAMPER_DETECTED"
    }