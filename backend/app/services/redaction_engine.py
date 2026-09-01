import re
from typing import Tuple, List, Dict, Any


def bilingual_redact_pii(text: str) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Identifies and redacts Personally Identifiable Information (PII)
    in English and Hindi (Devanagari) under Section 72 BNS, 2023.
    """
    if not text:
        return "", []

    masked = text
    entities = []

    # 1. Aadhaar Number Pattern (12 digits with optional spaces/hyphens)
    for match in re.finditer(r"\b[2-9]\d{3}[\s\-]?\d{4}[\s\-]?\d{4}\b", masked):
        val = match.group()
        entities.append({"type": "AADHAAR", "value": val})
        masked = masked.replace(val, "[REDACTED_AADHAAR]")

    # 2. Indian Mobile Numbers (+91, 0, or standard 10 digits starting with 6-9)
    for match in re.finditer(r"(?:\+91[\-\s]?|0)?[6-9]\d{9}\b", masked):
        val = match.group()
        entities.append({"type": "PHONE", "value": val})
        masked = masked.replace(val, "[REDACTED_PHONE]")

    # 3. PAN Identifiers ([A-Z]{5}[0-9]{4}[A-Z]{1})
    for match in re.finditer(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b", masked):
        val = match.group()
        entities.append({"type": "PAN", "value": val})
        masked = masked.replace(val, "[REDACTED_PAN]")

    # 4. Bilingual Identity Scrubbing (Complainant, Victim, Witness, Hindi cues)
    name_pattern = r"(?:complainant|victim|witness|नाम|पीड़िता|गवाह)[\s:]+([^\s,]+(?:\s+[^\s,]+)?)"
    for match in re.finditer(name_pattern, masked, re.IGNORECASE):
        val = match.group(1)
        if val and not val.startswith("[REDACTED"):
            entities.append({"type": "IDENTITY", "value": val})
            masked = masked.replace(val, "[REDACTED_IDENTITY]")

    return masked, entities