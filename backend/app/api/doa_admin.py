from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.database import get_db
from app.database.models import User, DOARecord, ChangeRequest
from app.core.dependencies import require_roles
from app.schemas.schemas import ChangeRequestRead, ActionDecision, DOARead
from app.services import change_request_service, doa_service
from app.api.change_requests import format_cr_response

router = APIRouter(prefix="/doa-admin", tags=["DOA Administrator Hub"])

require_doa_admin_role = require_roles(["DOA_ADMINISTRATOR", "ADMIN", "SYSTEM_ADMINISTRATOR"])

@router.get("/dashboard")
def get_doa_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doa_admin_role)
):
    """
    Dedicated dashboard summary for DOA Administrator (Chief Delegation Officer).
    Presents pending approvals, requests ready to publish, published matrix counts,
    and actions requiring executive sign-off.
    """
    pending_approval = db.query(ChangeRequest).filter(ChangeRequest.status == "SUBMITTED").count()
    ready_to_publish = db.query(ChangeRequest).filter(ChangeRequest.status == "APPROVED").count()
    total_published = db.query(DOARecord).filter(DOARecord.status == "PUBLISHED").count()
    rejected_count = db.query(ChangeRequest).filter(ChangeRequest.status == "REJECTED").count()

    actionable_queue = (
        db.query(ChangeRequest)
        .filter(ChangeRequest.status.in_(["SUBMITTED", "APPROVED"]))
        .order_by(ChangeRequest.created_at.desc())
        .limit(6)
        .all()
    )

    return {
        "role": current_user.role,
        "user_name": current_user.full_name,
        "pending_approval": pending_approval,
        "ready_to_publish": ready_to_publish,
        "total_published": total_published,
        "rejected_count": rejected_count,
        "actionable_queue": [format_cr_response(cr) for cr in actionable_queue]
    }

@router.post("/requests/{cr_id}/approve", response_model=ChangeRequestRead)
def approve_request(
    cr_id: str,
    decision: ActionDecision,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_doa_admin_role)
):
    """Approve a change request."""
    cr = change_request_service.approve_change_request(db, cr_id, decision, admin_user)
    return format_cr_response(cr)

@router.post("/requests/{cr_id}/reject", response_model=ChangeRequestRead)
def reject_request(
    cr_id: str,
    decision: ActionDecision,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_doa_admin_role)
):
    """Reject a change request."""
    cr = change_request_service.reject_change_request(db, cr_id, decision, admin_user)
    return format_cr_response(cr)

@router.post("/requests/{cr_id}/clarification", response_model=ChangeRequestRead)
def request_clarification(
    cr_id: str,
    decision: ActionDecision,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_doa_admin_role)
):
    """Return a change request to requester for clarification / amendment."""
    cr = change_request_service.get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")
    
    old_status = cr.status
    cr.status = "CLARIFICATION_REQUIRED"
    cr.reviewer_id = admin_user.id
    cr.reviewer_email = admin_user.email
    cr.decision_comment = decision.comment or "Clarification required from requester"
    db.flush()
    db.commit()
    db.refresh(cr)
    return format_cr_response(cr)

@router.post("/requests/{cr_id}/resubmit", response_model=ChangeRequestRead)
def resubmit_request(
    cr_id: str,
    decision: ActionDecision,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_doa_admin_role)
):
    """Resubmit a change request that was previously marked as Clarification Required."""
    cr = change_request_service.get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")
    
    cr.status = "SUBMITTED"
    if decision.comment:
        cr.decision_comment = (cr.decision_comment or "") + f" | Resubmitted: {decision.comment}"
    db.flush()
    db.commit()
    db.refresh(cr)
    return format_cr_response(cr)

@router.post("/requests/{cr_id}/withdraw", response_model=ChangeRequestRead)
def withdraw_request(
    cr_id: str,
    decision: ActionDecision,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_doa_admin_role)
):
    """Withdraw a change request from the queue."""
    cr = change_request_service.get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")
    
    cr.status = "WITHDRAWN"
    cr.decision_comment = decision.comment or "Withdrawn by Administrator"
    db.flush()
    db.commit()
    db.refresh(cr)
    return format_cr_response(cr)

@router.post("/requests/{cr_id}/publish", response_model=ChangeRequestRead)
def publish_request(
    cr_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_doa_admin_role)
):
    """Publish an approved change request, creating a new master version."""
    cr = change_request_service.publish_change_request(db, cr_id, admin_user)
    return format_cr_response(cr)

@router.post("/validate-record")
def validate_record(
    payload: dict,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_doa_admin_role)
):
    """
    A6 Data Validation Engine:
    Detects duplicate records, missing mandatory fields, invalid mappings,
    and inconsistent authority data before submission.
    """
    errors = []
    warnings = []

    # Mandatory field checks
    if not payload.get("decision_area") or not str(payload.get("decision_area")).strip():
        errors.append("Decision Area description is mandatory.")
    
    if not payload.get("parent_function"):
        errors.append("Parent Function (Finance / Risk) is mandatory.")

    if not payload.get("business_line"):
        errors.append("Business Line / Category taxonomy mapping is mandatory.")

    if not payload.get("composite_authority"):
        errors.append("At least one governance authority layer must be specified.")

    # Duplicate check
    decision_area_txt = str(payload.get("decision_area", "")).strip()
    parent_func = payload.get("parent_function", "")
    record_id = payload.get("id")

    if decision_area_txt:
        existing_dup = db.query(DOARecord).filter(
            DOARecord.decision_area.ilike(decision_area_txt),
            DOARecord.parent_function == parent_func
        )
        if record_id:
            existing_dup = existing_dup.filter(DOARecord.id != str(record_id))
        
        dup_match = existing_dup.first()
        if dup_match:
            errors.append(f"Duplicate record detected: Rule #{dup_match.id} already defines this exact decision in {parent_func}.")

    # Authority consistency check
    composite = str(payload.get("composite_authority", ""))
    if "BoD (A)" in composite and "Shareholders (A)" in composite:
        warnings.append("Dual approval detected: Both Shareholders and Board of Directors are marked with Approve (A). Verify if one should be Endorse (E).")

    # Regulatory mapping check
    regulatory_flag = payload.get("regulatory", "N")
    reg_keywords = ["regulatory", "cbb", "central bank", "basel", "compliance", "sanctions"]
    has_reg_word = any(kw in decision_area_txt.lower() for kw in reg_keywords)
    if has_reg_word and regulatory_flag != "Y":
        warnings.append("Decision text mentions regulatory/prudential requirements, but Regulatory Mandate flag is set to 'N'.")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "validation_passed": len(errors) == 0
    }
