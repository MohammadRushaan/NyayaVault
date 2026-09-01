import io
import base64
import qrcode

def generate_malkhana_qr(case_number: str, doc_id: str, sha256_digest: str) -> str:
    """Generates a high-density QR code for physical Malkhana bags encoded in Base64."""
    payload = f"NYAYAVAULT|{case_number}|{doc_id}|{sha256_digest[:16]}"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(payload)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")