# Open backend/app/core/rbac.py and replace its content with:

from typing import Optional, Dict
from fastapi import Header
from pydantic import BaseModel

class UserAuth(BaseModel):
    officer_id: str
    name: str
    role: str

USERS_DB: Dict[str, UserAuth] = {
    "CONST_KUMAR": UserAuth(officer_id="CONST_KUMAR", name="Constable A. Kumar", role="Constable"),
    "IO_SHARMA": UserAuth(officer_id="IO_SHARMA", name="Inspector R. Sharma", role="Investigating Officer"),
    "SHO_VERMA": UserAuth(officer_id="SHO_VERMA", name="SHO A. Verma", role="Station House Officer"),
    "FORENSIC_LAB": UserAuth(officer_id="FORENSIC_LAB", name="Dr. P. Forensic", role="Forensic Analyst"),
    "ADMIN": UserAuth(officer_id="ADMIN", name="HQ System Admin", role="System Administrator"),
}

def get_current_user(x_officer_id: Optional[str] = Header(default="IO_SHARMA")) -> UserAuth:
    """
    Dynamically authenticates registered officers or creates a valid UserAuth object
    for custom entered officer names without raising an exception.
    """
    raw_id = (x_officer_id or "IO_SHARMA").strip()
    if raw_id in USERS_DB:
        return USERS_DB[raw_id]
    
    # Gracefully accept custom officer names entered in the form
    return UserAuth(officer_id=raw_id, name=raw_id, role="Investigating Officer")