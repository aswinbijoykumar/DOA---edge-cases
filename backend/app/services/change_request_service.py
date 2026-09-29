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

def notify_user(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    link: Optional[str] = None,
    notification_type: str = "INFO"
):
    from app.database.models import Notification
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        link=link,
        notification_type=notification_type,
        created_at=datetime.now(timezone.utc)
    )
    db.add(notif)
    db.flush()

def create_change_request(
    db: Session,
    data: ChangeRequestCreate,
    current_user: User,
    as_draft: bool = False
) -> ChangeRequest:
    cr_id = generate_cr_id(db)
    
    current_val_dict = None
    base_ver = 1
    
    if data.doa_id:
        target_doa = db.query(DOARecord).filter(DOARecord.id == data.doa_id).first()
        if target_doa:
            current_val_dict = record_to_dict(target_doa)
            base_ver = data.base_version if data.base_version is not None else target_doa.current_version

    initial_status = "DRAFT" if as_draft else "SUBMITTED"
    now_utc = datetime.now(timezone.utc)
    
    cr = ChangeRequest(
        id=cr_id,
        request_type=data.request_type.upper(),
        doa_id=data.doa_id,
        requester_id=current_user.id,
        requester_email=current_user.email,
        department=data.department or current_user.department or "Governance",
        process=data.process,
        rationale=data.rationale,
        currency=data.currency or "USD",
        current_limit=data.current_limit,
        proposed_limit=data.proposed_limit,
        effective_date=data.effective_date,
        priority=data.priority or "MEDIUM",
        due_date=data.due_date,
        risk_impact=data.risk_impact,
        base_version=base_ver,
        current_value=json.dumps(current_val_dict) if current_val_dict else None,
        proposed_value=json.dumps(data.proposed_value),
        operational_impact=data.operational_impact,
        attachments=json.dumps(data.attachments) if data.attachments else "[]",
        status=initial_status,
        created_at=now_utc,
        submitted_at=now_utc if not as_draft else None
    )
    db.add(cr)
    db.flush()
    
    action_type = "SAVE_DRAFT" if as_draft else "SUBMIT_CHANGE"
    log_audit(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        action=action_type,
        entity="CHANGE_REQUEST",
        record_id=cr.id,
        new_value={"id": cr.id, "type": cr.request_type, "status": cr.status, "proposed": data.proposed_value},
        comment=f"Change Request {cr.id} {initial_status.lower()} for {cr.request_type}"
    )

    if not as_draft:
        # Notify user of submission
        notify_user(
            db, 
            current_user.id, 
            f"Request {cr.id} Submitted", 
            f"Your request for {cr.request_type} has been submitted and is in the review queue.",
            link=f"/requests/{cr.id}",
            notification_type="STATUS_UPDATE"
        )

    db.commit()
    db.refresh(cr)
    return cr

def update_change_request(
    db: Session,
    cr_id: str,
    update_data: Dict[str, Any],
    current_user: User
) -> ChangeRequest:
    cr = get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    if cr.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized: you can only edit your own requests")

    if cr.status not in ["DRAFT", "CLARIFICATION_REQUIRED"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Modifications not permitted for request in status '{cr.status}'. Only DRAFT or CLARIFICATION_REQUIRED requests can be edited."
        )

    for field, val in update_data.items():
        if val is not None:
            if field == "proposed_value":
                cr.proposed_value = json.dumps(val)
            elif field == "attachments":
                cr.attachments = json.dumps(val)
            elif hasattr(cr, field) and field not in ["id", "requester_id", "requester_email", "status", "created_at"]:
                setattr(cr, field, val)

    db.flush()
    log_audit(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        action="UPDATE_CHANGE_REQUEST",
        entity="CHANGE_REQUEST",
        record_id=cr.id,
        new_value={"id": cr.id, "updated_fields": list(update_data.keys())},
        comment=f"Change Request {cr.id} updated while in status {cr.status}"
    )
    db.commit()
    db.refresh(cr)
    return cr

