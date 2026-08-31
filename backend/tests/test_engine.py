import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import ZeroTrustCrypto
from app.services.redaction_engine import LocalRedactor
from app.services.malkhana_service import MalkhanaQRService

@pytest.fixture
def crypto_instance():
    return ZeroTrustCrypto("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")

def test_aes_envelope_encryption_cycle(crypto_instance):
    secret_bytes = b"Digital Forensic Analysis: Hard Drive Partition S/N 4409-XY"
    envelope = crypto_instance.envelope_encrypt(secret_bytes)
    decrypted = crypto_instance.envelope_decrypt(envelope)
    assert decrypted == secret_bytes
    assert envelope["sha256_hash"] == crypto_instance.compute_sha256(secret_bytes)

def test_hindi_and_english_redaction():
    text = "Complainant: Rajesh Sharma, Aadhaar: 1234 5678 9012. प्रार्थी: अमित कुमार, पता: आगरा।"
    sanitized = LocalRedactor.sanitize(text)
    assert "1234 5678 9012" not in sanitized
    assert "अमित कुमार" not in sanitized
    assert "[REDACTED_AADHAAR]" in sanitized
    assert "[गोपनीय_नाम]" in sanitized

def test_malkhana_qr_generation():
    qr_uri = MalkhanaQRService.generate_evidence_tag(
        case_number="FIR-2026-DEL-0891",
        doc_id="test-uuid-1234",
        sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        doc_type="FIR",
        actor_id="IO_OFFICER_4401"
    )
    assert qr_uri.startswith("data:image/png;base64,")

@pytest.mark.asyncio
async def test_full_pipeline_verification():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        valid_bytes = b"FIR Content. Accused Unknown. Date: 30-08-2026."
        response = await client.post(
            "/api/documents/ingest",
            data={
                "case_number": "FIR-2026-DEL-0891",
                "doc_type": "FIR",
                "officer_id": "IO_4401",
                "actor_role": "Investigating Officer"
            },
            files={"file": ("fir.txt", valid_bytes, "text/plain")}
        )
        assert response.status_code == 200
        doc_hash = response.json()["sha256_hash"]

        verify_valid = await client.post(
            "/api/documents/verify",
            data={"expected_hash": doc_hash},
            files={"file": ("fir.txt", valid_bytes, "text/plain")}
        )
        assert verify_valid.json()["is_intact"] is True

        tampered_bytes = b"FIR Content. Accused Altered. Date: 30-08-2026."
        verify_tampered = await client.post(
            "/api/documents/verify",
            data={"expected_hash": doc_hash},
            files={"file": ("fir_fake.txt", tampered_bytes, "text/plain")}
        )
        assert verify_tampered.json()["is_intact"] is False