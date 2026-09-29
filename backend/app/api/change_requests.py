import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import User, DOARecord, ChangeRequest, Notification
from app.core.dependencies import (
    get_current_user, 
    require_admin, 
    require_approver_or_admin,
    require_requestor,
    require_reviewer
)
from app.schemas.schemas import (
    ChangeRequestCreate,
    ChangeRequestUpdate,
    ChangeRequestRead,
    ActionDecision,
    ReviewerRecommendationPayload,
    ReviewerCommentPayload,
    DiffResponse,
    ClarificationCreate,
    ClarificationRead,
    NotificationRead
)
from app.services import change_request_service, diff_service
from app.services.version_service import record_to_dict

router = APIRouter(prefix="/change-requests", tags=["Change Requests & Governance Queue"])

def format_cr_response(cr) -> ChangeRequestRead:
    clarifications_list = []
    if hasattr(cr, "clarifications") and cr.clarifications:
        for c in cr.clarifications:
            clarifications_list.append(ClarificationRead(
                id=c.id,
                change_request_id=c.change_request_id,
                user_id=c.user_id,
                user_email=c.user_email,
                user_name=c.user_name,
                message_type=c.message_type,
                message=c.message,
                attachments=json.loads(c.attachments) if c.attachments else [],
                created_at=c.created_at
            ))

    return ChangeRequestRead(
        id=cr.id,
        request_type=cr.request_type,
        doa_id=cr.doa_id,
        requester_id=cr.requester_id,
        requester_email=cr.requester_email,
        department=cr.department,
        process=cr.process,
        rationale=cr.rationale,
        currency=getattr(cr, "currency", "USD") or "USD",
        current_limit=getattr(cr, "current_limit", None),
        proposed_limit=getattr(cr, "proposed_limit", None),
        effective_date=getattr(cr, "effective_date", None),
        priority=getattr(cr, "priority", "MEDIUM") or "MEDIUM",
        due_date=getattr(cr, "due_date", None),
        risk_impact=getattr(cr, "risk_impact", None),
        base_version=cr.base_version,
        current_value=json.loads(cr.current_value) if cr.current_value else None,
        proposed_value=json.loads(cr.proposed_value) if cr.proposed_value else {},
        status=cr.status,
        reviewer_id=cr.reviewer_id,
        reviewer_email=cr.reviewer_email,
        reviewed_at=cr.reviewed_at,
        decision_comment=cr.decision_comment,
        reviewer_recommendation=getattr(cr, "reviewer_recommendation", None),
        reviewer_comments=getattr(cr, "reviewer_comments", None),
        operational_comments=getattr(cr, "operational_comments", None),
        operational_impact=getattr(cr, "operational_impact", None),
        attachments=json.loads(cr.attachments) if getattr(cr, "attachments", None) else [],
        clarifications=clarifications_list,
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
    List change requests.
    Elevated roles (Admin/Reviewer) see all change requests.
    Requestors see only their requests.
    """
    is_elevated = (
        current_user.role in ["ADMIN", "SYSTEM_ADMINISTRATOR", "DOA_ADMINISTRATOR", "GOVERNANCE_TEAM"] or
        current_user.persona_type in ["APPROVER", "REVIEWER", "AUDIT_READONLY"] or
        getattr(current_user, "can_review", False)
    )
    crs = change_request_service.get_change_requests(
        db=db,
        status_filter=status_filter,
        user_id=current_user.id,
        is_admin=is_elevated
    )
    return [format_cr_response(cr) for cr in crs]

@router.get("/my-requests", response_model=List[ChangeRequestRead])
def get_my_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_requestor)
):
    """Fetch change requests and drafts authored by the current requestor."""
    crs = change_request_service.get_change_requests(
        db=db,
        status_filter=status_filter,
        user_id=current_user.id,
        is_admin=False
    )
    return [format_cr_response(cr) for cr in crs]

@router.get("/review-queue", response_model=List[ChangeRequestRead])
def get_reviewer_queue(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    """
    Reviewer Queue: incoming and reviewable requests.
    CRITICAL SoD: Excludes requests authored by the current reviewer!
    """
    crs = change_request_service.get_reviewer_queue(
        db=db,
        reviewer_user=current_user,
        status_filter=status_filter
    )
    return [format_cr_response(cr) for cr in crs]

@router.get("/notifications", response_model=List[NotificationRead])
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get active notifications for current user."""
    notifs = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).limit(20).all()
    return notifs

@router.post("/notifications/{notif_id}/read")
def mark_notification_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == current_user.id).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"status": "success"}

