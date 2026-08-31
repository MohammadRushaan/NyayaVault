import time
import hashlib

class BSACertificateService:
    @staticmethod
    def generate(case_no: str, doc_id: str, sha256_hash: str, officer_id: str, role: str) -> dict:
        timestamp = int(time.time())
        payload = f"{case_no}|{doc_id}|{sha256_hash}|{officer_id}|{timestamp}"
        signature = hashlib.sha384(payload.encode()).hexdigest()

        return {
            "statute": "Section 65B Bharatiya Sakshya Adhiniyam (BSA), 2023",
            "certification_statement": "Certified that this electronic record was produced by an automated system operating under lawful control without unauthorized tampering or system failure.",
            "case_number": case_no,
            "document_id": doc_id,
            "evidentiary_hash": sha256_hash,
            "certifying_officer": f"{officer_id} ({role})",
            "timestamp": timestamp,
            "digital_signature": signature
        }