def submit_draft_request(
    db: Session,
    cr_id: str,
    current_user: User
) -> ChangeRequest:
    cr = get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    if cr.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized: you can only submit your own drafts")

    if cr.status != "DRAFT":
        raise HTTPException(status_code=400, detail=f"Request is not a draft (current status: {cr.status})")

    cr.status = "SUBMITTED"
    cr.submitted_at = datetime.now(timezone.utc)
    db.flush()

    log_audit(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        action="SUBMIT_DRAFT",
        entity="CHANGE_REQUEST",
        record_id=cr.id,
        new_value={"id": cr.id, "status": "SUBMITTED"},
        comment=f"Draft Change Request {cr.id} submitted for review"
    )
    notify_user(
        db, 
        current_user.id, 
        f"Draft {cr.id} Submitted", 
        f"Your draft {cr.id} is now submitted and visible to Reviewers.",
        link=f"/requests/{cr.id}",
        notification_type="STATUS_UPDATE"
    )
    db.commit()
    db.refresh(cr)
    return cr

def delete_draft_request(
    db: Session,
    cr_id: str,
    current_user: User
) -> bool:
    cr = get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    if cr.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized: you can only delete your own drafts")

    if cr.status != "DRAFT":
        raise HTTPException(status_code=400, detail=f"Only DRAFT requests can be deleted. Current status: {cr.status}")

    db.delete(cr)
    db.flush()
    log_audit(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        action="DELETE_DRAFT",
        entity="CHANGE_REQUEST",
        record_id=cr_id,
        comment=f"Draft Change Request {cr_id} deleted by author"
    )
    db.commit()
    return True

def start_review(
    db: Session,
    cr_id: str,
    reviewer_user: User
) -> ChangeRequest:
    cr = get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    if cr.status not in ["SUBMITTED", "CLARIFICATION_REQUIRED"]:
        raise HTTPException(status_code=400, detail=f"Cannot move request from {cr.status} to UNDER_REVIEW")

    cr.status = "UNDER_REVIEW"
    cr.reviewer_id = reviewer_user.id
    cr.reviewer_email = reviewer_user.email
    db.flush()

    log_audit(
        db=db,
        user_id=reviewer_user.id,
        user_email=reviewer_user.email,
        role=reviewer_user.role,
        action="START_REVIEW",
        entity="CHANGE_REQUEST",
        record_id=cr.id,
        new_value={"status": cr.status, "reviewer_id": reviewer_user.id},
        comment=f"Reviewer {reviewer_user.email} initiated review on {cr.id}"
    )
    notify_user(
        db,
        cr.requester_id,
        f"Request {cr.id} Under Review",
        f"Reviewer {reviewer_user.full_name} is actively inspecting your request.",
        link=f"/requests/{cr.id}",
        notification_type="STATUS_UPDATE"
    )
    db.commit()
    db.refresh(cr)
    return cr

def request_clarification(
    db: Session,
    cr_id: str,
    message: str,
    attachments: Optional[List[Dict[str, Any]]],
    reviewer_user: User
) -> ChangeRequest:
    from app.database.models import RequestClarification
    cr = get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    # SoD Check: A user cannot request clarification on their own request as a reviewer
    if cr.requester_id == reviewer_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Segregation of Duties violation: A reviewer cannot conduct reviewer actions on their own request."
        )

    if cr.status not in ["SUBMITTED", "UNDER_REVIEW"]:
        raise HTTPException(status_code=400, detail=f"Cannot request clarification for request in status {cr.status}")

    cr.status = "CLARIFICATION_REQUIRED"
    cr.reviewer_id = reviewer_user.id
    cr.reviewer_email = reviewer_user.email
    cr.decision_comment = f"[Clarification by {reviewer_user.full_name}]: {message}"

    clarification_entry = RequestClarification(
        change_request_id=cr.id,
        user_id=reviewer_user.id,
        user_email=reviewer_user.email,
        user_name=reviewer_user.full_name,
        message_type="INQUIRY",
        message=message,
        attachments=json.dumps(attachments) if attachments else "[]",
        created_at=datetime.now(timezone.utc)
    )
    db.add(clarification_entry)
    db.flush()

    log_audit(
        db=db,
        user_id=reviewer_user.id,
        user_email=reviewer_user.email,
        role=reviewer_user.role,
        action="REQUEST_CLARIFICATION",
        entity="CHANGE_REQUEST",
        record_id=cr.id,
        new_value={"status": cr.status, "message": message},
        comment=f"Clarification requested on {cr.id}"
    )
    notify_user(
        db,
        cr.requester_id,
        f"Clarification Required for {cr.id}",
        f"Reviewer {reviewer_user.full_name} requested clarification: \"{message}\"",
        link=f"/requests/{cr.id}",
        notification_type="CLARIFICATION"
    )
    db.commit()
    db.refresh(cr)
    return cr

