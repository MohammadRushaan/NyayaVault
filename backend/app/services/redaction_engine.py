import re
from typing import Tuple, List, Dict, Any

def redact_pii(text: str) -> str:
    """
    Bilingual (Hindi / Devanagari & English) PII Redaction Engine.
    Complies with BNS 2023 § 72 by scrubbing sensitive victim identifiers.
    Avoids lookbehind assertions to ensure full compatibility with Python re.
    """
    if not text:
        return ""

    scrubbed = text

    # 1. 12-digit Indian Identification Card pattern (with optional spaces/hyphens)
    scrubbed = re.sub(r'\b[2-9]\d{3}[\s\-]?\d{4}[\s\-]?\d{4}\b', '[REDACTED_AADHAAR]', scrubbed)

    # Contextual anchor pattern (preserves anchor label, redacts value)
    scrubbed = re.sub(
        r'((?:आधार(?:\s*संख्या)?|Aadhaar(?:\s*No)?)\s*[:\-]?\s*)([0-9\s\-]{12,16}\b)',
        r'\g<1>[REDACTED_AADHAAR]',
        scrubbed,
        flags=re.IGNORECASE
    )

    # 2. Permanent Account Number (PAN) Card (5 letters, 4 digits, 1 letter)
    scrubbed = re.sub(r'\b[A-Z]{5}[0-9]{4}[A-Z]\b', '[REDACTED_PAN]', scrubbed)

    # 3. Mobile / Contact Numbers (Indian 10-digit mobile formats)
    scrubbed = re.sub(r'(?:\+91[\-\s]?|0)?[6-9]\d{9}\b', '[REDACTED_PHONE]', scrubbed)

    # 4. Email Addresses
    scrubbed = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b', '[REDACTED_EMAIL]', scrubbed)

    # 5. Bilingual Identity Scrubbing (Name / Complainant / Victim / Witness cues)
    scrubbed = re.sub(
        r'((?:complainant|victim|witness|नाम|पीड़िता|गवाह)\s*[:\-]?\s*)([^\s,\n\(\)]+(?:\s+[^\s,\n\(\)]+)?)',
        r'\g<1>[REDACTED_IDENTITY]',
        scrubbed,
        flags=re.IGNORECASE
    )

    return scrubbed

def bilingual_redact_pii(text: str) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Audited redaction returning masked text along with captured metadata entities.
    """
    if not text:
        return "", []

    entities: List[Dict[str, Any]] = []

    # Aadhaar format detection
    for match in re.finditer(r'\b[2-9]\d{3}[\s\-]?\d{4}[\s\-]?\d{4}\b', text):
        entities.append({"type": "AADHAAR", "value": match.group()})

    # PAN detection
    for match in re.finditer(r'\b[A-Z]{5}[0-9]{4}[A-Z]\b', text):
        entities.append({"type": "PAN", "value": match.group()})

    # Phone detection
    for match in re.finditer(r'(?:\+91[\-\s]?|0)?[6-9]\d{9}\b', text):
        entities.append({"type": "PHONE", "value": match.group()})

    masked_text = redact_pii(text)
    return masked_text, entities