import os
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

class ZeroTrustCrypto:
    def __init__(self, master_kek_hex: str):
        self.master_kek = bytes.fromhex(master_kek_hex)
        self.master_cipher = AESGCM(self.master_kek)

    @staticmethod
    def compute_sha256(data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()

    def envelope_encrypt(self, raw_bytes: bytes) -> dict:
        dek = AESGCM.generate_key(bit_length=256)
        dek_cipher = AESGCM(dek)

        payload_nonce = os.urandom(12)
        encrypted_payload = dek_cipher.encrypt(payload_nonce, raw_bytes, None)

        kek_nonce = os.urandom(12)
        encrypted_dek = self.master_cipher.encrypt(kek_nonce, dek, None)

        return {
            "payload_nonce": payload_nonce.hex(),
            "ciphertext": encrypted_payload.hex(),
            "encrypted_dek": encrypted_dek.hex(),
            "kek_nonce": kek_nonce.hex(),
            "sha256_hash": self.compute_sha256(raw_bytes)
        }

    def envelope_decrypt(self, envelope: dict) -> bytes:
        dek = self.master_cipher.decrypt(
            bytes.fromhex(envelope["kek_nonce"]),
            bytes.fromhex(envelope["encrypted_dek"]),
            None
        )
        dek_cipher = AESGCM(dek)
        return dek_cipher.decrypt(
            bytes.fromhex(envelope["payload_nonce"]),
            bytes.fromhex(envelope["ciphertext"]),
            None
        )