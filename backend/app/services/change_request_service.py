from datetime import datetime, timezone
import json
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.database.models import ChangeRequest, DOARecord, User
from app.schemas.schemas import ChangeRequestCreate, ActionDecision
from app.services.audit_service import log_audit
from app.services.version_service import (
    record_to_dict,
    archive_current_version_as_historical,
    create_published_version_snapshot
)

def generate_cr_id(db: Session) -> str:
    count = db.query(ChangeRequest).count() + 1
    return f"CR-{count:04d}"

def create_change_request(
    db: Session,
    data: ChangeRequestCreate,
    current_user: User
) -> ChangeRequest:
    cr_id = generate_cr_id(db)
    
    current_val_dict = None
    base_ver = 1
    
    if data.doa_id:
        target_doa = db.query(DOARecord).filter(DOARecord.id == data.doa_id).first()
        if target_doa:
            current_val_dict = record_to_dict(target_doa)
            base_ver = data.base_version if data.base_version is not None else target_doa.current_version

    
    cr = ChangeRequest(
        id=cr_id,
        request_type=data.request_type.upper(),
        doa_id=data.doa_id,
        requester_id=current_user.id,
        requester_email=current_user.email,
        department=data.department or current_user.department or "Governance",
        process=data.process,
        rationale=data.rationale,
        base_version=base_ver,
        current_value=json.dumps(current_val_dict) if current_val_dict else None,
        proposed_value=json.dumps(data.proposed_value),
        operational_impact=data.operational_impact,
        attachments=json.dumps(data.attachments) if data.attachments else "[]",
        status="SUBMITTED", # Immediately submitted for prototype simplicity
        created_at=datetime.now(timezone.utc),
        submitted_at=datetime.now(timezone.utc)
    )
    db.add(cr)
    db.flush()
    
    log_audit(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        action="SUBMIT_CHANGE",
        entity="CHANGE_REQUEST",
        record_id=cr.id,
        new_value={"id": cr.id, "type": cr.request_type, "proposed": data.proposed_value},
        comment=f"Change Request {cr.id} submitted for {cr.request_type}"
    )
    db.commit()
    db.refresh(cr)
    return cr

def get_change_requests(
    db: Session,
    status_filter: Optional[str] = None,
    user_id: Optional[int] = None,
    is_admin: bool = False
) -> List[ChangeRequest]:
    query = db.query(ChangeRequest)
    if not is_admin and user_id is not None:
        query = query.filter(ChangeRequest.requester_id == user_id)
        
    if status_filter:
        query = query.filter(ChangeRequest.status == status_filter)
        
    return query.order_by(ChangeRequest.created_at.desc()).all()

def get_change_request_by_id(db: Session, cr_id: str) -> Optional[ChangeRequest]:
    return db.query(ChangeRequest).filter(ChangeRequest.id == cr_id).first()

def approve_change_request(
    db: Session,
    cr_id: str,
    decision: ActionDecision,
    admin_user: User
) -> ChangeRequest:
    cr = get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")
        
    if cr.status not in ["SUBMITTED", "DRAFT"]:
        raise HTTPException(status_code=400, detail=f"Cannot approve change request with status {cr.status}")
        
    old_val = {"status": cr.status}
    cr.status = "APPROVED"
    cr.reviewer_id = admin_user.id
    cr.reviewer_email = admin_user.email
    cr.reviewed_at = datetime.now(timezone.utc)
    cr.decision_comment = decision.comment
    
    db.flush()
    
    log_audit(
        db=db,
        user_id=admin_user.id,
        user_email=admin_user.email,
        role="ADMIN",
        action="APPROVE_CHANGE",
        entity="CHANGE_REQUEST",
        record_id=cr.id,
        old_value=old_val,
        new_value={"status": cr.status, "decision_comment": decision.comment},
        comment=f"Change request {cr.id} approved by Admin"
    )
    db.commit()
    db.refresh(cr)
    return cr

