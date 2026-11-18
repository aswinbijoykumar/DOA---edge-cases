import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import User, DOARecord
from app.core.dependencies import get_current_user, require_publisher, require_approver_or_admin
from app.core.rbac import assert_can_view_change_request
from app.schemas.schemas import (
    ChangeRequestCreate,
    ChangeRequestRead,
    ActionDecision,
    DiffResponse
)
from app.services import change_request_service, diff_service
from app.services.version_service import record_to_dict

router = APIRouter(prefix="/change-requests", tags=["Change Requests & Governance Queue"])

def format_cr_response(cr) -> ChangeRequestRead:
    return ChangeRequestRead(
        id=cr.id,
        request_type=cr.request_type,
        doa_id=cr.doa_id,
        requester_id=cr.requester_id,
        requester_email=cr.requester_email,
        department=cr.department,
        process=cr.process,
        rationale=cr.rationale,
        base_version=cr.base_version,
        current_value=json.loads(cr.current_value) if cr.current_value else None,
        proposed_value=json.loads(cr.proposed_value) if cr.proposed_value else {},
        status=cr.status,
        entity_id=getattr(cr, "entity_id", "ENT-BH-01"),
        classification=getattr(cr, "classification", "Board-level DOA"),
        exception_id=getattr(cr, "exception_id", None),
        reviewer_id=cr.reviewer_id,
        reviewer_email=cr.reviewer_email,
        reviewed_at=cr.reviewed_at,
        decision_comment=cr.decision_comment,
        operational_impact=getattr(cr, "operational_impact", None),
        attachments=json.loads(cr.attachments) if getattr(cr, "attachments", None) else [],
        created_at=cr.created_at,
        submitted_at=cr.submitted_at,
        published_at=cr.published_at
    )

@router.get("", response_model=List[ChangeRequestRead])
def list_change_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List change requests scoped strictly to current_user's role, persona, and domain:
    - Oversight / Governance / Audit / Reviewer / Approver / Authority Owner: authorized domains
    - Dept Owner / Process Owner: own requests + requests in their department/domain
    - Requester: strictly own submitted requests
    """
    crs = change_request_service.get_change_requests(
        db=db,
        status_filter=status_filter,
        user_id=current_user.id,
        is_admin=False,
        current_user=current_user
    )
    return [format_cr_response(cr) for cr in crs]

@router.get("/{cr_id}", response_model=ChangeRequestRead)
def get_change_request(
    cr_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cr = change_request_service.get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")
        
    assert_can_view_change_request(db, cr, current_user)
    return format_cr_response(cr)


@router.get("/{cr_id}/diff", response_model=DiffResponse)
def get_change_request_diff(
    cr_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Diff Engine: Field-by-field comparison of Current Value vs Proposed Value.
    Marks changes as ADDED, MODIFIED, REMOVED, UNCHANGED.
    Also flags whether the base_version is stale compared to active DOA record.
    """
    cr = change_request_service.get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")
        
    assert_can_view_change_request(db, cr, current_user)

    current_val = json.loads(cr.current_value) if cr.current_value else {}
    proposed_val = json.loads(cr.proposed_value) if cr.proposed_value else {}

    # Check live target DOA if exists
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

@router.post("", response_model=ChangeRequestRead)
def create_change_request(
    payload: ChangeRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create and submit a new Change Request (ADD, MODIFY, DELETE) subject to RBAC & entity scoping."""
    cr = change_request_service.create_change_request(db, payload, current_user)
    return format_cr_response(cr)

@router.post("/{cr_id}/approve", response_model=ChangeRequestRead)
def approve_change_request(
    cr_id: str,
    decision: ActionDecision,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_approver_or_admin)
):
    """Executive Approver and DOA Admin approval of a Change Request (subject to VAL-06 SoD)."""
    cr = change_request_service.approve_change_request(db, cr_id, decision, admin_user)
    return format_cr_response(cr)

@router.post("/{cr_id}/reject", response_model=ChangeRequestRead)
def reject_change_request(
    cr_id: str,
    decision: ActionDecision,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_approver_or_admin)
):
    """Executive Approver and DOA Admin rejection of a Change Request (subject to VAL-06 SoD)."""
    cr = change_request_service.reject_change_request(db, cr_id, decision, admin_user)
    return format_cr_response(cr)

@router.post("/{cr_id}/publish", response_model=ChangeRequestRead)
def publish_change_request(
    cr_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_publisher)
):
    """
    Controlled publishing of an APPROVED Change Request by Publication Owner (DOA Admin / Governance Team).
    Enforces VAL-06 SoD and optimistic concurrency (409 Conflict if stale version).
    """
    cr = change_request_service.publish_change_request(db, cr_id, admin_user)
    return format_cr_response(cr)
