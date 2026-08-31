import sqlite3
import json

class OfflineEdgeQueue:
    def __init__(self, db_path: str = "edge_vault.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS pending_sync (
                    doc_id TEXT PRIMARY KEY,
                    case_number TEXT,
                    sha256_hash TEXT,
                    payload_json TEXT,
                    is_synced INTEGER DEFAULT 0
                )
            """)
            conn.commit()

    def buffer_record(self, doc_id: str, case_number: str, sha256_hash: str, payload: dict):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO pending_sync (doc_id, case_number, sha256_hash, payload_json, is_synced)
                VALUES (?, ?, ?, ?, 0)
            """, (doc_id, case_number, sha256_hash, json.dumps(payload)))
            conn.commit()

    def get_pending_syncs(self) -> list:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT doc_id, case_number, sha256_hash, payload_json FROM pending_sync WHERE is_synced = 0")
            rows = cursor.fetchall()
            return [{"doc_id": r[0], "case_number": r[1], "sha256_hash": r[2], "payload": json.loads(r[3])} for r in rows]

    def mark_synced(self, doc_id: str):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE pending_sync SET is_synced = 1 WHERE doc_id = ?", (doc_id,))
            conn.commit()