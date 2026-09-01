import os
import hashlib
import json
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# Default 256-bit station master key if env var is not set
DEFAULT_KEK_HEX = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
MASTER_KEK_HEX = os.environ.get("STATION_MASTER_KEK", DEFAULT_KEK_HEX)
MASTER_KEK = bytes.fromhex(MASTER_KEK_HEX)

def compute_sha256(data: bytes) -> str:
    """Computes SHA-256 hash digest of raw bytes."""
    return hashlib.sha256(data).hexdigest()

def encrypt_document(raw_bytes: bytes) -> dict:
    """Envelope encryption: Generates ephemeral DEK, encrypts with AES-256-GCM, wraps DEK with KEK."""
    dek = AESGCM.generate_key(bit_length=256)
    aesgcm_dek = AESGCM(dek)
    nonce = os.urandom(12)
    ciphertext = aesgcm_dek.encrypt(nonce, raw_bytes, None)

    # Wrap DEK with Master KEK
    aesgcm_kek = AESGCM(MASTER_KEK)
    kek_nonce = os.urandom(12)
    wrapped_dek = aesgcm_kek.encrypt(kek_nonce, dek, None)

    return {
        "ciphertext": base64.b64encode(ciphertext).decode("utf-8"),
        "nonce": base64.b64encode(nonce).decode("utf-8"),
        "wrapped_dek": base64.b64encode(wrapped_dek).decode("utf-8"),
        "kek_nonce": base64.b64encode(kek_nonce).decode("utf-8"),
        "algorithm": "AES-256-GCM",
        "key_derivation": "NIST-SP-800-38D-Envelope"
    }

def decrypt_document(envelope: dict) -> bytes:
    """Unwraps DEK and decrypts payload."""
    wrapped_dek = base64.b64decode(envelope["wrapped_dek"])
    kek_nonce = base64.b64decode(envelope["kek_nonce"])
    ciphertext = base64.b64decode(envelope["ciphertext"])
    nonce = base64.b64decode(envelope["nonce"])

    aesgcm_kek = AESGCM(MASTER_KEK)
    dek = aesgcm_kek.decrypt(kek_nonce, wrapped_dek, None)

    aesgcm_dek = AESGCM(dek)
    return aesgcm_dek.decrypt(nonce, ciphertext, None)