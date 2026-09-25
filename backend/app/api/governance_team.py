from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from app.database.database import get_db
from app.database.models import User, DOARecord, ChangeRequest, AuditLog
from app.core.dependencies import require_roles
from app.schemas.schemas import ChangeRequestRead, DiffResponse, AuditLogRead, GovernanceActionPayload
from app.services import change_request_service, diff_service
from app.api.change_requests import format_cr_response

router = APIRouter(prefix="/governance", tags=["Governance Team Console"])

require_governance_role = require_roles(["GOVERNANCE_TEAM", "ADMIN", "SYSTEM_ADMINISTRATOR", "DOA_ADMINISTRATOR"])

@router.get("/dashboard")
def get_governance_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_governance_role)
):
    """
    Dedicated dashboard summary for Governance Team.
    Returns counts of pending review requests, regulatory mandated rules,
    breakdown between Risk & Finance domains, and recent audit activity.
    """
    pending_reviews = db.query(ChangeRequest).filter(ChangeRequest.status == "SUBMITTED").count()
    approved_count = db.query(ChangeRequest).filter(ChangeRequest.status == "APPROVED").count()
    regulatory_rules = db.query(DOARecord).filter(DOARecord.regulatory == "Y").count()
    total_published = db.query(DOARecord).filter(DOARecord.status == "PUBLISHED").count()
    
    risk_rules = db.query(DOARecord).filter(
        DOARecord.status == "PUBLISHED",
        (DOARecord.parent_function == "Risk") | (DOARecord.function == "Risk")
    ).count()

    finance_rules = db.query(DOARecord).filter(
        DOARecord.status == "PUBLISHED",
        (DOARecord.parent_function == "Finance") | (DOARecord.function == "Finance")
    ).count()

    recent_queue = (
        db.query(ChangeRequest)
        .filter(ChangeRequest.status == "SUBMITTED")
        .order_by(ChangeRequest.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "role": current_user.role,
        "user_name": current_user.full_name,
        "pending_reviews": pending_reviews,
        "approved_count": approved_count,
        "regulatory_mandated_count": regulatory_rules,
        "total_published_doa": total_published,
        "risk_rules": risk_rules,
        "finance_rules": finance_rules,
        "pending_queue": [format_cr_response(cr) for cr in recent_queue]
    }

@router.get("/queue", response_model=List[ChangeRequestRead])
def get_governance_review_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_governance_role)
):
    """Review all change requests awaiting governance oversight."""
    crs = change_request_service.get_change_requests(db=db, is_admin=True)
    return [format_cr_response(cr) for cr in crs]

@router.get("/queue/{cr_id}/diff", response_model=DiffResponse)
def get_governance_diff(
    cr_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_governance_role)
):
    """Inspect field-by-field diff between current and proposed authority values."""
    cr = change_request_service.get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    current_val = json.loads(cr.current_value) if cr.current_value else {}
    proposed_val = json.loads(cr.proposed_value) if cr.proposed_value else {}

    live_ver = None
    is_stale = False
    if cr.doa_id:
        target_doa = db.query(DOARecord).filter(DOARecord.id == cr.doa_id).first()
        if target_doa:
            live_ver = target_doa.current_version
            if live_ver != cr.base_version:
                is_stale = True

    diffs = diff_service.calculate_diff(current_val, proposed_val)

    return DiffResponse(
        change_request_id=cr.id,
        request_type=cr.request_type,
        doa_id=cr.doa_id,
        base_version=cr.base_version,
        current_doa_version=live_ver,
        is_stale=is_stale,
        diffs=diffs
    )

# =========================================================================
# A19 & A20: GOVERNANCE ACTIONS (COMMENT, CLARIFICATION, TAG, RE-ROUTE, ESCALATE, CONTROLLED PUBLISH)
# =========================================================================

@router.post("/requests/{cr_id}/comment", response_model=ChangeRequestRead)
def add_governance_comment(
    cr_id: str,
    payload: GovernanceActionPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_governance_role)
):
    """A19: Add governance review comment and record in immutable audit log."""
    cr = change_request_service.get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    comment_text = payload.comment or payload.reason or "Governance review comment added."
    cr.decision_comment = f"[Governance - {current_user.full_name}]: {comment_text}"
    db.flush()

    change_request_service.log_audit(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        action="GOVERNANCE_COMMENT",
        entity="CHANGE_REQUEST",
        record_id=cr.id,
        old_value=None,
        new_value={"decision_comment": cr.decision_comment},
        comment=comment_text
    )
    db.commit()
    db.refresh(cr)
    return format_cr_response(cr)

