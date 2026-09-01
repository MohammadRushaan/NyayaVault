import os
import tarfile
import hashlib
from datetime import datetime

BACKUP_DIR = "backups"
os.makedirs(BACKUP_DIR, exist_ok=True)

def create_system_backup() -> dict:
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    out_file = os.path.join(BACKUP_DIR, f"nyayavault_backup_{ts}.tar.gz")

    with tarfile.open(out_file, "w:gz") as tar:
        if os.path.exists("vault_storage"):
            tar.add("vault_storage", arcname="vault_storage")
        if os.path.exists("edge_vault.db"):
            tar.add("edge_vault.db", arcname="edge_vault.db")

    hasher = hashlib.sha256()
    with open(out_file, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)

    return {
        "status": "BACKUP_COMPLETED",
        "backup_file": out_file,
        "sha256_hash": hasher.hexdigest(),
        "timestamp": ts,
        "size_bytes": os.path.getsize(out_file)
    }

def verify_and_restore_backup(backup_file: str, expected_hash: str) -> dict:
    if not os.path.exists(backup_file):
        return {"status": "FAILED", "reason": "Archive not found"}

    hasher = hashlib.sha256()
    with open(backup_file, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)

    if hasher.hexdigest() != expected_hash:
        return {"status": "TAMPER_DETECTED", "reason": "Backup hash mismatch"}

    with tarfile.open(backup_file, "r:gz") as tar:
        tar.extractall(path=".")

    return {"status": "RESTORED", "verified_hash": hasher.hexdigest()}