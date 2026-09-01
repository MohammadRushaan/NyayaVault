import os
from typing import Optional, List, Dict
from fastapi import Header, HTTPException, status
from pydantic import BaseModel

# 1. Official Police Role Hierarchy (Higher number = higher authority)
ROLE_HIERARCHY: Dict[str, int] = {
    "Constable": 1,
    "Investigating Officer": 2,
    "Forensic Analyst": 3,
    "Station House Officer": 3,
    "Administrator": 4,
}

# 2. Granular Permissions Mapping
ROLE_PERMISSIONS: Dict[str, List[str]] = {
    "Constable": [
        "document:view_public",
        "custody:view_timeline"
    ],
    "Investigating Officer": [
        "document:view_public",
        "document:ingest",
        "document:verify",
        "custody:view_timeline",
        "custody:handover",
        "certificate:generate_bsa"
    ],
    "Forensic Analyst": [
        "document:view_public",
        "document:ingest",
        "document:verify",
        "custody:view_timeline",
        "custody:handover",
        "forensic:analyze"
    ],
    "Station House Officer": [
        "document:view_public",
        "document:ingest",
        "document:verify",
        "custody:view_timeline",
        "custody:handover",
        "certificate:generate_bsa",
        "dashboard:view_metrics",
        "alerts:view_tamper"
    ],
    "Administrator": [
        "document:view_public",
        "document:ingest",
        "document:verify",
        "custody:view_timeline",
        "custody:handover",
        "certificate:generate_bsa",
        "dashboard:view_metrics",
        "alerts:view_tamper",
        "system:backup",
        "system:reset_vault"
    ]
}

# 3. User & Authentication Schemas
class UserAuth(BaseModel):
    officer_id: str
    name: str
    role: str
    badge_number: Optional[str] = None
    station: Optional[str] = "Cyber Crime Cell, New Delhi"

# 4. Standard Authorized Police User Directory
MOCK_USERS: Dict[str, UserAuth] = {
    "CONST_KUMAR": UserAuth(
        officer_id="CONST_KUMAR",
        name="Constable A. Kumar",
        role="Constable",
        badge_number="DL-C-4091"
    ),
    "IO_SHARMA": UserAuth(
        officer_id="IO_SHARMA",
        name="Inspector R. Sharma",
        role="Investigating Officer",
        badge_number="DL-IO-2819"
    ),
    "SHO_VERMA": UserAuth(
        officer_id="SHO_VERMA",
        name="SHO A. Verma",
        role="Station House Officer",
        badge_number="DL-SHO-0112"
    ),
    "FORENSIC_LAB": UserAuth(
        officer_id="FORENSIC_LAB",
        name="Dr. P. Forensic",
        role="Forensic Analyst",
        badge_number="FSL-ND-8821"
    ),
    "ADMIN": UserAuth(
        officer_id="ADMIN",
        name="HQ System Admin",
        role="Administrator",
        badge_number="HQ-ADM-0001"
    )
}

# 5. Dependency: Extract and Validate Current Officer from Header
async def get_current_user(x_officer_id: Optional[str] = Header("IO_SHARMA")) -> UserAuth:
    """
    Extracts officer identity from X-Officer-Id header.
    Falls back gracefully if an ad-hoc valid officer ID is supplied.
    """
    if not x_officer_id:
        return MOCK_USERS["IO_SHARMA"]

    clean_id = x_officer_id.strip()
    if clean_id in MOCK_USERS:
        return MOCK_USERS[clean_id]

    # Dynamic fallback for custom demo officers
    return UserAuth(
        officer_id=clean_id,
        name=f"Officer {clean_id}",
        role="Investigating Officer",
        badge_number=f"DL-{clean_id[:6]}"
    )

# 6. Role Authorization Helpers
def require_min_role(min_role: str):
    """Dependency factory ensuring officer meets minimum required role hierarchy tier."""
    min_tier = ROLE_HIERARCHY.get(min_role, 1)

    async def role_checker(user: UserAuth = Depends(get_current_user)) -> UserAuth:
        user_tier = ROLE_HIERARCHY.get(user.role, 1)
        if user_tier < min_tier:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Requires minimum role '{min_role}'. Your role is '{user.role}'."
            )
        return user

    return role_checker

def require_permission(permission: str):
    """Dependency factory ensuring officer has a specific granular capability."""
    async def permission_checker(user: UserAuth = Depends(get_current_user)) -> UserAuth:
        allowed = ROLE_PERMISSIONS.get(user.role, [])
        if permission not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Role '{user.role}' lacks permission '{permission}'."
            )
        return user

    return permission_checker