from datetime import datetime, timezone
import json
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.database.models import AuditLog

def log_audit(
    db: Session,
    user_email: str,
    role: str,
    action: str,
    entity: str,
    record_id: str,
    old_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None,
    comment: Optional[str] = None,
    user_id: Optional[int] = None
) -> AuditLog:
    entry = AuditLog(
        user_id=user_id,
        user_email=user_email,
        role=role,
        action=action,
        entity=entity,
        record_id=str(record_id),
        old_value=json.dumps(old_value) if old_value is not None else None,
        new_value=json.dumps(new_value) if new_value is not None else None,
        comment=comment,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(entry)
    db.flush()
    return entry
