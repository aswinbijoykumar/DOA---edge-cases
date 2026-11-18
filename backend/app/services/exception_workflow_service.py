import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.database.models import User, DOARecord, ChangeRequest
from app.database.supplementary_models import ExceptionRequest, AuthoritativeSource, DecisionAreaSourceLink
from app.core.rbac import (
    assert_domain_write_access,
    assert_entity_write_access,
    assert_exception_stage_actor,
    get_user_permissions,
)
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
    Enforces CRUD/proposal permission, domain scope, and entity write scope.
    """
    perms = get_user_permissions(current_user)
    if not perms["can_raise_exception"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"CRUD Violation: Role '{current_user.role}' / Persona '{perms['persona_type']}' is not authorized to submit exception requests."
        )

    target_doa_id = payload.doa_id or payload.decision_area_id
    if target_doa_id:
        doa_rec = db.query(DOARecord).filter(DOARecord.id == target_doa_id).first()
        if doa_rec:
            assert_domain_write_access(doa_rec.parent_function or doa_rec.function, current_user)
            assert_entity_write_access(getattr(doa_rec, "entity_id", None) or payload.entity, current_user)
    elif payload.entity:
        assert_entity_write_access(payload.entity, current_user)

    principles = payload.deviated_principles if payload.deviated_principles is not None else (payload.deviated_validation_rules or [])
    final_rationale = (payload.rationale or payload.regulatory_or_business_rationale or "").strip()
    if not final_rationale:
        raise HTTPException(status_code=400, detail="Mandatory regulatory or business rationale is required to submit an exception request.")

    raw_docs = payload.supporting_documents
    if raw_docs is None and payload.supporting_evidence_files:
        raw_docs = [
            f if isinstance(f, dict) else {"name": str(f)}
            for f in payload.supporting_evidence_files
        ]

    exc_id = generate_exception_id(db)
    reporting_mgr_email = (
        payload.reporting_manager_email
        or getattr(current_user, "reports_to", None)
        or "dept.owner@doa.local"
    )
    division_head_email = payload.division_head_email or "approver@doa.local"

    init_decision_history = [
        {
            "stage": "SUBMITTED",
            "actor_email": current_user.email,
            "action": "INITIATE_EXCEPTION",
            "comment": final_rationale,
            "decision_area_title": payload.decision_area_title,
            "entity": payload.entity or perms["entity_id"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    ]

    exc = ExceptionRequest(
        id=exc_id,
        change_request_id=payload.change_request_id,
        doa_id=target_doa_id,
        requester_id=current_user.id,
        requester_email=current_user.email,
        exception_type=payload.exception_type,
        deviated_principles=json.dumps(principles),
        rationale=final_rationale,
        supporting_documents=json.dumps(raw_docs or []),
        current_stage="PENDING_REPORTING_MGR",
        status="SUBMITTED",
        reporting_mgr_email=reporting_mgr_email,
        division_head_email=division_head_email,
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
            "deviated_principles": principles,
            "rationale": exc.rationale
        },
        comment=f"Exception {exc.id} submitted for principles {principles}"
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
    Strictly enforces stage actor authorization and Segregation of Duties.
    """
    exc = db.query(ExceptionRequest).filter(ExceptionRequest.id == exception_id).first()
    if not exc:
        raise HTTPException(status_code=404, detail=f"Exception Request {exception_id} not found")

    action_upper = (action_data.action or "").strip().upper()
    if action_upper not in ["APPROVE", "RETURN", "AMEND", "REJECT"]:
        raise HTTPException(status_code=400, detail=f"Invalid exception action '{action_data.action}'")

    # Enforce BRD Section 4.3 stage actor & Segregation of Duties
    assert_exception_stage_actor(exc, current_user, action_upper)

    comment_text = action_data.final_comment
    if not comment_text or not comment_text.strip():
        raise HTTPException(status_code=400, detail="Mandatory rationale must be recorded at every exception stage.")

    history = json.loads(exc.decision_history or "[]")
    now_iso = datetime.now(timezone.utc).isoformat()

    # Stage 1: Reporting Manager
    if exc.current_stage == "PENDING_REPORTING_MGR":
        exc.reporting_mgr_id = current_user.id
        exc.reporting_mgr_email = current_user.email
        exc.reporting_mgr_decision = action_upper
        exc.reporting_mgr_rationale = comment_text
        exc.reporting_mgr_decided_at = datetime.now(timezone.utc)

        if action_upper == "APPROVE":
            exc.current_stage = "PENDING_DIVISION_HEAD"
            exc.status = "IN_REVIEW"
            if not exc.division_head_email:
                exc.division_head_email = "approver@doa.local"
            history.append({
                "stage": "REPORTING_MGR_APPROVED",
                "actor_email": current_user.email,
                "action": "APPROVE",
                "comment": comment_text,
                "timestamp": now_iso
            })
        elif action_upper == "RETURN":
            exc.current_stage = "RETURNED_TO_REQUESTER"
            exc.status = "RETURNED"
            history.append({
                "stage": "REPORTING_MGR_RETURNED",
                "actor_email": current_user.email,
                "action": "RETURN",
                "comment": comment_text,
                "timestamp": now_iso
            })
        elif action_upper == "AMEND":
            history.append({
                "stage": "REPORTING_MGR_AMENDED",
                "actor_email": current_user.email,
                "action": "AMEND",
                "comment": comment_text,
                "amendments": action_data.amended_payload,
                "timestamp": now_iso
            })
            exc.current_stage = "PENDING_DIVISION_HEAD"
            exc.status = "IN_REVIEW"
        elif action_upper == "REJECT":
            exc.current_stage = "REJECTED"
            exc.status = "REJECTED"
            history.append({
                "stage": "REPORTING_MGR_REJECTED",
                "actor_email": current_user.email,
                "action": "REJECT",
                "comment": comment_text,
                "timestamp": now_iso
            })

    # Stage 2: Division Head
    elif exc.current_stage == "PENDING_DIVISION_HEAD":
        exc.division_head_id = current_user.id
        exc.division_head_email = current_user.email
        exc.division_head_decision = action_upper
        exc.division_head_rationale = comment_text
        exc.division_head_decided_at = datetime.now(timezone.utc)

        if action_upper == "APPROVE":
            exc.current_stage = "PENDING_GOVERNANCE"
            exc.status = "IN_REVIEW"
            history.append({
                "stage": "DIVISION_HEAD_APPROVED",
                "actor_email": current_user.email,
                "action": "APPROVE",
                "comment": comment_text,
                "timestamp": now_iso
            })
        elif action_upper == "AMEND":
            exc.current_stage = "PENDING_GOVERNANCE"
            exc.status = "IN_REVIEW"
            history.append({
                "stage": "DIVISION_HEAD_AMENDED",
                "actor_email": current_user.email,
                "action": "AMEND",
                "comment": comment_text,
                "amendments": action_data.amended_payload,
                "timestamp": now_iso
            })
        elif action_upper == "RETURN":
            exc.current_stage = "RETURNED_TO_REQUESTER"
            exc.status = "RETURNED"
            history.append({
                "stage": "DIVISION_HEAD_RETURNED",
                "actor_email": current_user.email,
                "action": "RETURN",
                "comment": comment_text,
                "timestamp": now_iso
            })
        elif action_upper == "REJECT":
            exc.current_stage = "REJECTED"
            exc.status = "REJECTED"
            history.append({
                "stage": "DIVISION_HEAD_REJECTED",
                "actor_email": current_user.email,
                "action": "REJECT",
                "comment": comment_text,
                "timestamp": now_iso
            })

    # Stage 3: Governance Team Senior Reviewer
    elif exc.current_stage == "PENDING_GOVERNANCE":
        exc.governance_reviewer_id = current_user.id
        exc.governance_reviewer_email = current_user.email
        exc.governance_decision = action_upper
        exc.governance_rationale = comment_text
        exc.governance_decided_at = datetime.now(timezone.utc)

        if action_upper == "APPROVE":
            exc.current_stage = "APPROVED"
            exc.status = "APPROVED"
            history.append({
                "stage": "GOVERNANCE_SENIOR_APPROVED",
                "actor_email": current_user.email,
                "action": "APPROVE",
                "comment": comment_text,
                "timestamp": now_iso
            })

            if exc.doa_id:
                doa = db.query(DOARecord).filter(DOARecord.id == exc.doa_id).first()
                if doa:
                    dev_list = json.loads(exc.deviated_principles or "[]")
                    note = f"[Approved Exception {exc.id}: {', '.join(dev_list)}]"
                    doa.comments = (doa.comments or "") + f" {note}"
                    db.flush()

        elif action_upper == "REJECT":
            exc.current_stage = "REJECTED"
            exc.status = "REJECTED"
            history.append({
                "stage": "GOVERNANCE_REJECTED",
                "actor_email": current_user.email,
                "action": "REJECT",
                "comment": comment_text,
                "timestamp": now_iso
            })
        elif action_upper == "RETURN":
            exc.current_stage = "RETURNED_TO_REQUESTER"
            exc.status = "RETURNED"
            history.append({
                "stage": "GOVERNANCE_RETURNED",
                "actor_email": current_user.email,
                "action": "RETURN",
                "comment": comment_text,
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
        action=f"EXCEPTION_{action_upper}",
        entity="EXCEPTION_REQUEST",
        record_id=exc.id,
        new_value={"stage": exc.current_stage, "status": exc.status, "comment": comment_text},
        comment=f"Exception {exc.id} processed: {action_upper} at stage {exc.current_stage}"
    )

    db.commit()
    db.refresh(exc)
    return exc


def format_exception_response(exc: ExceptionRequest) -> ExceptionResponse:
    principles = json.loads(exc.deviated_principles or "[]")
    history = json.loads(exc.decision_history or "[]")
    title = None
    entity_val = None
    if history and isinstance(history[0], dict):
        title = history[0].get("decision_area_title")
        entity_val = history[0].get("entity")

    return ExceptionResponse(
        id=exc.id,
        change_request_id=exc.change_request_id,
        doa_id=exc.doa_id,
        decision_area_title=title,
        entity=entity_val,
        requester_email=exc.requester_email,
        exception_type=exc.exception_type,
        deviated_principles=principles,
        deviated_validation_rules=principles,
        rationale=exc.rationale,
        regulatory_or_business_rationale=exc.rationale,
        supporting_documents=json.loads(exc.supporting_documents or "[]"),
        current_stage=exc.current_stage,
        status=exc.status,
        reporting_mgr_email=exc.reporting_mgr_email,
        reporting_mgr_decision=exc.reporting_mgr_decision,
        division_head_email=exc.division_head_email,
        division_head_decision=exc.division_head_decision,
        governance_reviewer_email=exc.governance_reviewer_email,
        governance_decision=exc.governance_decision,
        decision_history=history,
        created_at=exc.created_at
    )
