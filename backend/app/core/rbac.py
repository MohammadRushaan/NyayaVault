import os
import hashlib
import hmac
from typing import Optional, List
from fastapi import Depends, HTTPException, status, Header
from pydantic import BaseModel

class Role:
    CONSTABLE = "Constable"
    INVESTIGATING_OFFICER = "Investigating Officer"
    SHO = "SHO/Senior Officer"
    FORENSIC_OFFICER = "Forensic Officer"
    ADMINISTRATOR = "Administrator"

class UserAuth(BaseModel):
    officer_id: str
    name: str
    role: str
    badge_number: str

def hash_secret(secret: str) -> str:
    salt = b"nyayavault_native_salt_2026"
    return hashlib.pbkdf2_hmac("sha256", secret.encode("utf-8"), salt, 100000).hex()

DEMO_USERS = {
    "IO_SHARMA": {
        "officer_id": "IO_SHARMA",
        "name": "Inspector R. K. Sharma",
        "password_hash": hash_secret("police@123"),
        "role": Role.INVESTIGATING_OFFICER,
        "badge_number": "DL-4401"
    },
    "SHO_VERMA": {
        "officer_id": "SHO_VERMA",
        "name": "SHO Vikram Verma",
        "password_hash": hash_secret("sho@123"),
        "role": Role.SHO,
        "badge_number": "DL-0012"
    },
    "FORENSIC_LAB": {
        "officer_id": "FORENSIC_LAB",
        "name": "Dr. Ananya Roy",
        "password_hash": hash_secret("lab@123"),
        "role": Role.FORENSIC_OFFICER,
        "badge_number": "FSL-991"
    },
    "CONST_SINGH": {
        "officer_id": "CONST_SINGH",
        "name": "Constable M. Singh",
        "password_hash": hash_secret("const@123"),
        "role": Role.CONSTABLE,
        "badge_number": "DL-9082"
    },
    "ADMIN": {
        "officer_id": "ADMIN",
        "name": "System Administrator",
        "password_hash": hash_secret("admin@123"),
        "role": Role.ADMINISTRATOR,
        "badge_number": "ADM-001"
    }
}

async def get_current_user(x_officer_id: Optional[str] = Header("IO_SHARMA")) -> UserAuth:
    if not x_officer_id or x_officer_id not in DEMO_USERS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Officer ID. Available: {list(DEMO_USERS.keys())}"
        )
    u = DEMO_USERS[x_officer_id]
    return UserAuth(
        officer_id=u["officer_id"],
        name=u["name"],
        role=u["role"],
        badge_number=u["badge_number"]
    )

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: UserAuth = Depends(get_current_user)):
        if current_user.role not in allowed_roles and current_user.role != Role.ADMINISTRATOR:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden for role '{current_user.role}'. Required: {allowed_roles}"
            )
        return current_user
    return role_checker