@router.get("/{cr_id}", response_model=ChangeRequestRead)
def get_change_request(
    cr_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cr = change_request_service.get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")
        
    is_elevated = (
        current_user.role in ["ADMIN", "SYSTEM_ADMINISTRATOR", "DOA_ADMINISTRATOR", "GOVERNANCE_TEAM"] or
        current_user.persona_type in ["APPROVER", "REVIEWER", "AUDIT_READONLY"] or
        getattr(current_user, "can_review", False)
    )
    if not is_elevated and cr.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to view this request")
        
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
    """
    cr = change_request_service.get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")
        
    is_elevated = (
        current_user.role in ["ADMIN", "SYSTEM_ADMINISTRATOR", "DOA_ADMINISTRATOR", "GOVERNANCE_TEAM"] or
        current_user.persona_type in ["APPROVER", "REVIEWER", "AUDIT_READONLY"] or
        getattr(current_user, "can_review", False)
    )
    if not is_elevated and cr.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

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

@router.post("", response_model=ChangeRequestRead)
def create_change_request(
    payload: ChangeRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_requestor)
):
    """Create and submit a new Change Request (ADD, MODIFY, DELETE)."""
    cr = change_request_service.create_change_request(db, payload, current_user, as_draft=False)
    return format_cr_response(cr)

@router.post("/draft", response_model=ChangeRequestRead)
def create_or_save_draft(
    payload: ChangeRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_requestor)
):
    """Save proposal as a DRAFT."""
    cr = change_request_service.create_change_request(db, payload, current_user, as_draft=True)
    return format_cr_response(cr)

@router.put("/{cr_id}", response_model=ChangeRequestRead)
def update_change_request(
    cr_id: str,
    payload: ChangeRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_requestor)
):
    """Modify a request in DRAFT or CLARIFICATION_REQUIRED status."""
    update_dict = payload.model_dump(exclude_unset=True)
    cr = change_request_service.update_change_request(db, cr_id, update_dict, current_user)
    return format_cr_response(cr)

@router.post("/{cr_id}/submit", response_model=ChangeRequestRead)
def submit_draft(
    cr_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_requestor)
):
    """Promote a DRAFT to SUBMITTED status."""
    cr = change_request_service.submit_draft_request(db, cr_id, current_user)
    return format_cr_response(cr)

@router.delete("/{cr_id}/draft")
def delete_draft(
    cr_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_requestor)
):
    """Delete a DRAFT request (permitted only for draft authors)."""
    change_request_service.delete_draft_request(db, cr_id, current_user)
    return {"status": "success", "message": f"Draft {cr_id} successfully deleted"}

# --- Reviewer Actions ---

@router.post("/{cr_id}/start-review", response_model=ChangeRequestRead)
def start_review(
    cr_id: str,
    db: Session = Depends(get_db),
    reviewer_user: User = Depends(require_reviewer)
):
    """Assigns reviewer and moves status from SUBMITTED to UNDER_REVIEW."""
    cr = change_request_service.start_review(db, cr_id, reviewer_user)
    return format_cr_response(cr)

@router.post("/{cr_id}/clarification", response_model=ChangeRequestRead)
def request_clarification(
    cr_id: str,
    payload: ClarificationCreate,
    db: Session = Depends(get_db),
    reviewer_user: User = Depends(require_reviewer)
):
    """Reviewer requests clarification from requestor (status -> CLARIFICATION_REQUIRED)."""
    cr = change_request_service.request_clarification(
        db=db,
        cr_id=cr_id,
        message=payload.message,
        attachments=payload.attachments,
        reviewer_user=reviewer_user
    )
    return format_cr_response(cr)

@router.post("/{cr_id}/respond-clarification", response_model=ChangeRequestRead)
def respond_clarification(
    cr_id: str,
    payload: ClarificationCreate,
    db: Session = Depends(get_db),
    requestor_user: User = Depends(require_requestor)
):
    """Requestor responds to a clarification inquiry (status -> UNDER_REVIEW)."""
    cr = change_request_service.respond_clarification(
        db=db,
        cr_id=cr_id,
        message=payload.message,
        attachments=payload.attachments,
        requestor_user=requestor_user
    )
    return format_cr_response(cr)

@router.post("/{cr_id}/comment", response_model=ChangeRequestRead)
def add_reviewer_comment(
    cr_id: str,
    payload: ReviewerCommentPayload,
    db: Session = Depends(get_db),
    reviewer_user: User = Depends(require_reviewer)
):
    """Reviewer adds notes, feedback, and operational comments on the change request."""
    cr = change_request_service.add_review_comment(
        db=db,
        cr_id=cr_id,
        comment=payload.comment,
        operational_comments=payload.operational_comments,
        reviewer_user=reviewer_user
    )
    return format_cr_response(cr)

@router.post("/{cr_id}/recommend", response_model=ChangeRequestRead)
def submit_reviewer_recommendation(
    cr_id: str,
    payload: ReviewerRecommendationPayload,
    db: Session = Depends(get_db),
    reviewer_user: User = Depends(require_reviewer)
):
    """
    Reviewer submits formal recommendation (Recommend Approval or Recommend Rejection)
    with notes and operational comments to guide the final executive approver.
    """
    cr = change_request_service.submit_recommendation(
        db=db,
        cr_id=cr_id,
        recommendation=payload.recommendation,
        notes=payload.notes,
        operational_comments=payload.operational_comments,
        reviewer_user=reviewer_user
    )
    return format_cr_response(cr)

@router.post("/{cr_id}/approve", response_model=ChangeRequestRead)
def approve_change_request(
    cr_id: str,
    decision: ActionDecision,
    db: Session = Depends(get_db),
    reviewer_user: User = Depends(require_reviewer)
):
    """
    Approve change request.
    BACKEND ENFORCES SEGREGATION OF DUTIES:
    Reviewer/Approver CANNOT approve their own request!
    """
    cr = change_request_service.approve_change_request(db, cr_id, decision, reviewer_user)
    return format_cr_response(cr)

@router.post("/{cr_id}/reject", response_model=ChangeRequestRead)
def reject_change_request(
    cr_id: str,
    decision: ActionDecision,
    db: Session = Depends(get_db),
    reviewer_user: User = Depends(require_reviewer)
):
    """
    Reject change request.
    BACKEND ENFORCES SEGREGATION OF DUTIES:
    Reviewer/Approver CANNOT reject their own request!
    """
    cr = change_request_service.reject_change_request(db, cr_id, decision, reviewer_user)
    return format_cr_response(cr)

@router.post("/{cr_id}/publish", response_model=ChangeRequestRead)
def publish_change_request(
    cr_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Admin-only publishing of an APPROVED Change Request.
    Enforces optimistic concurrency (409 Conflict if stale version).
    Creates v(n+1) master version, sets v(n) to HISTORICAL.
    """
    cr = change_request_service.publish_change_request(db, cr_id, admin_user)
    return format_cr_response(cr)

