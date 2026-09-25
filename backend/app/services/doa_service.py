from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database.models import DOARecord, DOAVersion
from app.schemas.schemas import DOACreate
from app.services.audit_service import log_audit
from app.services.version_service import create_published_version_snapshot, record_to_dict

def get_doa_records(
    db: Session,
    parent_function: Optional[str] = None,
    business_line: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    key_non_key: Optional[str] = None,
    skip: int = 0,
    limit: int = 200
) -> List[DOARecord]:
    query = db.query(DOARecord)
    
    if status:
        query = query.filter(DOARecord.status == status)
        
    if parent_function and parent_function != "All":
        query = query.filter(
            or_(
                DOARecord.parent_function.ilike(f"%{parent_function}%"),
                DOARecord.function.ilike(f"%{parent_function}%")
            )
        )
        
    if business_line:
        query = query.filter(
            or_(
                DOARecord.business_line == business_line,
                DOARecord.category == business_line
            )
        )

    if key_non_key and key_non_key != "All":
        query = query.filter(DOARecord.key_non_key == key_non_key)
        
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                DOARecord.decision_area.ilike(search_pattern),
                DOARecord.composite_authority.ilike(search_pattern),
                DOARecord.id.ilike(search_pattern),
                DOARecord.comments.ilike(search_pattern),
                DOARecord.business_line.ilike(search_pattern)
            )
        )
        
    return query.order_by(DOARecord.id.asc()).offset(skip).limit(limit).all()

def get_doa_by_id(db: Session, record_id: str) -> Optional[DOARecord]:
    return db.query(DOARecord).filter(DOARecord.id == record_id).first()

def create_direct_doa_record(db: Session, data: DOACreate, user_email: str) -> DOARecord:
    """Admin-only direct creation helper if needed"""
    rec = DOARecord(
        id=data.id,
        parent_function=data.parent_function,
        function=data.function,
        business_line=data.business_line,
        category=data.category,
        key_non_key=data.key_non_key,
        decision_area=data.decision_area,
        shareholders=data.shareholders,
        board_of_directors=data.board_of_directors,
        subsidiary_board=data.subsidiary_board,
        chairman=data.chairman,
        board_committees=data.board_committees,
        board_committees_op=data.board_committees_op,
        board_committees2=data.board_committees2,
        board_committees2_op=data.board_committees2_op,
        gceo=data.gceo,
        ceo=data.ceo,
        mgmt_committees=data.mgmt_committees,
        mgmt_committees_op=data.mgmt_committees_op,
        mgmt_committees2=data.mgmt_committees2,
        mgmt_committees2_op=data.mgmt_committees2_op,
        c_level1=data.c_level1,
        c_level1_op=data.c_level1_op,
        c_level2=data.c_level2,
        c_level2_op=data.c_level2_op,
        comments=data.comments,
        regulatory=data.regulatory,
        composite_authority=data.composite_authority,
        rationale=data.rationale,
        current_version=1,
        status=data.status or "PUBLISHED",
        effective_date=data.effective_date,
        review_date=data.review_date,
        created_by=user_email
    )
    db.add(rec)
    db.flush()
    create_published_version_snapshot(db, rec, user_email)
    log_audit(
        db=db,
        user_email=user_email,
        role="ADMIN",
        action="CREATE_DOA",
        entity="DOA_RECORD",
        record_id=rec.id,
        new_value=record_to_dict(rec),
        comment="Direct DOA master record creation"
    )
    db.commit()
    db.refresh(rec)
    return rec

def archive_doa_record(db: Session, record_id: str, user_email: str) -> Optional[DOARecord]:
    rec = get_doa_by_id(db, record_id)
    if not rec:
        return None
    
    old_val = record_to_dict(rec)
    rec.status = "ARCHIVED"
    rec.modified_by = user_email
    db.flush()
    
    log_audit(
        db=db,
        user_email=user_email,
        role="ADMIN",
        action="ARCHIVE_DOA",
        entity="DOA_RECORD",
        record_id=rec.id,
        old_value=old_val,
        new_value=record_to_dict(rec),
        comment=f"DOA Record {rec.id} archived"
    )
    db.commit()
    db.refresh(rec)
    return rec
