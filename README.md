# NyayaVault 🏛️🔒

> **Zero-Trust Evidence Management ERP & Cryptographic Chain of Custody**  
> *Statutory Compliance under Section 63 Bharatiya Sakshya Adhiniyam (BSA), 2023 & Section 72 Bharatiya Nyaya Sanhita (BNS), 2023.*

---

## 📌 Overview

**NyayaVault** is an enterprise-grade digital and physical evidence management ecosystem designed for law enforcement, forensic laboratories, and the judiciary. It bridges physical police property rooms (*Malkhanas*) with an immutable Merkle ledger, ensuring end-to-end auditability, privacy protection, and legally admissible electronic evidence certificates.

---

## ⚡ Key Features

* **Edge-Vision Ingestion (OpenCV.js WebAssembly):** In-browser 4-point contour detection, homography, and perspective deskewing for paper documents without heavy video streaming bandwidth.
* **Bilingual PII Redaction (Sec 72 BNS):** Automated regex and NER pipeline scrubbing Aadhaar, PAN, phone numbers, and demographic data in English and Hindi (Devanagari).
* **NIST SP 800-38D Envelope Encryption:** Single-use ephemeral 256-bit Data Encryption Keys (DEKs) wrapped by a Station Master Key (KEK) using authenticated **AES-256-GCM**.
* **Sequential Merkle Chain:** Cryptographic hash linking ensuring any database modification breaks downstream block integrity.
* **Physical-to-Digital Malkhana QR Bridge:** High-density Base64 QR tags affixed to physical property bags linking directly to on-chain ledger entries.
* **Dual-Channel Courtroom Verification:**
  * **Method 1 (Physical):** Server-side OpenCV QR decoding for rapid property room check-ins.
  * **Method 2 (Digital File):** Real-time SHA-256 binary hash recalculation with automated fraud/tamper alerting.
* **1-Click Section 63 BSA Certificate:** Generates self-authenticating electronic record admissibility reports containing cryptographic hash values and officer audit trails.
* **5-Tier Role-Based Access Control (RBAC):** Strict operational hierarchy across `Constable`, `Investigating Officer`, `Forensic Analyst`, `Station House Officer`, and `Administrator`.

---

## 🏗️ Architecture

```
[ Physical Evidence / Document ]
               │
               ▼
   [ 1. Edge-Vision Ingestion ]
   (Browser-side 4-point homography & OCR)
               │
               ▼
  [ 2. PII Sanitization & Hash Seal ]
  (Sec 72 BNS redaction + SHA-256 genesis fingerprint)
               │
       ┌───────┴───────────────────────────────┐
       ▼                                       ▼
[ Envelope Encryption ]               [ Sequential Merkle Ledger ]
(AES-256-GCM to disk as .enc)          (Cryptographic audit row in SQLite/Postgres)
       │                                       │
       ▼                                       ▼
[ Physical Malkhana QR Tag ]          [ Chain-of-Custody Logging ]
(Affixed to evidence locker bag)       (Malkhana ➔ IO ➔ FSL ➔ Magistrate)
                                               │
                                               ▼
                              [ 3. Courtroom Dual-Verification ]
                              ├─ Method 1: Scan Malkhana QR (Physical check)
                              └─ Method 2: Raw Binary Hash Match (Digital check)
                                               │
                                               ▼
                              [ 4. Section 63 BSA Certificate ]
                              (Statutory judicial admissibility package)
```

---

## 🚀 Tech Stack

* **Frontend:** React 18 (Vite), Tailwind CSS, OpenCV.js (WebAssembly), Lucide Icons
* **Backend:** FastAPI (Python 3.12), Uvicorn, PyCryptodome / Cryptography
* **Database & Storage:** SQLite (`edge_vault.db`), AES-256-GCM sealed JSON containers (`vault_storage/`)
* **Deployment:** Vercel (Frontend), Render (Backend API)

---

## 🛠️ Local Development Setup

### Prerequisites
* Python 3.11 or 3.12
* Node.js v18+ or v20+ with npm
* Git

---

### 1. Clone the Repository
```bash
git clone [https://github.com/MohammadRushaan/NyayaVault.git](https://github.com/MohammadRushaan/NyayaVault.git)
cd NyayaVault
```

---

### 2. Backend Setup (FastAPI)

```bash
cd backend

# Create and activate virtual environment
# Windows (PowerShell):
python -m venv venv
.\venv\Scripts\Activate.ps1

# macOS / Linux (Bash):
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
* **API Root:** `http://127.0.0.1:8000`
* **Swagger Docs:** `http://127.0.0.1:8000/docs`

---

### 3. Frontend Setup (React + Vite)

Open a new terminal tab:

```bash
cd frontend

# Install packages
npm install

# Start Vite dev server
npm run dev
```
* **Frontend Application:** `http://localhost:5173`

---

## 🔒 Security & Cryptographic Invariants

* **Genesis Hash:** $\text{SHA-256}(\text{Raw Payload})$ computed before any view-layer redactions.
* **Envelope Encryption:** Ciphertext generated via $\text{AES-256-GCM}(\text{DEK}, \text{Nonce}, \text{Payload})$. DEK stored wrapped as $\text{AES-256-GCM}(\text{KEK}, \text{KEK-Nonce}, \text{DEK})$.
* **Merkle Block Hash:**
  $$\text{Block Hash}_n = \text{SHA-256}(\text{Doc ID} + \text{Case No} + \text{Digest}_n + \text{Block Hash}_{n-1})$$

---

## 📄 License & Attribution
Developed for the National Legal Tech & Law Enforcement Modernization Track. Built in compliance with Bharatiya Sakshya Adhiniyam, 2023 and Bharatiya Nyaya Sanhita, 2023.