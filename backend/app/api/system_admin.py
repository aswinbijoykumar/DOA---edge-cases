from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from app.database.database import get_db, engine
from app.database.models import User, DOARecord, ChangeRequest, AuditLog
from app.core.dependencies import require_roles
from app.schemas.schemas import AuditLogRead

router = APIRouter(prefix="/system-admin", tags=["System Administrator Control Center"])

require_system_admin_role = require_roles(["SYSTEM_ADMINISTRATOR", "ADMIN"])

@router.get("/dashboard")
def get_system_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_system_admin_role)
):
    """
    Dedicated dashboard summary for System Administrator.
    Provides system health metrics, total active users, database statistics,
    and recent system-wide audit records.
    """
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    total_doa = db.query(DOARecord).count()
    total_crs = db.query(ChangeRequest).count()
    total_audits = db.query(AuditLog).count()

    recent_audits = (
        db.query(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .limit(5)
        .all()
    )

    formatted_audits = []
    for log in recent_audits:
        formatted_audits.append(
            AuditLogRead(
                id=log.id,
                user_id=log.user_id,
                user_email=log.user_email,
                role=log.role,
                action=log.action,
                entity=log.entity,
                record_id=log.record_id,
                timestamp=log.timestamp,
                old_value=json.loads(log.old_value) if log.old_value else None,
                new_value=json.loads(log.new_value) if log.new_value else None,
                comment=log.comment
            )
        )

    return {
        "role": current_user.role,
        "user_name": current_user.full_name,
        "system_status": "ONLINE",
        "database_type": "SQLite 3",
        "total_users": total_users,
        "active_users": active_users,
        "total_doa_records": total_doa,
        "total_change_requests": total_crs,
        "total_audit_records": total_audits,
        "recent_audits": formatted_audits
    }

@router.get("/telemetry")
def get_system_telemetry(
    current_user: User = Depends(require_system_admin_role)
):
    """System health check and connection telemetry."""
    return {
        "status": "HEALTHY",
        "api_version": "1.0.0",
        "backend_framework": "FastAPI",
        "auth_mode": "JWT Bearer RBAC",
        "supported_roles": ["NORMAL_USER", "GOVERNANCE_TEAM", "DOA_ADMINISTRATOR", "SYSTEM_ADMINISTRATOR"]
    }
