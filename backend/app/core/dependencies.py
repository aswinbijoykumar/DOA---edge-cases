from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database.database import get_db
from app.database.models import User
from app.core.rbac import assert_entity_write_access

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    return user

def require_roles(allowed_roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        # Keep backward compatibility: legacy "ADMIN" role has full admin rights.
        # Strict RBAC separation: SYSTEM_ADMINISTRATOR does NOT inherit DOA_ADMINISTRATOR or ADMIN!
        effective_roles = [current_user.role]
        if current_user.persona_type:
            effective_roles.append(current_user.persona_type)
        if current_user.role == "ADMIN":
            effective_roles.extend(["SYSTEM_ADMINISTRATOR", "DOA_ADMINISTRATOR", "GOVERNANCE_TEAM", "NORMAL_USER"])
        elif current_user.role == "DOA_ADMINISTRATOR":
            effective_roles.extend(["ADMIN"])
            
        if not any(r in allowed_roles for r in effective_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: required role in {allowed_roles}"
            )
        return current_user
    return role_checker

def require_persona(allowed_personas: list[str]):
    def persona_checker(current_user: User = Depends(get_current_user)) -> User:
        # DOA_ADMINISTRATOR / ADMIN can oversee persona workflows; SYSTEM_ADMINISTRATOR cannot execute business workflows
        if current_user.role in ["ADMIN", "DOA_ADMINISTRATOR"]:
            return current_user
        if current_user.role == "SYSTEM_ADMINISTRATOR":
            if "AUDIT_READONLY" in allowed_personas:
                return current_user
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: System Administrator cannot execute business persona workflows"
            )
        user_persona = getattr(current_user, "persona_type", "FRONTEND_USER")
        if user_persona in allowed_personas:
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: requires persona in {allowed_personas}"
        )
    return persona_checker

# Helper role dependencies (Strict Segregation of Duties)
require_admin = require_roles(["ADMIN", "DOA_ADMINISTRATOR"])
require_doa_admin = require_roles(["ADMIN", "DOA_ADMINISTRATOR"])
require_publisher = require_roles(["ADMIN", "DOA_ADMINISTRATOR", "GOVERNANCE_TEAM"])
require_governance_or_admin = require_roles(["ADMIN", "DOA_ADMINISTRATOR", "GOVERNANCE_TEAM", "REVIEWER"])
require_audit_viewer = require_roles(["ADMIN", "DOA_ADMINISTRATOR", "SYSTEM_ADMINISTRATOR", "GOVERNANCE_TEAM", "AUDIT_READONLY", "REVIEWER"])
require_system_admin = require_roles(["ADMIN", "SYSTEM_ADMINISTRATOR"])

def require_approver_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role in ["ADMIN", "DOA_ADMINISTRATOR"]:
        return current_user
    if current_user.role == "NORMAL_USER" and current_user.persona_type == "APPROVER":
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access forbidden: requires Executive Approver or DOA Administrator authorization"
    )

def check_entity_write_access(target_entity_id: str, current_user: User) -> bool:
    """
    Acceptance Criteria (Section 6 & 4.4):
    Entity ownership prevents unauthorised cross-geography changes while permitting agreed read-only access.
    """
    assert_entity_write_access(target_entity_id, current_user)
    return True
