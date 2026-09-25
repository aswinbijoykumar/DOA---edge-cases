from typing import List, Optional
import json
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import AuditLog, User
from app.core.dependencies import require_admin, require_governance_or_admin
from app.schemas.schemas import AuditLogRead


router = APIRouter(prefix="/audit", tags=["Audit Trail"])

@router.get("", response_model=List[AuditLogRead])
def list_audit_logs(
    action: Optional[str] = Query(None),
    record_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    authorized_user: User = Depends(require_governance_or_admin)
):
    """Audit trail query accessible to Administrators and Governance Team."""

    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if record_id:
        query = query.filter(AuditLog.record_id == record_id)
        
    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    
    result = []
    for log in logs:
        result.append(
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
    return result

@router.get("/{record_id}", response_model=List[AuditLogRead])
def get_record_audit_logs(
    record_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Admin-only audit trail for a specific record ID."""
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.record_id == record_id)
        .order_by(AuditLog.timestamp.desc())
        .all()
    )
    result = []
    for log in logs:
        result.append(
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
    return result