def respond_clarification(
    db: Session,
    cr_id: str,
    message: str,
    attachments: Optional[List[Dict[str, Any]]],
    requestor_user: User
) -> ChangeRequest:
    from app.database.models import RequestClarification
    cr = get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    if cr.requester_id != requestor_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized: only the author can respond to this clarification")

    if cr.status != "CLARIFICATION_REQUIRED":
        raise HTTPException(status_code=400, detail=f"Request is not pending clarification (status: {cr.status})")

    cr.status = "UNDER_REVIEW" # Returns to review queue

    clarification_entry = RequestClarification(
        change_request_id=cr.id,
        user_id=requestor_user.id,
        user_email=requestor_user.email,
        user_name=requestor_user.full_name,
        message_type="RESPONSE",
        message=message,
        attachments=json.dumps(attachments) if attachments else "[]",
        created_at=datetime.now(timezone.utc)
    )
    db.add(clarification_entry)
    db.flush()

    log_audit(
        db=db,
        user_id=requestor_user.id,
        user_email=requestor_user.email,
        role=requestor_user.role,
        action="RESPOND_CLARIFICATION",
        entity="CHANGE_REQUEST",
        record_id=cr.id,
        new_value={"status": cr.status, "response": message},
        comment=f"Requestor responded to clarification on {cr.id}"
    )
    if cr.reviewer_id:
        notify_user(
            db,
            cr.reviewer_id,
            f"Clarification Response on {cr.id}",
            f"{requestor_user.full_name} responded to your inquiry on {cr.id}.",
            link=f"/requests/{cr.id}",
            notification_type="ACTION_REQUIRED"
        )
    db.commit()
    db.refresh(cr)
    return cr

def add_review_comment(
    db: Session,
    cr_id: str,
    comment: str,
    operational_comments: Optional[str],
    reviewer_user: User
) -> ChangeRequest:
    cr = get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    if cr.requester_id == reviewer_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Segregation of Duties violation: A user cannot provide reviewer comments on their own request."
        )

    cr.reviewer_id = reviewer_user.id
    cr.reviewer_email = reviewer_user.email
    cr.reviewer_comments = comment
    if operational_comments:
        cr.operational_comments = operational_comments
    
    # Also log in RequestClarification or Audit for chronological view
    from app.database.models import RequestClarification
    note_entry = RequestClarification(
        change_request_id=cr.id,
        user_id=reviewer_user.id,
        user_email=reviewer_user.email,
        user_name=reviewer_user.full_name,
        message_type="FEEDBACK",
        message=comment + (f" [Operational Note: {operational_comments}]" if operational_comments else ""),
        attachments="[]",
        created_at=datetime.now(timezone.utc)
    )
    db.add(note_entry)
    db.flush()

    log_audit(
        db=db,
        user_id=reviewer_user.id,
        user_email=reviewer_user.email,
        role=reviewer_user.role,
        action="REVIEWER_FEEDBACK",
        entity="CHANGE_REQUEST",
        record_id=cr.id,
        new_value={"reviewer_comments": comment, "operational_comments": operational_comments},
        comment=f"Reviewer {reviewer_user.full_name} added feedback/comments to {cr.id}"
    )
    notify_user(
        db,
        cr.requester_id,
        f"Reviewer Comment Added to {cr.id}",
        f"Reviewer {reviewer_user.full_name} added notes to your proposal: \"{comment[:80]}...\"",
        link=f"/requests/{cr.id}",
        notification_type="INFO"
    )
    db.commit()
    db.refresh(cr)
    return cr

