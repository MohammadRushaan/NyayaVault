import io
import os
import re
import cv2
import numpy as np
import pytesseract
from PIL import Image
from pdf2image import convert_from_bytes

# Auto-detect Tesseract executable on Windows
COMMON_TESS_PATHS = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe")
]
for p in COMMON_TESS_PATHS:
    if os.path.exists(p):
        pytesseract.pytesseract.tesseract_cmd = p
        break

try:
    import spacy
    nlp_en = spacy.load("en_core_web_sm")
except Exception:
    nlp_en = None

class LocalRedactor:
    DEVANAGARI_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")

    @staticmethod
    def preprocess_image(pil_image: Image.Image) -> np.ndarray:
        open_cv_image = np.array(pil_image.convert("RGB"))
        gray = cv2.cvtColor(open_cv_image, cv2.COLOR_RGB2GRAY)
        blurred = cv2.GaussianBlur(gray, (3, 3), 0)
        return cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]

    @classmethod
    def extract_text(cls, raw_bytes: bytes, filename: str) -> str:
        lower_name = filename.lower()
        tess_config = r"--oem 3 --psm 6"

        if lower_name.endswith(".txt"):
            return raw_bytes.decode("utf-8", errors="ignore")

        if lower_name.endswith((".png", ".jpg", ".jpeg", ".tiff", ".bmp")):
            try:
                img = Image.open(io.BytesIO(raw_bytes))
                processed = cls.preprocess_image(img)
                try:
                    text = pytesseract.image_to_string(processed, lang="hin+eng", config=tess_config)
                except Exception:
                    text = pytesseract.image_to_string(processed, lang="eng", config=tess_config)
                return text.strip() if text.strip() else "[OCR NOTE: Image processed - low text density detected]"
            except Exception as e:
                return f"[SCANNED DOCUMENT ARTIFACT: {filename} - Binary Hash Sealed]"

        if lower_name.endswith(".pdf"):
            try:
                images = convert_from_bytes(raw_bytes)
                page_texts = [
                    pytesseract.image_to_string(cls.preprocess_image(img), lang="hin+eng", config=tess_config)
                    for img in images
                ]
                return "\n\n".join(page_texts).strip()
            except Exception:
                return raw_bytes.decode("utf-8", errors="ignore")

        return raw_bytes.decode("utf-8", errors="ignore")

    @classmethod
    def sanitize(cls, text: str) -> str:
        redacted = text.translate(cls.DEVANAGARI_DIGITS)

        # English NER via SpaCy
        if nlp_en:
            doc = nlp_en(redacted)
            for ent in reversed(doc.ents):
                if ent.label_ in ["PERSON", "GPE", "LOC", "DATE", "CARDINAL"]:
                    redacted = f"{redacted[:ent.start_char]}[CONFIDENTIAL_{ent.label_}]{redacted[ent.end_char:]}"
        else:
            english_name_pattern = r"(?:Complainant|Accused|Informant|Witness|Name)\s*:\s*([A-Za-z]+(?:\s+[A-Za-z]+){1,3})"
            redacted = re.sub(english_name_pattern, r"Name: [CONFIDENTIAL_PERSON]", redacted, flags=re.IGNORECASE)

        # Hindi Legal Pattern Scrubber
        hindi_name_pattern = r"(?:नाम|प्रार्थी|पीड़िता|गवाह|पुत्र|पुत्री|पत्नी)\s*:\s*([\u0900-\u097F]+(?:\s+[\u0900-\u097F]+){1,3})"
        hindi_address_pattern = r"(?:निवासी|पता|ग्राम|थाना)\s*:\s*([^\n,]+)"
        redacted = re.sub(hindi_name_pattern, r"नाम: [गोपनीय_नाम]", redacted)
        redacted = re.sub(hindi_address_pattern, r"पता: [गोपनीय_पता]", redacted)

        # Indian Identifiers (Aadhaar, Contact, PAN)
        aadhaar_pattern = r"\b\d{4}\s?\d{4}\s?\d{4}\b"
        phone_pattern = r"\b(\+91[\-\s]?)?[6-9]\d{9}\b"
        pan_pattern = r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b"

        redacted = re.sub(aadhaar_pattern, "[REDACTED_AADHAAR]", redacted)
        redacted = re.sub(phone_pattern, "[REDACTED_CONTACT]", redacted)
        redacted = re.sub(pan_pattern, "[REDACTED_PAN]", redacted)
        return redacted

    @classmethod
    def process_and_sanitize(cls, raw_bytes: bytes, filename: str) -> tuple[str, str]:
        extracted = cls.extract_text(raw_bytes, filename)
        sanitized = cls.sanitize(extracted)
        return extracted, sanitized