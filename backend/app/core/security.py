import os
import json
import base64
import hashlib
from typing import Dict, Any
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

STORAGE_DIR = "vault_storage"
os.makedirs(STORAGE_DIR, exist_ok=True)

# Station Master Key Encryption Key (256-bit)
KEK_HEX = os.getenv("STATION_MASTER_KEK", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")
KEK_BYTES = bytes.fromhex(KEK_HEX)

def compute_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def encrypt_document(raw_bytes: bytes, doc_id: str) -> Dict[str, Any]:
    dek = AESGCM.generate_key(bit_length=256)
    nonce = os.urandom(12)
    ciphertext = AESGCM(dek).encrypt(nonce, raw_bytes, None)

    kek_nonce = os.urandom(12)
    wrapped_dek = AESGCM(KEK_BYTES).encrypt(kek_nonce, dek, None)

    envelope = {
        "doc_id": doc_id,
        "nonce_b64": base64.b64encode(nonce).decode("utf-8"),
        "wrapped_dek_b64": base64.b64encode(wrapped_dek).decode("utf-8"),
        "kek_nonce_b64": base64.b64encode(kek_nonce).decode("utf-8"),
        "ciphertext_b64": base64.b64encode(ciphertext).decode("utf-8")
    }

    out_path = os.path.join(STORAGE_DIR, f"{doc_id}.enc")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(envelope, f, indent=2)

    return {"path": out_path, "size_bytes": len(raw_bytes)}

def decrypt_document(doc_id: str) -> bytes:
    file_path = os.path.join(STORAGE_DIR, f"{doc_id}.enc")
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Ciphertext envelope {doc_id}.enc not found")

    with open(file_path, "r", encoding="utf-8") as f:
        envelope = json.load(f)

    nonce = base64.b64decode(envelope["nonce_b64"])
    wrapped_dek = base64.b64decode(envelope["wrapped_dek_b64"])
    kek_nonce = base64.b64decode(envelope["kek_nonce_b64"])
    ciphertext = base64.b64decode(envelope["ciphertext_b64"])

    dek = AESGCM(KEK_BYTES).decrypt(kek_nonce, wrapped_dek, None)
    return AESGCM(dek).decrypt(nonce, ciphertext, None)