def submit_recommendation(
    db: Session,
    cr_id: str,
    recommendation: str, # RECOMMEND_APPROVAL, RECOMMEND_REJECTION
    notes: str,
    operational_comments: Optional[str],
    reviewer_user: User
) -> ChangeRequest:
    cr = get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    if cr.requester_id == reviewer_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Segregation of Duties violation: A reviewer cannot submit recommendations on their own request."
        )

    if cr.status not in ["SUBMITTED", "UNDER_REVIEW", "CLARIFICATION_REQUIRED"]:
        raise HTTPException(status_code=400, detail=f"Cannot submit recommendation for request in status {cr.status}")

    cr.reviewer_id = reviewer_user.id
    cr.reviewer_email = reviewer_user.email
    cr.reviewed_at = datetime.now(timezone.utc)
    cr.reviewer_recommendation = recommendation
    cr.reviewer_comments = notes
    if operational_comments:
        cr.operational_comments = operational_comments

    # Also log as clarification thread entry
    from app.database.models import RequestClarification
    rec_label = "Recommend Approval" if recommendation == "RECOMMEND_APPROVAL" else "Recommend Rejection"
    rec_entry = RequestClarification(
        change_request_id=cr.id,
        user_id=reviewer_user.id,
        user_email=reviewer_user.email,
        user_name=reviewer_user.full_name,
        message_type="RECOMMENDATION",
        message=f"[{rec_label}] {notes}" + (f" (Operational Note: {operational_comments})" if operational_comments else ""),
        attachments="[]",
        created_at=datetime.now(timezone.utc)
    )
    db.add(rec_entry)
    db.flush()

    log_audit(
        db=db,
        user_id=reviewer_user.id,
        user_email=reviewer_user.email,
        role=reviewer_user.role,
        action="SUBMIT_RECOMMENDATION",
        entity="CHANGE_REQUEST",
        record_id=cr.id,
        new_value={
            "reviewer_recommendation": recommendation,
            "reviewer_comments": notes,
            "operational_comments": operational_comments
        },
        comment=f"Reviewer {reviewer_user.full_name} submitted recommendation: {rec_label}"
    )

    # Notify requestor and notify approvers/governance
    notify_user(
        db,
        cr.requester_id,
        f"Recommendation Submitted on {cr.id}",
        f"Reviewer {reviewer_user.full_name} submitted formal recommendation: {rec_label}.",
        link=f"/requests/{cr.id}",
        notification_type="STATUS_UPDATE"
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

def get_reviewer_queue(
    db: Session,
    reviewer_user: User,
    status_filter: Optional[str] = None
) -> List[ChangeRequest]:
    """
    Reviewer Queue: incoming and reviewable requests.
    CRITICAL SEGREGATION OF DUTIES:
    Exclude requests where requester_id == reviewer_user.id so a user never reviews their own request!
    """
    query = db.query(ChangeRequest).filter(ChangeRequest.requester_id != reviewer_user.id)
    
    if status_filter:
        query = query.filter(ChangeRequest.status == status_filter)
    else:
        # Default queue shows actionable requests
        query = query.filter(ChangeRequest.status.in_(["SUBMITTED", "UNDER_REVIEW", "CLARIFICATION_REQUIRED", "APPROVED", "REJECTED"]))
        
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

    # CRITICAL SEGREGATION OF DUTIES CHECK:
    # A user MUST NOT be able to approve their own submitted request
    if cr.requester_id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Segregation of Duties violation: A user cannot approve their own submitted request."
        )
        
    if cr.status not in ["SUBMITTED", "UNDER_REVIEW", "CLARIFICATION_REQUIRED"]:
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
        role=admin_user.role,
        action="APPROVE_CHANGE",
        entity="CHANGE_REQUEST",
        record_id=cr.id,
        old_value=old_val,
        new_value={"status": cr.status, "decision_comment": decision.comment},
        comment=f"Change request {cr.id} approved by Reviewer/Approver {admin_user.full_name}"
    )
    notify_user(
        db,
        cr.requester_id,
        f"Request {cr.id} APPROVED",
        f"Your request has been approved by {admin_user.full_name}. Rationale: \"{decision.comment or 'Approved'}\"",
        link=f"/requests/{cr.id}",
        notification_type="STATUS_UPDATE"
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

    # CRITICAL SEGREGATION OF DUTIES CHECK:
    # A user MUST NOT be able to reject their own submitted request as a reviewer
    if cr.requester_id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Segregation of Duties violation: A user cannot reject their own submitted request as a reviewer."
        )
        
    if cr.status not in ["SUBMITTED", "UNDER_REVIEW", "CLARIFICATION_REQUIRED"]:
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
        role=admin_user.role,
        action="REJECT_CHANGE",
        entity="CHANGE_REQUEST",
        record_id=cr.id,
        old_value=old_val,
        new_value={"status": cr.status, "decision_comment": decision.comment},
        comment=f"Change request {cr.id} rejected by Reviewer/Approver {admin_user.full_name}"
    )
    notify_user(
        db,
        cr.requester_id,
        f"Request {cr.id} REJECTED",
        f"Your request was rejected by {admin_user.full_name}. Rationale: \"{decision.comment or 'Rejected'}\"",
        link=f"/requests/{cr.id}",
        notification_type="STATUS_UPDATE"
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
