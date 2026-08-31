# NyayaVault (न्यायवॉल्ट)

**Zero-Trust Police Evidence Ingestion, Bilingual PII Sanitization & Section 65B BSA Cryptographic Custody Ledger**

NyayaVault bridges the gap between physical police property rooms (*Malkhanas*) and electronic judicial registries. It digitizes physical evidence records, scrubs sensitive personal identifiers in Hindi and English, seals raw artifacts using zero-trust envelope encryption (AES-256-GCM), and maintains an immutable cryptographic custody chain compliant with **Section 65B of the Bharatiya Sakshya Adhiniyam (BSA), 2023** and **Section 173 of the Bharatiya Nagarik Suraksha Sanhita (BNSS)**.

---

## Key Features

* **Client-Side Document Scanner & Homography Warping**: Direct webcam acquisition with multi-frame temporal damping, interactive corner alignment, and native Canvas perspective flattening.
* **On-Premise Privacy & PII Scrubbing**: Strips Indian demographic identifiers (Aadhaar, PAN, contact numbers) and complainant identities across both Devanagari and English text under Section 72 BNS guidelines.
* **Zero-Trust Envelope Encryption (AES-256-GCM)**: Every record generates a single-use ephemeral Data Encryption Key (DEK) wrapped by a Master Key Encryption Key (KEK). Ciphertext is written to physical `.enc` envelopes.
* **Automated Section 65B BSA Certification**: Generates electronic admissibility certificates bearing device timestamps, station metadata, officer belt numbers, and SHA-384 digital signatures.
* **Physical-Digital Malkhana Bridge**: High-density QR generation binding physical property tags directly to on-chain SHA-256 genesis hashes.
* **Courtroom Tamper & Dual-Artifact Verifier**: Side-by-side visual comparison and bit-level mathematical integrity verification distinguishing authentic evidence copies from tampered records.

---

## System Architecture

```
                       ┌──────────────────────────────────────────────┐
                       │          EVIDENCE INGESTION STAGE            │
                       │    (Camera / Scanned Photo / Raw Text)       │
                       └──────────────────────┬───────────────────────┘
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     ▼                                                 ▼
        [ Bilingual PII Scrubber ]                         [ Cryptographic Engine ]
   • Aadhaar / PAN / Phone Stripping                  • SHA-256 Fingerprint Generation
   • English & Devanagari Name Redaction              • AES-256-GCM Envelope Encryption
                     │                                                 │
                     └────────────────────────┬────────────────────────┘
                                              ▼
                       ┌──────────────────────────────────────────────┐
                       │            IMMUTABLE BLOCK LEDGER            │
                       │   Block = SHA-256(Idx + DocID + Hash + Prev) │
                       └──────────────────────┬───────────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         [ Malkhana QR Seal Tag ]                        [ Section 65B BSA Cert ]
     • Encodes Case ID & Genesis Hash                • Generates Digital Signature
     • Fast Scan Physical Evidence Bridge            • Legal Evidentiary Admissibility
                                              │
                                              ▼
                       ┌──────────────────────────────────────────────┐
                       │          COURTROOM VERIFIER TERMINAL         │
                       │  • Side-by-Side Visual Genesis Comparator    │
                       │  • Bit-Level SHA-256 Integrity Validation    │
                       │  • Real-Time Tamper Simulation Detection     │
                       └──────────────────────────────────────────────┘

```

---

## Tech Stack

* **Backend**: FastAPI (Python 3.11), Uvicorn, SQLite (`edge_vault.db`), SpaCy, OpenCV (`cv2`), PyTesseract, Cryptography (AES-GCM / SHA-256).
* **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Axios.
* **Deployment**: Docker, Docker Compose.

---

## Directory Structure

```
nyayavault/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   └── security.py           # Zero-trust AES-256 envelope crypto
│   │   ├── services/
│   │   │   ├── bsa_certificate.py    # Section 65B BSA certificate generator
│   │   │   ├── malkhana_service.py   # Physical property QR generation
│   │   │   └── redaction_engine.py   # Bilingual Hindi/English PII scrubbing
│   │   └── main.py                   # FastAPI ingestion, verify & ledger APIs
│   ├── vault_storage/                # Persisted physical .enc ciphertext envelopes
│   ├── edge_vault.db                 # Local SQLite Merkle chain ledger
│   ├── Dockerfile                    # Container definition with Tesseract OCR
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DocumentCameraScanner.jsx
│   │   │   └── MalkhanaScanner.jsx
│   │   ├── utils/
│   │   │   └── opencvScanner.js      # Homography & perspective warping engine
│   │   ├── App.jsx                   # Primary UI with Ingestion, Ledger & Court Verifier
│   │   └── main.jsx
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── .gitignore
└── README.md

```

---

## Quickstart (Docker Compose)

The simplest way to run NyayaVault with all OCR dependencies and system packages:

```bash
# 1. Clone repository
git clone https://github.com/<YOUR_USERNAME>/nyayavault.git
cd nyayavault

# 2. Build and launch containers
docker-compose up --build

```

* **Frontend Dashboard**: `http://localhost:5173`
* **Backend OpenAPI Docs**: `http://localhost:8000/docs`

---

## Manual Local Setup

### 1. Prerequisites

* Python 3.10+
* Node.js 18+
* Tesseract-OCR (optional for image OCR; text ingestion works natively)

### 2. Backend Setup

```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\Activate.ps1
# Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn app.main:app --reload --port 8000

```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev

```

Open `http://localhost:5173` in your browser.

---

## API Reference

### 1. Ingest Evidence Record

`POST /api/documents/ingest`

* **Content-Type**: `multipart/form-data`
* **Parameters**:
* `case_number` (string): e.g., `FIR-2026-DEL-0891`
* `doc_type` (string): e.g., `First Information Report (FIR)`
* `officer_id` (string): e.g., `IO_OFFICER_4401`
* `actor_role` (string): e.g., `Investigating Officer`
* `file` (binary, optional): Scanned image or PDF
* `text_content` (string, optional): Direct bilingual text body



### 2. Verify Cryptographic Integrity

`POST /api/documents/verify`

* **Content-Type**: `multipart/form-data`
* **Parameters**:
* `expected_hash` (string): 64-character genesis benchmark hash
* `file` (binary, optional): Physical file under inspection
* `text_content` (string, optional): Text content under inspection



### 3. Retrieve Audit Ledger

`GET /api/ledger/history`

* Returns chronological array of all committed blocks, hash chains, and Section 65B certificates.

---

## License

Distributed under the Apache 2.0 License. See `LICENSE` for details.

---