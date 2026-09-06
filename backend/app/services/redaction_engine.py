import re
from typing import Tuple, List, Dict, Any

# Compiled regex definitions
PATTERNS = [
    # 1. 12-digit Indian National ID (Aadhaar format: 12 digits, leading digit 2-9)
    ("AADHAAR", r"\b[2-9]\d{3}[\s\-]?\d{4}[\s\-]?\d{4}\b"),
    # 2. Contextual Indian ID fallback (Hindi Devanagari & English keywords)
    ("AADHAAR", r"(?<=(?:आधार(?:\s*संख्या)?|Aadhaar(?:\s*No)?)\s*[:\-]?\s*)[0-9 -]{12,16}\b"),
    # 3. Permanent Account Number (PAN)
    ("PAN", r"\b[A-Z]{5}[0-9]{4}[A-Z]\b"),
    # 4. Indian Mobile Numbers
    ("PHONE", r"(?:\+91[\-\s]?|0)?[6-9]\d{9}\b"),
    # 5. Email Addresses
    ("EMAIL", r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b"),
    # 6. Bilingual Identity Cues (Name / Complainant / Victim / Witness)
    ("IDENTITY", r"(?<=(?:complainant|victim|witness|नाम|पीड़िता|गवाह)[\s:]+)([^\s,\n]+(?:\s+[^\s,\n]+)?)")
]

def redact_pii(text: str) -> str:
    """
    Scans and masks demographic PII in English and Devanagari Hindi text.
    Complies with Section 72 BNS, 2023.
    """
    if not text:
        return ""

    scrubbed = text
    for pii_type, regex in PATTERNS:
        replacement = f"[REDACTED_{pii_type}]"
        scrubbed = re.sub(regex, replacement, scrubbed, flags=re.IGNORECASE)

    return scrubbed

def bilingual_redact_pii(text: str) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Identifies PII entities, records their values for audit trails,
    and returns the cleanly masked document text.
    """
    if not text:
        return "", []

    entities: List[Dict[str, Any]] = []
    
    # Collect all non-overlapping spans
    spans: List[Tuple[int, int, str, str]] = []

    for pii_type, regex in PATTERNS:
        for match in re.finditer(regex, text, flags=re.IGNORECASE):
            start, end = match.span()
            val = match.group()
            
            # Avoid overlapping previously matched regions
            if any(s <= start < e or s < end <= e for s, e, _, _ in spans):
                continue
                
            spans.append((start, end, pii_type, val))

    # Sort spans from end to start so index replacement remains accurate
    spans.sort(key=lambda x: x[0], reverse=True)

    masked_text = text
    for start, end, pii_type, val in spans:
        entities.append({"type": pii_type, "value": val})
        placeholder = f"[REDACTED_{pii_type}]"
        masked_text = masked_text[:start] + placeholder + masked_text[end:]

    # Reverse entities list so it matches reading order
    entities.reverse()
    
    return masked_text, entities