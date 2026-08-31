import io
import base64
import json
import qrcode

class MalkhanaQRService:
    @staticmethod
    def generate_evidence_tag(case_number: str, doc_id: str, sha256_hash: str, doc_type: str, actor_id: str) -> str:
        tag_payload = {
            "system": "NyayaVault-Malkhana",
            "case_no": case_number,
            "doc_id": doc_id,
            "hash": sha256_hash,
            "classification": doc_type,
            "custodian": actor_id
        }

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=8,
            border=2,
        )
        qr.add_data(json.dumps(tag_payload))
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")

        buffer = io.BytesIO()
        qr_img.save(buffer, format="PNG")
        b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{b64_str}"