@router.post("/requests/{cr_id}/clarification", response_model=ChangeRequestRead)
def request_governance_clarification(
    cr_id: str,
    payload: GovernanceActionPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_governance_role)
):
    """A19: Request clarification on change request, moving status to CLARIFICATION_REQUIRED."""
    cr = change_request_service.get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    old_status = cr.status
    cr.status = "CLARIFICATION_REQUIRED"
    comment_text = payload.comment or payload.reason or "Clarification required by Governance Team."
    cr.decision_comment = f"[Clarification Requested by {current_user.full_name}]: {comment_text}"
    db.flush()

    change_request_service.log_audit(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        action="GOVERNANCE_CLARIFICATION_REQUESTED",
        entity="CHANGE_REQUEST",
        record_id=cr.id,
        old_value={"status": old_status},
        new_value={"status": cr.status, "decision_comment": cr.decision_comment},
        comment=comment_text
    )
    db.commit()
    db.refresh(cr)
    return format_cr_response(cr)

@router.post("/requests/{cr_id}/tag", response_model=ChangeRequestRead)
def tag_governance_stakeholders(
    cr_id: str,
    payload: GovernanceActionPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_governance_role)
):
    """A19: Tag stakeholders (e.g. Board Audit Committee, Compliance Head, Risk Head) on a Change Request."""
    cr = change_request_service.get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    stakeholders = payload.stakeholders or []
    stakeholder_str = ", ".join(stakeholders)
    tag_comment = f"[Stakeholders Tagged by {current_user.full_name}]: {stakeholder_str}"
    
    # Append or update decision comment
    if cr.decision_comment:
        cr.decision_comment += f" | {tag_comment}"
    else:
        cr.decision_comment = tag_comment

    db.flush()

    change_request_service.log_audit(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        action="STAKEHOLDERS_TAGGED",
        entity="CHANGE_REQUEST",
        record_id=cr.id,
        old_value=None,
        new_value={"tagged_stakeholders": stakeholders},
        comment=f"Tagged stakeholders: {stakeholder_str}"
    )
    db.commit()
    db.refresh(cr)
    return format_cr_response(cr)

@router.post("/requests/{cr_id}/reroute", response_model=ChangeRequestRead)
def reroute_change_request(
    cr_id: str,
    payload: GovernanceActionPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_governance_role)
):
    """A19: Re-route request to a specific governance body or committee."""
    cr = change_request_service.get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    target = payload.target_committee or "Board Audit Committee"
    reroute_comment = f"[Re-routed to {target} by {current_user.full_name}]: {payload.reason or 'Workflow re-assignment'}"
    cr.status = "UNDER_REVIEW"
    cr.decision_comment = reroute_comment
    db.flush()

    change_request_service.log_audit(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        action="GOVERNANCE_REROUTE",
        entity="CHANGE_REQUEST",
        record_id=cr.id,
        old_value=None,
        new_value={"target_committee": target, "status": cr.status},
        comment=reroute_comment
    )
    db.commit()
    db.refresh(cr)
    return format_cr_response(cr)

@router.post("/requests/{cr_id}/escalate", response_model=ChangeRequestRead)
def escalate_change_request(
    cr_id: str,
    payload: GovernanceActionPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_governance_role)
):
    """A19: Escalate request to DOA Administrator or Executive Committee."""
    cr = change_request_service.get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    escalate_comment = f"[ESCALATED by {current_user.full_name}]: {payload.reason or 'Urgent governance escalation'}"
    cr.status = "UNDER_REVIEW"
    cr.decision_comment = escalate_comment
    db.flush()

    change_request_service.log_audit(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        action="GOVERNANCE_ESCALATE",
        entity="CHANGE_REQUEST",
        record_id=cr.id,
        old_value=None,
        new_value={"status": cr.status, "escalation": True},
        comment=escalate_comment
    )
    db.commit()
    db.refresh(cr)
    return format_cr_response(cr)

@router.post("/requests/{cr_id}/publish", response_model=ChangeRequestRead)
def controlled_publish_governance(
    cr_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_governance_role)
):
    """
    A20: Controlled Publication by Governance Team / DOA Administrator.
    - Verifies required workflow step: status must be APPROVED.
    - Validates base_version against active DOA record (optimistic concurrency).
    - Publishes to live DOA master table, increments version (v1 -> v2), snapshots previous version.
    - Logs immutable audit trail.
    """
    cr = change_request_service.publish_change_request(db, cr_id, current_user)
    return format_cr_response(cr)

