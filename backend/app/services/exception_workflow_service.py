import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.database.models import User, DOARecord, ChangeRequest
from app.database.supplementary_models import ExceptionRequest, AuthoritativeSource, DecisionAreaSourceLink
from app.schemas.supplementary_schemas import (
    ExceptionCreateRequest,
    ExceptionActionRequest,
    ExceptionResponse
)
from app.services.audit_service import log_audit

def generate_exception_id(db: Session) -> str:
    count = db.query(ExceptionRequest).count() + 1
    return f"EXC-{count:04d}"

def create_exception_request(
    db: Session,
    payload: ExceptionCreateRequest,
    current_user: User
) -> ExceptionRequest:
    """
    BRD Section 4.3 Exception Workflow:
    Triggered when a proposed decision area cannot comply with one or more validation principles
    because of a regulatory or documented business requirement.
    """
    exc_id = generate_exception_id(db)

    # Resolve reporting manager from User profile or HREmployee
    reporting_mgr_email = getattr(current_user, "reports_to", None) or "manager@doa.local"

    init_decision_history = [
        {
            "stage": "SUBMITTED",
            "actor_email": current_user.email,
            "action": "INITIATE_EXCEPTION",
            "comment": payload.rationale,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    ]

    exc = ExceptionRequest(
        id=exc_id,
        change_request_id=payload.change_request_id,
        doa_id=payload.doa_id,
        requester_id=current_user.id,
        requester_email=current_user.email,
        exception_type=payload.exception_type,
        deviated_principles=json.dumps(payload.deviated_principles),
        rationale=payload.rationale,
        supporting_documents=json.dumps(payload.supporting_documents or []),
        current_stage="PENDING_REPORTING_MGR",
        status="SUBMITTED",
        reporting_mgr_email=reporting_mgr_email,
        effective_date=payload.proposed_effective_date or "2026-01-01",
        review_date=payload.review_date or "2027-01-01",
        decision_history=json.dumps(init_decision_history),
        created_at=datetime.now(timezone.utc)
    )
    db.add(exc)
    db.flush()

    log_audit(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        action="SUBMIT_EXCEPTION_REQUEST",
        entity="EXCEPTION_REQUEST",
        record_id=exc.id,
        new_value={
            "exception_type": exc.exception_type,
            "deviated_principles": payload.deviated_principles,
            "rationale": exc.rationale
        },
        comment=f"Exception {exc.id} submitted for principles {payload.deviated_principles}"
    )

    db.commit()
    db.refresh(exc)
    return exc

def process_exception_action(
    db: Session,
    exception_id: str,
    action_data: ExceptionActionRequest,
    current_user: User
) -> ExceptionRequest:
    """
    BRD Section 4.3 Multi-Stage Exception Route:
    Stage 1: Reporting Manager (Approve -> Division Head, Amend, Return)
    Stage 2: Division Head (Approve -> Governance Team, Amend, Return)
    Stage 3: Governance Team Senior Reviewer (Approve / Reject / Return)
    """
    exc = db.query(ExceptionRequest).filter(ExceptionRequest.id == exception_id).first()
    if not exc:
        raise HTTPException(status_code=404, detail=f"Exception Request {exception_id} not found")

    if not action_data.comment or not action_data.comment.strip():
        raise HTTPException(status_code=400, detail="Mandatory rationale must be recorded at every exception stage.")

    history = json.loads(exc.decision_history or "[]")
    now_iso = datetime.now(timezone.utc).isoformat()

    # Stage 1: Reporting Manager
    if exc.current_stage == "PENDING_REPORTING_MGR":
        exc.reporting_mgr_id = current_user.id
        exc.reporting_mgr_email = current_user.email
        exc.reporting_mgr_decision = action_data.action
        exc.reporting_mgr_rationale = action_data.comment
        exc.reporting_mgr_decided_at = datetime.now(timezone.utc)

        if action_data.action == "APPROVE":
            exc.current_stage = "PENDING_DIVISION_HEAD"
            exc.status = "IN_REVIEW"
            exc.division_head_email = "division.head@doa.local" # default division head
            history.append({
                "stage": "REPORTING_MGR_APPROVED",
                "actor_email": current_user.email,
                "action": "APPROVE",
                "comment": action_data.comment,
                "timestamp": now_iso
            })
        elif action_data.action == "RETURN":
            exc.current_stage = "RETURNED_TO_REQUESTER"
            exc.status = "RETURNED"
            history.append({
                "stage": "REPORTING_MGR_RETURNED",
                "actor_email": current_user.email,
                "action": "RETURN",
                "comment": action_data.comment,
                "timestamp": now_iso
            })
        elif action_data.action == "AMEND":
            history.append({
                "stage": "REPORTING_MGR_AMENDED",
                "actor_email": current_user.email,
                "action": "AMEND",
                "comment": action_data.comment,
                "amendments": action_data.amended_payload,
                "timestamp": now_iso
            })
            exc.current_stage = "PENDING_DIVISION_HEAD"
            exc.status = "IN_REVIEW"

    # Stage 2: Division Head
    elif exc.current_stage == "PENDING_DIVISION_HEAD":
        exc.division_head_id = current_user.id
        exc.division_head_email = current_user.email
        exc.division_head_decision = action_data.action
        exc.division_head_rationale = action_data.comment
        exc.division_head_decided_at = datetime.now(timezone.utc)

        if action_data.action == "APPROVE":
            # Section 4.3 rule 6: Governance Team receives it explicitly as an exception approval request
            exc.current_stage = "PENDING_GOVERNANCE"
            exc.status = "IN_REVIEW"
            history.append({
                "stage": "DIVISION_HEAD_APPROVED",
                "actor_email": current_user.email,
                "action": "APPROVE",
                "comment": action_data.comment,
                "timestamp": now_iso
            })
        elif action_data.action == "RETURN":
            exc.current_stage = "RETURNED_TO_REQUESTER"
            exc.status = "RETURNED"
            history.append({
                "stage": "DIVISION_HEAD_RETURNED",
                "actor_email": current_user.email,
                "action": "RETURN",
                "comment": action_data.comment,
                "timestamp": now_iso
            })

    # Stage 3: Governance Team Senior Reviewer
    elif exc.current_stage == "PENDING_GOVERNANCE":
        exc.governance_reviewer_id = current_user.id
        exc.governance_reviewer_email = current_user.email
        exc.governance_decision = action_data.action
        exc.governance_rationale = action_data.comment
        exc.governance_decided_at = datetime.now(timezone.utc)

        if action_data.action == "APPROVE":
            exc.current_stage = "APPROVED"
            exc.status = "APPROVED"
            history.append({
                "stage": "GOVERNANCE_SENIOR_APPROVED",
                "actor_email": current_user.email,
                "action": "APPROVE",
                "comment": action_data.comment,
                "timestamp": now_iso
            })

            # If linked to a DOA record or ChangeRequest, mark it as exceptional
            if exc.doa_id:
                doa = db.query(DOARecord).filter(DOARecord.id == exc.doa_id).first()
                if doa:
                    dev_list = json.loads(exc.deviated_principles)
                    note = f"[Approved Exception {exc.id}: {', '.join(dev_list)}]"
                    doa.comments = (doa.comments or "") + f" {note}"
                    db.flush()

        elif action_data.action == "REJECT":
            exc.current_stage = "REJECTED"
            exc.status = "REJECTED"
            history.append({
                "stage": "GOVERNANCE_REJECTED",
                "actor_email": current_user.email,
                "action": "REJECT",
                "comment": action_data.comment,
                "timestamp": now_iso
            })
        elif action_data.action == "RETURN":
            exc.current_stage = "RETURNED_TO_REQUESTER"
            exc.status = "RETURNED"
            history.append({
                "stage": "GOVERNANCE_RETURNED",
                "actor_email": current_user.email,
                "action": "RETURN",
                "comment": action_data.comment,
                "timestamp": now_iso
            })
    else:
        raise HTTPException(status_code=400, detail=f"Cannot perform action in current stage '{exc.current_stage}'")

    exc.decision_history = json.dumps(history)
    db.flush()

    log_audit(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        action=f"EXCEPTION_{action_data.action}",
        entity="EXCEPTION_REQUEST",
        record_id=exc.id,
        new_value={"stage": exc.current_stage, "status": exc.status, "comment": action_data.comment},
        comment=f"Exception {exc.id} processed: {action_data.action} at stage {exc.current_stage}"
    )

    db.commit()
    db.refresh(exc)
    return exc

def format_exception_response(exc: ExceptionRequest) -> ExceptionResponse:
    return ExceptionResponse(
        id=exc.id,
        change_request_id=exc.change_request_id,
        doa_id=exc.doa_id,
        requester_email=exc.requester_email,
        exception_type=exc.exception_type,
        deviated_principles=json.loads(exc.deviated_principles or "[]"),
        rationale=exc.rationale,
        supporting_documents=json.loads(exc.supporting_documents or "[]"),
        current_stage=exc.current_stage,
        status=exc.status,
        reporting_mgr_email=exc.reporting_mgr_email,
        reporting_mgr_decision=exc.reporting_mgr_decision,
        division_head_email=exc.division_head_email,
        division_head_decision=exc.division_head_decision,
        governance_reviewer_email=exc.governance_reviewer_email,
        governance_decision=exc.governance_decision,
        decision_history=json.loads(exc.decision_history or "[]"),
        created_at=exc.created_at
    )
