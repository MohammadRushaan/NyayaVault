import io
import base64
import qrcode


def generate_malkhana_qr(payload: str) -> str:
    """
    Generates a Base64-encoded PNG QR code string for physical evidence bag labeling.
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=2,
    )
    qr.add_data(payload)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    
    return base64.b64encode(buf.getvalue()).decode("utf-8")