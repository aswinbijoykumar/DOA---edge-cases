from datetime import datetime, timezone
import json
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.database.models import DOARecord, DOAVersion

def record_to_dict(rec: DOARecord) -> Dict[str, Any]:
    return {
        "id": rec.id,
        "parent_function": rec.parent_function,
        "function": rec.function,
        "business_line": rec.business_line,
        "category": rec.category,
        "key_non_key": rec.key_non_key,
        "decision_area": rec.decision_area,
        "shareholders": rec.shareholders,
        "board_of_directors": rec.board_of_directors,
        "subsidiary_board": rec.subsidiary_board,
        "chairman": rec.chairman,
        "board_committees": rec.board_committees,
        "board_committees_op": rec.board_committees_op,
        "board_committees2": rec.board_committees2,
        "board_committees2_op": rec.board_committees2_op,
        "gceo": rec.gceo,
        "ceo": rec.ceo,
        "mgmt_committees": rec.mgmt_committees,
        "mgmt_committees_op": rec.mgmt_committees_op,
        "mgmt_committees2": rec.mgmt_committees2,
        "mgmt_committees2_op": rec.mgmt_committees2_op,
        "c_level1": rec.c_level1,
        "c_level1_op": rec.c_level1_op,
        "c_level2": rec.c_level2,
        "c_level2_op": rec.c_level2_op,
        "comments": rec.comments,
        "regulatory": rec.regulatory,
        "composite_authority": rec.composite_authority,
        "rationale": rec.rationale,
        "policy_reference": getattr(rec, "policy_reference", ""),
        "charter_section": getattr(rec, "charter_section", ""),
        "regulatory_requirement": getattr(rec, "regulatory_requirement", ""),
        "process_name": getattr(rec, "process_name", ""),
        "attachments": getattr(rec, "attachments", "[]"),
        "current_version": rec.current_version,
        "status": rec.status,
        "effective_date": rec.effective_date,
        "review_date": rec.review_date,
    }

def archive_current_version_as_historical(
    db: Session,
    doa_record: DOARecord,
    user_email: str
) -> DOAVersion:
    """Marks any previous published version snapshots as HISTORICAL"""
    existing_published = (
        db.query(DOAVersion)
        .filter(DOAVersion.doa_id == doa_record.id, DOAVersion.status == "PUBLISHED")
        .all()
    )
    for v in existing_published:
        v.status = "HISTORICAL"

    db.flush()

def create_published_version_snapshot(
    db: Session,
    doa_record: DOARecord,
    user_email: str,
    change_request_id: str = None
) -> DOAVersion:
    """Creates a new DOAVersion row with status=PUBLISHED for the newly published version"""
    snapshot_data = record_to_dict(doa_record)
    version_row = DOAVersion(
        doa_id=doa_record.id,
        version_number=doa_record.current_version,
        status="PUBLISHED",
        effective_date=doa_record.effective_date,
        snapshot=json.dumps(snapshot_data),
        change_request_id=change_request_id,
        created_by=user_email,
        created_at=datetime.now(timezone.utc)
    )
    db.add(version_row)
    db.flush()
    return version_row
