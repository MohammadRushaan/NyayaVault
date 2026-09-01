def auto_classify_document(text: str, filename: str = "") -> str:
    t = (text + " " + filename).lower()
    if any(k in t for k in ["fir", "first information", "prathmik soochana", "police station"]):
        return "First Information Report (FIR)"
    elif any(k in t for k in ["witness", "statement", "161", "bayan"]):
        return "Witness Statement"
    elif any(k in t for k in ["charge sheet", "chargesheet", "final report", "173"]):
        return "Charge Sheet"
    elif any(k in t for k in ["forensic", "fsl", "chemical", "dna", "ballistics"]):
        return "Forensic Report"
    elif any(k in t for k in ["seizure", "panchnama", "malkhana", "recovered"]):
        return "Malkhana Seizure Memo"
    elif any(k in t for k in ["court", "bail", "remand", "magistrate", "order sheet"]):
        return "Court Filing"
    return "Investigation Document (General)"

def inspect_suspicious_activity(role: str, action: str, doc_type: str) -> dict:
    is_suspicious = False
    reasons = []

    if role == "Constable" and action in ["DECRYPT_BULK", "DELETE"]:
        is_suspicious = True
        reasons.append("Constable role attempted unauthorized administrative action")

    if "Forensic" in doc_type and role not in ["Forensic Officer", "SHO/Senior Officer", "Administrator"]:
        if action in ["OVERWRITE", "TAMPER_SIMULATION"]:
            is_suspicious = True
            reasons.append("Non-forensic personnel attempting to modify sealed Forensic Report")

    return {
        "is_suspicious": is_suspicious,
        "severity": "CRITICAL" if is_suspicious else "NORMAL",
        "reasons": reasons
    }