import os
import random
from faker import Faker

fake = Faker("en_IN")

POLICE_STATIONS = [
    ("Cyber Crime Cell", "Central District, New Delhi"),
    ("Kotwali Police Station", "Agra, Uttar Pradesh"),
    ("Mahila Police Station", "Bhopal, Madhya Pradesh"),
    ("Sector 17 Cyber Unit", "Chandigarh"),
]

BNS_OFFENSES = [
    ("Section 303(2) BNS", "Theft of encrypted computer hardware"),
    ("Section 66 IT Act", "Unauthorized access & electronic database intrusion"),
    ("Section 318(4) BNS", "Cheating and dishonestly inducing delivery of property"),
    ("Section 336(3) BNS", "Forgery of electronic record for legal proceedings"),
]

def generate_synthetic_fir(case_idx: int) -> tuple[str, str]:
    ps_name, district = random.choice(POLICE_STATIONS)
    section, offense = random.choice(BNS_OFFENSES)
    case_no = f"FIR-2026-{case_idx:04d}"

    content = f"""FIRST INFORMATION REPORT
(Under Section 154 Cr.P.C / Section 173 BNSS)
1. District: {district} | Police Station: {ps_name} | Year: 2026
2. FIR Number: {case_no} | Date: {fake.date_this_year()} {fake.time()}
3. Acts & Sections: {section} - {offense}
4. Complainant / Informant:
   - Name: {fake.name()}
   - Contact: +91 {random.randint(6000000000, 9999999999)}
   - Aadhaar Number: {random.randint(1000, 9999)} {random.randint(1000, 9999)} {random.randint(1000, 9999)}
   - Address: {fake.address().replace(chr(10), ', ')}
5. Accused Details: Unknown Threat Actors (Logged IP session)
6. Investigation Narrative:
   {fake.paragraph(nb_sentences=4)}
7. Seized Evidentiary Artifact:
   1x Encrypted Storage Drive (S/N: {fake.bothify(text='WD-####-????').upper()})
8. Investigating Officer: Sub-Inspector {fake.name()} (Belt No: IO-{random.randint(1000, 9999)})
"""
    return case_no, content

def run_generation(count: int = 15):
    out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../demo_data/synthetic"))
    os.makedirs(out_dir, exist_ok=True)
    for i in range(1, count + 1):
        case_no, doc_body = generate_synthetic_fir(i)
        with open(os.path.join(out_dir, f"{case_no}.txt"), "w", encoding="utf-8") as f:
            f.write(doc_body)
    print(f"[OK] Generated {count} synthetic FIR records in {out_dir}")

if __name__ == "__main__":
    run_generation()
    