def reject_change_request(
    db: Session,
    cr_id: str,
    decision: ActionDecision,
    admin_user: User
) -> ChangeRequest:
    cr = get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")
        
    if cr.status not in ["SUBMITTED", "DRAFT"]:
        raise HTTPException(status_code=400, detail=f"Cannot reject change request with status {cr.status}")
        
    old_val = {"status": cr.status}
    cr.status = "REJECTED"
    cr.reviewer_id = admin_user.id
    cr.reviewer_email = admin_user.email
    cr.reviewed_at = datetime.now(timezone.utc)
    cr.decision_comment = decision.comment
    
    db.flush()
    
    log_audit(
        db=db,
        user_id=admin_user.id,
        user_email=admin_user.email,
        role="ADMIN",
        action="REJECT_CHANGE",
        entity="CHANGE_REQUEST",
        record_id=cr.id,
        old_value=old_val,
        new_value={"status": cr.status, "decision_comment": decision.comment},
        comment=f"Change request {cr.id} rejected by Admin"
    )
    db.commit()
    db.refresh(cr)
    return cr

def publish_change_request(
    db: Session,
    cr_id: str,
    admin_user: User
) -> ChangeRequest:
    cr = get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")
        
    if cr.status != "APPROVED":
        raise HTTPException(status_code=400, detail="Only APPROVED change requests can be published")

    proposed_data: Dict[str, Any] = json.loads(cr.proposed_value)

    if cr.request_type == "ADD":
        # Generate new DOA ID if not supplied
        new_id = proposed_data.get("id")
        if not new_id or db.query(DOARecord).filter(DOARecord.id == str(new_id)).first():
            max_id = 0
            for r in db.query(DOARecord.id).all():
                try:
                    val = int(r[0])
                    if val > max_id:
                        max_id = val
                except ValueError:
                    pass
            new_id = str(max_id + 1)

        new_record = DOARecord(
            id=new_id,
            parent_function=proposed_data.get("parent_function") or proposed_data.get("function") or "Finance",
            function=proposed_data.get("function") or proposed_data.get("parent_function") or "Finance",
            business_line=proposed_data.get("business_line") or proposed_data.get("category") or "",
            category=proposed_data.get("category") or proposed_data.get("business_line") or "",
            key_non_key=proposed_data.get("key_non_key", "Key"),
            decision_area=proposed_data.get("decision_area", ""),
            shareholders=proposed_data.get("shareholders", ""),
            board_of_directors=proposed_data.get("board_of_directors", ""),
            subsidiary_board=proposed_data.get("subsidiary_board", ""),
            chairman=proposed_data.get("chairman", ""),
            board_committees=proposed_data.get("board_committees", ""),
            board_committees_op=proposed_data.get("board_committees_op", ""),
            board_committees2=proposed_data.get("board_committees2", ""),
            board_committees2_op=proposed_data.get("board_committees2_op", ""),
            gceo=proposed_data.get("gceo", ""),
            ceo=proposed_data.get("ceo", ""),
            mgmt_committees=proposed_data.get("mgmt_committees", ""),
            mgmt_committees_op=proposed_data.get("mgmt_committees_op", ""),
            mgmt_committees2=proposed_data.get("mgmt_committees2", ""),
            mgmt_committees2_op=proposed_data.get("mgmt_committees2_op", ""),
            c_level1=proposed_data.get("c_level1", ""),
            c_level1_op=proposed_data.get("c_level1_op", ""),
            c_level2=proposed_data.get("c_level2", ""),
            c_level2_op=proposed_data.get("c_level2_op", ""),
            comments=proposed_data.get("comments") or proposed_data.get("rationale") or "",
            regulatory=proposed_data.get("regulatory", "N"),
            composite_authority=proposed_data.get("composite_authority", "BoD (A)"),
            rationale=cr.rationale or proposed_data.get("rationale", ""),
            process_name=cr.process or proposed_data.get("process_name") or "Procure-to-Pay (P2P)",
            policy_reference=proposed_data.get("policy_reference") or f"Internal Policy Ref §{new_id}.1",
            charter_section=proposed_data.get("charter_section") or "Corporate Governance Charter Schedule B",
            regulatory_requirement="Central Bank Regulatory Framework (CBR-Gov §44)" if proposed_data.get("regulatory") == "Y" else "Internal Process Governance",
            attachments=cr.attachments or "[]",
            current_version=1,
            status="PUBLISHED",
            effective_date=proposed_data.get("effective_date", "2026-01-01"),
            review_date=proposed_data.get("review_date", "2027-01-01"),
            created_by=cr.requester_email,
            created_at=datetime.now(timezone.utc)
        )
        db.add(new_record)
        db.flush()
        
        # Create published version snapshot (v1)
        create_published_version_snapshot(db, new_record, admin_user.email, change_request_id=cr.id)
        
        cr.doa_id = new_record.id
        cr.status = "PUBLISHED"
        cr.published_at = datetime.now(timezone.utc)
        
        log_audit(
            db=db,
            user_id=admin_user.id,
            user_email=admin_user.email,
            role="ADMIN",
            action="PUBLISH_CHANGE",
            entity="DOA_RECORD",
            record_id=new_record.id,
            new_value=record_to_dict(new_record),
            comment=f"New DOA #{new_record.id} published via {cr.id}"
        )

    elif cr.request_type == "MODIFY":
        target_doa = db.query(DOARecord).filter(DOARecord.id == cr.doa_id).first()
        if not target_doa:
            raise HTTPException(status_code=404, detail="Target DOA record not found")

        # Concurrency / Stale check: verify base_version against current_version
        if target_doa.current_version != cr.base_version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Conflict: DOA record {target_doa.id} has changed to v{target_doa.current_version} since this request was created (v{cr.base_version})."
            )

        # 1. Archive current published version into DOAVersion as HISTORICAL
        archive_current_version_as_historical(db, target_doa, admin_user.email)

        # 2. Bump version number
        old_val = record_to_dict(target_doa)
        target_doa.current_version += 1
        target_doa.modified_by = admin_user.email
        target_doa.modified_at = datetime.now(timezone.utc)

        # 3. Apply proposed changes to active record
        for field, val in proposed_data.items():
            if hasattr(target_doa, field) and field not in ["id", "current_version", "created_at", "created_by"]:
                setattr(target_doa, field, val)

        target_doa.status = "PUBLISHED"
        db.flush()

        # 4. Create new version snapshot as PUBLISHED
        create_published_version_snapshot(db, target_doa, admin_user.email, change_request_id=cr.id)

        cr.status = "PUBLISHED"
        cr.published_at = datetime.now(timezone.utc)

        log_audit(
            db=db,
            user_id=admin_user.id,
            user_email=admin_user.email,
            role="ADMIN",
            action="PUBLISH_CHANGE",
            entity="DOA_RECORD",
            record_id=target_doa.id,
            old_value=old_val,
            new_value=record_to_dict(target_doa),
            comment=f"DOA #{target_doa.id} published as v{target_doa.current_version} via {cr.id}"
        )

    elif cr.request_type in ["DELETE", "RETIRE"]:
        target_doa = db.query(DOARecord).filter(DOARecord.id == cr.doa_id).first()
        if not target_doa:
            raise HTTPException(status_code=404, detail="Target DOA record not found")

        old_val = record_to_dict(target_doa)
        archive_current_version_as_historical(db, target_doa, admin_user.email)
        
        target_doa.status = "ARCHIVED"
        target_doa.modified_by = admin_user.email
        target_doa.modified_at = datetime.now(timezone.utc)
        db.flush()

        cr.status = "PUBLISHED"
        cr.published_at = datetime.now(timezone.utc)

        log_audit(
            db=db,
            user_id=admin_user.id,
            user_email=admin_user.email,
            role="ADMIN",
            action="ARCHIVE_DOA",
            entity="DOA_RECORD",
            record_id=target_doa.id,
            old_value=old_val,
            new_value=record_to_dict(target_doa),
            comment=f"DOA #{target_doa.id} retired/archived via {cr.id}"
        )

    db.commit()
    db.refresh(cr)
    return cr
