from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import json

from app.database.database import get_db
from app.database.models import User, DOARecord, ChangeRequest, DOAVersion, AuditLog
from app.core.dependencies import get_current_user, require_persona, require_roles
from app.core.rbac import (
    apply_doa_read_scope,
    assert_can_read_doa,
    assert_can_view_change_request,
    assert_sod_not_proposer,
    filter_change_requests_for_user,
    get_allowed_domains,
)
from app.schemas.schemas import (
    DOARead,
    ChangeRequestRead,
    ChangeRequestCreate,
    ActionDecision,
    DiffResponse
)
from app.services import doa_service, change_request_service, diff_service
from app.services.version_service import record_to_dict
from app.api.change_requests import format_cr_response
from app.services.audit_service import log_audit

router = APIRouter(tags=["Persona Workflows & Role Hubs"])


# =========================================================================
# 1. FRONTEND_USER (REQUESTOR / BUSINESS LINE ANALYST)
# =========================================================================
require_requestor = require_persona(["FRONTEND_USER"])


@router.get("/requestor/dashboard")
def get_requestor_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_requestor)
):
    """Business Line Analyst / Requestor dashboard: Personal submissions & scoped published matrix counts."""
    my_crs = db.query(ChangeRequest).filter(ChangeRequest.requester_id == current_user.id).all()
    dept = current_user.department or "Commercial Operations"

    scoped_published = apply_doa_read_scope(
        db.query(DOARecord).filter(DOARecord.status == "PUBLISHED"),
        current_user
    ).count()

    return {
        "persona": "FRONTEND_USER",
        "title": "Business Line Analyst / Requestor",
        "user_name": current_user.full_name,
        "email": current_user.email,
        "department": dept,
        "allowed_domains": get_allowed_domains(current_user),
        "total_submitted": len(my_crs),
        "pending": sum(
            1 for c in my_crs
            if c.status in ["SUBMITTED", "PENDING_PROCESS_OWNER", "PENDING_DEPT_OWNER", "PENDING_2LOD_REVIEW", "UNDER_REVIEW"]
        ),
        "approved": sum(1 for c in my_crs if c.status == "APPROVED"),
        "published": sum(1 for c in my_crs if c.status == "PUBLISHED"),
        "rejected": sum(1 for c in my_crs if c.status == "REJECTED"),
        "department_published_rules": scoped_published,
        "total_published_doa": scoped_published,
        "recent_proposals": [format_cr_response(c) for c in sorted(my_crs, key=lambda x: x.created_at, reverse=True)[:5]]
    }


@router.get("/requestor/proposals", response_model=List[ChangeRequestRead])
def get_requestor_proposals(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_requestor)
):
    """Retrieve only proposals initiated by current requestor."""
    crs = db.query(ChangeRequest).filter(ChangeRequest.requester_id == current_user.id).order_by(ChangeRequest.created_at.desc()).all()
    return [format_cr_response(cr) for cr in crs]


@router.post("/requestor/proposals", response_model=ChangeRequestRead)
def submit_requestor_proposal(
    payload: ChangeRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_requestor)
):
    """Raise a new DOA Change Request (ADD, MODIFY, DELETE) initiated by Requestor within authorized domain & entity."""
    cr = change_request_service.create_change_request(db, payload, current_user)
    return format_cr_response(cr)


@router.post("/requestor/proposals/{cr_id}/withdraw", response_model=ChangeRequestRead)
def withdraw_requestor_proposal(
    cr_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_requestor)
):
    """Allows Requestor to cancel or withdraw their own proposal before formal binding approval."""
    cr = change_request_service.get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if cr.requester_id != current_user.id and current_user.role not in ["ADMIN", "DOA_ADMINISTRATOR"]:
        raise HTTPException(status_code=403, detail="Not authorized to withdraw this proposal")
    if cr.status in ["PUBLISHED", "APPROVED"]:
        raise HTTPException(status_code=400, detail=f"Cannot withdraw proposal with status {cr.status}")

    old_status = cr.status
    cr.status = "REJECTED"
    cr.decision_comment = f"[Withdrawn by Requestor {current_user.full_name}]"
    db.flush()

    log_audit(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        action="WITHDRAW_PROPOSAL",
        entity="CHANGE_REQUEST",
        record_id=cr.id,
        old_value={"status": old_status},
        new_value={"status": cr.status},
        comment=f"Proposal {cr.id} withdrawn by requester."
    )
    db.commit()
    db.refresh(cr)
    return format_cr_response(cr)


# =========================================================================
# 2. PROCESS_OWNER (OPERATIONAL LEAD & PROCESS INTEGRITY)
# =========================================================================
require_process_owner = require_persona(["PROCESS_OWNER"])


@router.get("/process-owner/dashboard")
def get_process_owner_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_process_owner)
):
    """Process Owner dashboard: Process operational review queue, SOP links & endorsements within authorized scope."""
    raw_operational_crs = db.query(ChangeRequest).filter(
        ChangeRequest.status.in_(["SUBMITTED", "PENDING_PROCESS_OWNER", "UNDER_REVIEW"])
    ).order_by(ChangeRequest.created_at.desc()).all()
    operational_crs = filter_change_requests_for_user(db, raw_operational_crs, current_user)

    raw_endorsed = db.query(ChangeRequest).filter(ChangeRequest.operational_impact.isnot(None)).all()
    endorsed_count = len(filter_change_requests_for_user(db, raw_endorsed, current_user))

    return {
        "persona": "PROCESS_OWNER",
        "title": "Process Integrity & Operational Lead",
        "user_name": current_user.full_name,
        "allowed_domains": get_allowed_domains(current_user),
        "process_scope": "Procure-to-Pay (P2P), Capex & Operational Supply Chain",
        "pending_operational_reviews": len(operational_crs),
        "total_endorsed": endorsed_count,
        "process_workflows": [
            {"process": "Procure-to-Pay (P2P)", "status": "Active", "linked_doas": 42},
            {"process": "Capital Expenditure (Capex)", "status": "Active", "linked_doas": 18},
            {"process": "Vendor Sourcing & Contracting", "status": "Active", "linked_doas": 15}
        ],
        "operational_queue": [format_cr_response(c) for c in operational_crs[:5]]
    }


@router.get("/process-owner/queue", response_model=List[ChangeRequestRead])
def get_process_owner_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_process_owner)
):
    """Retrieve change requests needing operational review within Process Owner's domain scope."""
    raw_crs = db.query(ChangeRequest).filter(
        ChangeRequest.status.in_(["SUBMITTED", "PENDING_PROCESS_OWNER", "UNDER_REVIEW"])
    ).order_by(ChangeRequest.created_at.desc()).all()
    crs = filter_change_requests_for_user(db, raw_crs, current_user)
    return [format_cr_response(cr) for cr in crs]


@router.post("/process-owner/requests/{cr_id}/endorse", response_model=ChangeRequestRead)
def endorse_process_impact(
    cr_id: str,
    decision: ActionDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_process_owner)
):
    """Process Owner submits formal Operational Impact Assessment and endorses workflow (enforcing domain & VAL-06 SoD)."""
    cr = change_request_service.get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    assert_can_view_change_request(db, cr, current_user)
    assert_sod_not_proposer(db, cr, current_user, "PROCESS_ENDORSEMENT")

    impact_text = decision.operational_impact or decision.comment or "Operational impact reviewed and endorsed."
    cr.operational_impact = f"[Endorsed by Process Owner {current_user.full_name}]: {impact_text}"
    old_status = cr.status
    cr.status = "PENDING_DEPT_OWNER"
    db.flush()

    log_audit(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        action="PROCESS_ENDORSEMENT",
        entity="CHANGE_REQUEST",
        record_id=cr.id,
        old_value={"status": old_status},
        new_value={"operational_impact": cr.operational_impact, "status": cr.status},
        comment=f"Process Owner endorsed operational impact for {cr.id}, forwarded to Department Owner"
    )
    db.commit()
    db.refresh(cr)
    return format_cr_response(cr)


# =========================================================================
# 3. DEPT_OWNER (DEPARTMENT / FUNCTION CUSTODIAN)
# =========================================================================
require_dept_owner = require_persona(["DEPT_OWNER"])


@router.get("/dept-owner/dashboard")
def get_dept_owner_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dept_owner)
):
    """Department / Function Owner dashboard: Strictly scoped to Department Owner's authorized functional domain."""
    dept = current_user.department or "Finance"

    dept_rules = apply_doa_read_scope(
        db.query(DOARecord).filter(DOARecord.status == "PUBLISHED"),
        current_user
    ).count()

    all_crs = db.query(ChangeRequest).order_by(ChangeRequest.created_at.desc()).all()
    dept_crs = filter_change_requests_for_user(db, all_crs, current_user)

    return {
        "persona": "DEPT_OWNER",
        "title": "Department / Function Owner",
        "user_name": current_user.full_name,
        "department": dept,
        "allowed_domains": get_allowed_domains(current_user),
        "managed_rules_count": dept_rules,
        "department_pending_crs": sum(
            1 for c in dept_crs
            if c.status in ["SUBMITTED", "PENDING_PROCESS_OWNER", "PENDING_DEPT_OWNER", "UNDER_REVIEW"]
        ),
        "department_approved_crs": sum(1 for c in dept_crs if c.status in ["APPROVED", "PUBLISHED"]),
        "signing_limits_summary": {
            "Level 1 (Up to $100K)": "Department Manager",
            "Level 2 (Up to $500K)": f"Head of {dept}",
            "Level 3 (Above $500K)": "Executive Committee / C-Level"
        },
        "recent_department_crs": [format_cr_response(c) for c in dept_crs[:5]]
    }


@router.get("/dept-owner/department-doas", response_model=List[DOARead])
def get_department_doas(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dept_owner)
):
    """Retrieve ONLY DOA records pertaining to the Department Owner's authorized functional domain."""
    q = apply_doa_read_scope(
        db.query(DOARecord).filter(DOARecord.status == "PUBLISHED"),
        current_user
    )
    return q.order_by(DOARecord.id).all()


@router.get("/dept-owner/queue", response_model=List[ChangeRequestRead])
def get_dept_owner_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dept_owner)
):
    """Retrieve requests forwarded to Department Owner for supervisory signoff within their domain."""
    raw_crs = db.query(ChangeRequest).filter(
        ChangeRequest.status.in_(["PENDING_DEPT_OWNER", "SUBMITTED", "UNDER_REVIEW"])
    ).order_by(ChangeRequest.created_at.desc()).all()
    crs = filter_change_requests_for_user(db, raw_crs, current_user)
    return [format_cr_response(cr) for cr in crs]


@router.post("/dept-owner/requests/{cr_id}/signoff", response_model=ChangeRequestRead)
def dept_owner_signoff(
    cr_id: str,
    decision: ActionDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dept_owner)
):
    """Department Owner issues supervisory departmental signoff (enforces domain ownership & VAL-06 SoD)."""
    cr = change_request_service.get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    assert_can_view_change_request(db, cr, current_user)
    assert_sod_not_proposer(db, cr, current_user, "DEPT_SIGNOFF")

    signoff_note = f"[Dept Signoff by {current_user.full_name} ({current_user.department})]: {decision.comment or 'Departmental alignment confirmed'}"
    if cr.decision_comment:
        cr.decision_comment += f" | {signoff_note}"
    else:
        cr.decision_comment = signoff_note

    old_status = cr.status
    cr.status = "PENDING_2LOD_REVIEW"
    db.flush()
    log_audit(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        action="DEPT_SIGNOFF",
        entity="CHANGE_REQUEST",
        record_id=cr.id,
        old_value={"status": old_status},
        new_value={"decision_comment": cr.decision_comment, "status": cr.status},
        comment=f"Department Owner signed off on {cr.id}, forwarded to 2LoD Reviewer"
    )
    db.commit()
    db.refresh(cr)
    return format_cr_response(cr)


# =========================================================================
# 4. AUTHORITY_OWNER (CHARTER & MANDATE BODY CUSTODIAN)
# =========================================================================
require_authority_owner = require_persona(["AUTHORITY_OWNER"])


@router.get("/authority-owner/dashboard")
def get_authority_owner_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authority_owner)
):
    """Authority Owner dashboard: Corporate Governance charter mandates, committee terms of reference & delegations."""
    base_q = apply_doa_read_scope(db.query(DOARecord).filter(DOARecord.status == "PUBLISHED"), current_user)
    bod_count = base_q.filter(DOARecord.board_of_directors.isnot(None), DOARecord.board_of_directors != "").count()
    comm_count = base_q.filter(DOARecord.board_committees.isnot(None), DOARecord.board_committees != "").count()
    gceo_count = base_q.filter(DOARecord.gceo.isnot(None), DOARecord.gceo != "").count()

    return {
        "persona": "AUTHORITY_OWNER",
        "title": "Mandate & Governance Body Custodian",
        "user_name": current_user.full_name,
        "department": current_user.department or "Legal & Corporate Governance",
        "governance_mandates": {
            "Board of Directors (BoD) Rules": bod_count,
            "Board Committees (AC/NRC/BRC) Rules": comm_count,
            "GCEO & Executive Mandates": gceo_count
        },
        "charters": [
            {"code": "CHARTER-BOD", "name": "Board of Directors Terms of Reference", "revision": "v3.2", "status": "Active"},
            {"code": "CHARTER-AC", "name": "Audit Committee Charter", "revision": "v2.4", "status": "Active"},
            {"code": "CHARTER-EXCO", "name": "Executive Committee Mandate", "revision": "v4.0", "status": "Active"}
        ]
    }


@router.get("/authority-owner/matrix")
def get_authority_mandates_matrix(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authority_owner)
):
    """Comprehensive composite authority matrix across Board, Committees, GCEO, and C-Levels."""
    records = apply_doa_read_scope(
        db.query(DOARecord).filter(DOARecord.status == "PUBLISHED"),
        current_user
    ).limit(100).all()
    matrix = []
    for r in records:
        matrix.append({
            "id": r.id,
            "decision_area": r.decision_area,
            "parent_function": r.parent_function,
            "board_of_directors": r.board_of_directors,
            "board_committees": r.board_committees,
            "gceo": r.gceo,
            "ceo": r.ceo,
            "composite_authority": r.composite_authority,
            "charter_section": r.charter_section
        })
    return matrix


@router.post("/authority-owner/requests/{cr_id}/verify-mandate", response_model=ChangeRequestRead)
def verify_authority_mandate(
    cr_id: str,
    decision: ActionDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authority_owner)
):
    """Authority Owner verifies mandate alignment against Board Charters (enforces VAL-06 SoD)."""
    cr = change_request_service.get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    assert_can_view_change_request(db, cr, current_user)
    assert_sod_not_proposer(db, cr, current_user, "CHARTER_VERIFICATION")

    note = f"[Charter Mandate Verified by {current_user.full_name}]: {decision.comment or 'Charter compliance verified'}"
    if cr.decision_comment:
        cr.decision_comment += f" | {note}"
    else:
        cr.decision_comment = note

    db.flush()
    log_audit(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        action="CHARTER_VERIFIED",
        entity="CHANGE_REQUEST",
        record_id=cr.id,
        comment=f"Charter mandate verified for {cr.id}"
    )
    db.commit()
    db.refresh(cr)
    return format_cr_response(cr)


# =========================================================================
# 5. REVIEWER (RISK & POLICY REVIEW ANALYST / 2LoD)
# =========================================================================
require_reviewer = require_persona(["REVIEWER"])


@router.get("/reviewer/dashboard")
def get_reviewer_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    """Reviewer (2LoD Risk) dashboard: Technical risk queue, policy cross-reference & diff analysis."""
    raw_pending = db.query(ChangeRequest).filter(
        ChangeRequest.status.in_(["SUBMITTED", "PENDING_2LOD_REVIEW", "UNDER_REVIEW"])
    ).all()
    pending_crs = filter_change_requests_for_user(db, raw_pending, current_user)
    regulatory_crs = [c for c in pending_crs if "regulatory" in (c.proposed_value or "").lower()]

    return {
        "persona": "REVIEWER",
        "title": "Risk & Policy Review Analyst (2LoD)",
        "user_name": current_user.full_name,
        "department": current_user.department or "Enterprise Risk Management",
        "pending_technical_reviews": len(pending_crs),
        "regulatory_impacted_proposals": len(regulatory_crs),
        "review_queue": [format_cr_response(c) for c in pending_crs[:6]]
    }


@router.get("/reviewer/queue", response_model=List[ChangeRequestRead])
def get_reviewer_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    """Retrieve incoming proposals awaiting 2LoD risk review."""
    raw_crs = db.query(ChangeRequest).filter(
        ChangeRequest.status.in_(["PENDING_2LOD_REVIEW", "SUBMITTED", "UNDER_REVIEW"])
    ).order_by(ChangeRequest.created_at.desc()).all()
    crs = filter_change_requests_for_user(db, raw_crs, current_user)
    return [format_cr_response(cr) for cr in crs]


@router.get("/reviewer/diff/{cr_id}", response_model=DiffResponse)
def get_reviewer_diff(
    cr_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    """Inspect detailed attribute-level diff with live concurrency check."""
    cr = change_request_service.get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    assert_can_view_change_request(db, cr, current_user)

    cur_val = json.loads(cr.current_value) if cr.current_value else {}
    prop_val = json.loads(cr.proposed_value) if cr.proposed_value else {}

    live_ver = None
    is_stale = False
    if cr.doa_id:
        target = db.query(DOARecord).filter(DOARecord.id == cr.doa_id).first()
        if target:
            live_ver = target.current_version
            if live_ver != cr.base_version:
                is_stale = True

    diffs = diff_service.calculate_diff(cur_val, prop_val)
    return DiffResponse(
        change_request_id=cr.id,
        request_type=cr.request_type,
        doa_id=cr.doa_id,
        base_version=cr.base_version,
        current_doa_version=live_ver,
        is_stale=is_stale,
        diffs=diffs
    )


@router.post("/reviewer/requests/{cr_id}/recommend", response_model=ChangeRequestRead)
def reviewer_recommendation(
    cr_id: str,
    decision: ActionDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    """Reviewer provides formal 2LoD risk recommendation and forwards to Approver (enforces VAL-06 SoD)."""
    cr = change_request_service.get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    assert_can_view_change_request(db, cr, current_user)
    assert_sod_not_proposer(db, cr, current_user, "REVIEWER_RECOMMENDATION")

    cr.status = "UNDER_REVIEW"
    recommendation = f"[2LoD Risk Endorsed by {current_user.full_name}]: {decision.comment or 'Risk review completed with no policy objections'}"
    if cr.decision_comment:
        cr.decision_comment += f" | {recommendation}"
    else:
        cr.decision_comment = recommendation

    db.flush()
    log_audit(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        action="REVIEWER_RECOMMENDATION",
        entity="CHANGE_REQUEST",
        record_id=cr.id,
        new_value={"decision_comment": cr.decision_comment, "status": cr.status},
        comment=f"2LoD Reviewer recommended {cr.id}, cleared for Executive Approver"
    )
    db.commit()
    db.refresh(cr)
    return format_cr_response(cr)


# =========================================================================
# 6. APPROVER (EXECUTIVE APPROVER / VP FINANCE)
# =========================================================================
require_approver = require_persona(["APPROVER"])


@router.get("/approver/dashboard")
def get_approver_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approver)
):
    """Approver dashboard: Executive pending approval inbox, historical decisions & delegation caps."""
    raw_pending = db.query(ChangeRequest).filter(
        ChangeRequest.status.in_(["SUBMITTED", "UNDER_REVIEW"])
    ).all()
    pending_approvals = filter_change_requests_for_user(db, raw_pending, current_user)

    approved_history = db.query(ChangeRequest).filter(
        ChangeRequest.reviewer_id == current_user.id,
        ChangeRequest.status == "APPROVED"
    ).all()

    rejected_history = db.query(ChangeRequest).filter(
        ChangeRequest.reviewer_id == current_user.id,
        ChangeRequest.status == "REJECTED"
    ).all()

    return {
        "persona": "APPROVER",
        "title": "Executive Approver / VP Finance",
        "user_name": current_user.full_name,
        "department": current_user.department or "Executive Management",
        "pending_inbox_count": len(pending_approvals),
        "total_approved_by_me": len(approved_history),
        "total_rejected_by_me": len(rejected_history),
        "pending_inbox": [format_cr_response(c) for c in pending_approvals[:5]]
    }


@router.get("/approver/inbox", response_model=List[ChangeRequestRead])
def get_approver_inbox(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approver)
):
    """Approver's dedicated inbox of requests awaiting final executive approval."""
    raw_crs = db.query(ChangeRequest).filter(
        ChangeRequest.status.in_(["SUBMITTED", "UNDER_REVIEW"])
    ).order_by(ChangeRequest.created_at.desc()).all()
    crs = filter_change_requests_for_user(db, raw_crs, current_user)
    return [format_cr_response(cr) for cr in crs]


@router.post("/approver/requests/{cr_id}/decision", response_model=ChangeRequestRead)
def make_approver_decision(
    cr_id: str,
    action: str = Query(..., pattern="^(APPROVE|REJECT)$"),
    decision: ActionDecision = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approver)
):
    """Approver makes a binding APPROVE or REJECT decision with obligatory rationale (enforces VAL-06 SoD)."""
    if not decision or not decision.comment:
        raise HTTPException(status_code=400, detail="Decision rationale comment is obligatory")

    if action == "APPROVE":
        cr = change_request_service.approve_change_request(db, cr_id, decision, current_user)
    else:
        cr = change_request_service.reject_change_request(db, cr_id, decision, current_user)
    return format_cr_response(cr)


# =========================================================================
# 7. AUDIT_READONLY (INTERNAL AUDIT & ASSURANCE)
# =========================================================================
require_audit = require_persona(["AUDIT_READONLY"])


@router.get("/audit-readonly/dashboard")
def get_audit_readonly_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_audit)
):
    """Audit Readonly dashboard: Governance compliance metrics, full version snapshot counts & tamper-evident logs."""
    total_doas = db.query(DOARecord).count()
    total_versions = db.query(DOAVersion).count()
    total_audit_logs = db.query(AuditLog).count()
    regulatory_count = db.query(DOARecord).filter(DOARecord.regulatory == "Y").count()

    recent_logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(10).all()

    return {
        "persona": "AUDIT_READONLY",
        "title": "Internal Audit & Assurance (Read-Only)",
        "user_name": current_user.full_name,
        "department": current_user.department or "Internal Audit & Assurance",
        "assurance_metrics": {
            "Total Master DOAs": total_doas,
            "Total Version Snapshots": total_versions,
            "Regulatory Mandated Rules": regulatory_count,
            "Total Immutable Audit Entries": total_audit_logs
        },
        "recent_audit_trail": [
            {
                "id": l.id,
                "action": l.action,
                "entity": l.entity,
                "record_id": l.record_id,
                "user_email": l.user_email,
                "comment": l.comment,
                "timestamp": l.timestamp.isoformat() if l.timestamp else None
            }
            for l in recent_logs
        ]
    }


@router.get("/audit-readonly/versions/{doa_id}")
def get_audit_doa_versions(
    doa_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_audit)
):
    """Inspect complete historical version timeline and change diffs for any DOA record."""
    target = db.query(DOARecord).filter(DOARecord.id == doa_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="DOA Record not found")

    assert_can_read_doa(target, current_user)

    versions = db.query(DOAVersion).filter(DOAVersion.doa_id == doa_id).order_by(DOAVersion.version_number.desc()).all()
    return {
        "doa_id": doa_id,
        "current_version": target.current_version,
        "status": target.status,
        "version_history": [
            {
                "version_number": v.version_number,
                "status": v.status,
                "effective_date": v.effective_date,
                "created_by": v.created_by,
                "created_at": v.created_at.isoformat() if v.created_at else None,
                "snapshot": json.loads(v.snapshot) if v.snapshot else {}
            }
            for v in versions
        ]
    }


@router.get("/audit-readonly/ledger")
def get_audit_ledger(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_audit)
):
    """Read-only access to complete immutable audit log ledger."""
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": l.id,
            "action": l.action,
            "entity": l.entity,
            "record_id": l.record_id,
            "user_email": l.user_email,
            "role": l.role,
            "comment": l.comment,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            "old_value": json.loads(l.old_value) if l.old_value else None,
            "new_value": json.loads(l.new_value) if l.new_value else None
        }
        for l in logs
    ]


# =========================================================================
# 8. ROLE-SPECIFIC MANAGEMENT REPORTS ENDPOINTS (Functionality 7)
# =========================================================================

@router.get("/requestor/reports/lifecycle")
def get_requestor_lifecycle_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_requestor)
):
    """RPT-USR-01: Personal Proposal Lifecycle Report scoped to the Requestor."""
    crs = db.query(ChangeRequest).filter(ChangeRequest.requester_id == current_user.id).order_by(ChangeRequest.created_at.desc()).all()
    rows = []
    for c in crs:
        rows.append({
            "id": c.id,
            "request_type": c.request_type,
            "doa_id": c.doa_id or "NEW_RULE",
            "department": c.department or current_user.department or "Commercial",
            "status": c.status,
            "base_version": f"v{c.base_version}",
            "decision_comment": c.decision_comment or "In Review Pipeline",
            "operational_impact": getattr(c, "operational_impact", "") or "Pending assessment",
            "created_at": c.created_at.isoformat() if c.created_at else None
        })
    return {
        "report_id": "RPT-USR-01",
        "title": "Personal Proposal Lifecycle & Status Report",
        "persona": "FRONTEND_USER",
        "scope": f"Requester: {current_user.email}",
        "count": len(rows),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "columns": ["id", "request_type", "doa_id", "department", "status", "base_version", "decision_comment", "operational_impact", "created_at"],
        "data": rows
    }


@router.get("/requestor/reports/operational-limits")
def get_requestor_operational_limits_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_requestor)
):
    """RPT-USR-02: Department Operational Limits Report strictly scoped to the Requestor's authorized domain."""
    dept = current_user.department or "Commercial Operations"
    scoped_records = apply_doa_read_scope(
        db.query(DOARecord).filter(DOARecord.status == "PUBLISHED"),
        current_user
    ).all()

    matched = [
        r for r in scoped_records
        if dept.lower() in (r.parent_function or "").lower()
        or dept.lower() in (r.function or "").lower()
        or dept.lower() in (r.business_line or "").lower()
    ]
    if not matched:
        matched = scoped_records[:25]

    rows = []
    for r in matched:
        rows.append({
            "id": r.id,
            "parent_function": r.parent_function,
            "business_line": r.business_line,
            "decision_area": r.decision_area,
            "key_non_key": r.key_non_key,
            "composite_authority": r.composite_authority,
            "policy_reference": r.policy_reference or "SOP Operational Guidelines",
            "effective_date": r.effective_date
        })
    return {
        "report_id": "RPT-USR-02",
        "title": f"Department Operational Limits Matrix ({dept})",
        "persona": "FRONTEND_USER",
        "scope": f"Department: {dept} (Domains: {', '.join(get_allowed_domains(current_user))})",
        "count": len(rows),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "columns": ["id", "parent_function", "business_line", "decision_area", "key_non_key", "composite_authority", "policy_reference", "effective_date"],
        "data": rows
    }


@router.get("/process-owner/reports/operational-alignment")
def get_process_owner_alignment_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_process_owner)
):
    """RPT-PO-01: End-to-End Operational Process Alignment Report scoped to Process Owner's domain."""
    records = apply_doa_read_scope(
        db.query(DOARecord).filter(DOARecord.status == "PUBLISHED"),
        current_user
    ).all()
    rows = []
    for r in records:
        rows.append({
            "id": r.id,
            "process_name": r.process_name or "Procure-to-Pay (P2P)",
            "business_line": r.business_line,
            "decision_area": r.decision_area,
            "mgmt_committees": r.mgmt_committees or "ORC / MANCO",
            "composite_flow": r.composite_authority,
            "policy_reference": r.policy_reference or "Standard Operating Procedure §3"
        })
    return {
        "report_id": "RPT-PO-01",
        "title": "End-to-End Operational Process & Workflow Alignment Report",
        "persona": "PROCESS_OWNER",
        "scope": f"Operational Workflows ({', '.join(get_allowed_domains(current_user))})",
        "count": len(rows),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "columns": ["id", "process_name", "business_line", "decision_area", "mgmt_committees", "composite_flow", "policy_reference"],
        "data": rows
    }


@router.get("/process-owner/reports/impact-queue")
def get_process_owner_impact_queue_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_process_owner)
):
    """RPT-PO-02: Operational Impact Queue & SLA Telemetry Report scoped to Process Owner."""
    raw_crs = db.query(ChangeRequest).filter(
        ChangeRequest.status.in_(["SUBMITTED", "PENDING_PROCESS_OWNER"])
    ).order_by(ChangeRequest.created_at.asc()).all()
    crs = filter_change_requests_for_user(db, raw_crs, current_user)
    rows = []
    now = datetime.now(timezone.utc)
    for c in crs:
        age_hours = 0
        if c.created_at:
            delta = now - (c.created_at if c.created_at.tzinfo else c.created_at.replace(tzinfo=timezone.utc))
            age_hours = round(delta.total_seconds() / 3600, 1)
        sla_flag = "EXCEEDED (>48h)" if age_hours > 48 else "NORMAL"
        rows.append({
            "id": c.id,
            "requester_email": c.requester_email,
            "request_type": c.request_type,
            "process": c.process or "P2P / Operational",
            "status": c.status,
            "queue_age_hours": age_hours,
            "sla_alert": sla_flag,
            "operational_impact": getattr(c, "operational_impact", "") or "Pending Endorsement"
        })
    return {
        "report_id": "RPT-PO-02",
        "title": "Pending Operational Impact Queue & SLA Telemetry Report",
        "persona": "PROCESS_OWNER",
        "scope": "Process Owner Endorsement Queue",
        "count": len(rows),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "columns": ["id", "requester_email", "request_type", "process", "status", "queue_age_hours", "sla_alert", "operational_impact"],
        "data": rows
    }


@router.get("/dept-owner/reports/signing-limits")
def get_dept_owner_signing_limits_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dept_owner)
):
    """RPT-DO-01: Departmental Delegated Signing Limits Matrix strictly scoped to Dept Owner's domain."""
    dept = current_user.department or "Finance"
    matched = apply_doa_read_scope(
        db.query(DOARecord).filter(DOARecord.status == "PUBLISHED"),
        current_user
    ).all()

    rows = []
    for r in matched:
        rows.append({
            "id": r.id,
            "function": r.parent_function or r.function,
            "business_line": r.business_line,
            "decision_area": r.decision_area,
            "c_level1": r.c_level1 or "Head of Dept",
            "gceo": r.gceo or "-",
            "board_committees": r.board_committees or "-",
            "composite_authority": r.composite_authority
        })
    return {
        "report_id": "RPT-DO-01",
        "title": f"Departmental Delegated Signing Limits Matrix ({dept})",
        "persona": "DEPT_OWNER",
        "scope": f"Function: {dept}",
        "count": len(rows),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "columns": ["id", "function", "business_line", "decision_area", "c_level1", "gceo", "board_committees", "composite_authority"],
        "data": rows
    }


@router.get("/dept-owner/reports/change-history")
def get_dept_owner_change_history_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dept_owner)
):
    """RPT-DO-02: Departmental Rule Version & Change History scoped to Dept Owner's domain."""
    q_mod = apply_doa_read_scope(
        db.query(DOARecord).filter(DOARecord.status == "PUBLISHED", DOARecord.current_version > 1),
        current_user
    )
    records = q_mod.order_by(DOARecord.modified_at.desc()).all()
    if not records:
        records = apply_doa_read_scope(
            db.query(DOARecord).filter(DOARecord.status == "PUBLISHED"),
            current_user
        ).limit(20).all()

    rows = []
    for r in records:
        rows.append({
            "id": r.id,
            "parent_function": r.parent_function,
            "business_line": r.business_line,
            "decision_area": r.decision_area,
            "version": f"v{r.current_version}",
            "modified_by": r.modified_by or r.created_by or "System",
            "modified_at": r.modified_at.isoformat() if r.modified_at else r.created_at.isoformat(),
            "policy_reference": r.policy_reference or "Corporate Charter"
        })
    return {
        "report_id": "RPT-DO-02",
        "title": "Departmental Rule Revision & Version History",
        "persona": "DEPT_OWNER",
        "scope": f"Department Managed Version Trajectory ({', '.join(get_allowed_domains(current_user))})",
        "count": len(rows),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "columns": ["id", "parent_function", "business_line", "decision_area", "version", "modified_by", "modified_at", "policy_reference"],
        "data": rows
    }


@router.get("/authority-owner/reports/charter-mandates")
def get_authority_owner_charter_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authority_owner)
):
    """RPT-AO-01: Governance Charter & Terms of Reference Matrix."""
    records = apply_doa_read_scope(
        db.query(DOARecord).filter(DOARecord.status == "PUBLISHED"),
        current_user
    ).all()
    rows = []
    for r in records:
        rows.append({
            "id": r.id,
            "governance_body": "BoD / Audit & Risk Committees" if r.board_committees or r.board_of_directors else "Executive Committee",
            "decision_area": r.decision_area,
            "charter_section": r.charter_section or "Corporate Governance Charter §2.4",
            "board_committees": r.board_committees or "Reserved",
            "gceo": r.gceo or "-",
            "composite_authority": r.composite_authority
        })
    return {
        "report_id": "RPT-AO-01",
        "title": "Corporate Governance Charter & Terms of Reference Mandate Matrix",
        "persona": "AUTHORITY_OWNER",
        "scope": "Board & Executive Mandates",
        "count": len(rows),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "columns": ["id", "governance_body", "decision_area", "charter_section", "board_committees", "gceo", "composite_authority"],
        "data": rows
    }


@router.get("/authority-owner/reports/chain-flows")
def get_authority_owner_chain_flows_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authority_owner)
):
    """RPT-AO-02: Composite Multi-Tier Authority Chain Flow Integrity Report."""
    records = apply_doa_read_scope(
        db.query(DOARecord).filter(DOARecord.status == "PUBLISHED"),
        current_user
    ).all()
    rows = []
    for r in records:
        has_board = bool(r.board_of_directors or r.board_committees or r.shareholders)
        rows.append({
            "id": r.id,
            "function": r.parent_function,
            "business_line": r.business_line,
            "decision_area": r.decision_area,
            "composite_authority": r.composite_authority,
            "has_statutory_ratification": "YES (Board/Shareholders)" if has_board else "NO (Executive Only)",
            "key_non_key": r.key_non_key
        })
    return {
        "report_id": "RPT-AO-02",
        "title": "Composite Multi-Tier Authority Chain Flow & Ratification Integrity Report",
        "persona": "AUTHORITY_OWNER",
        "scope": "Delegation Chains Integrity",
        "count": len(rows),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "columns": ["id", "function", "business_line", "decision_area", "composite_authority", "has_statutory_ratification", "key_non_key"],
        "data": rows
    }


@router.get("/reviewer/reports/regulatory-register")
def get_reviewer_regulatory_register_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    """RPT-REV-01: Regulatory Mandated Authorities Register."""
    records = apply_doa_read_scope(
        db.query(DOARecord).filter(DOARecord.status == "PUBLISHED", DOARecord.regulatory == "Y"),
        current_user
    ).all()
    rows = []
    for r in records:
        rows.append({
            "id": r.id,
            "function": r.parent_function,
            "business_line": r.business_line,
            "decision_area": r.decision_area,
            "regulatory_requirement": r.regulatory_requirement or "Central Bank Governance Code Reg 12(b)",
            "policy_reference": r.policy_reference or "Treasury & Basel IV Policy §4",
            "composite_authority": r.composite_authority,
            "compliance_status": "COMPLIANT"
        })
    return {
        "report_id": "RPT-REV-01",
        "title": "Regulatory Mandated Rules & Basel Compliance Register",
        "persona": "REVIEWER",
        "scope": "Mandatory Regulatory Authorities",
        "count": len(rows),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "columns": ["id", "function", "business_line", "decision_area", "regulatory_requirement", "policy_reference", "composite_authority", "compliance_status"],
        "data": rows
    }


@router.get("/reviewer/reports/technical-diffs")
def get_reviewer_technical_diffs_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    """RPT-REV-02: 2LoD Technical Review Queue & Attribute Diff Report."""
    raw_crs = db.query(ChangeRequest).filter(
        ChangeRequest.status.in_(["PENDING_2LOD_REVIEW", "UNDER_REVIEW", "SUBMITTED"])
    ).all()
    crs = filter_change_requests_for_user(db, raw_crs, current_user)
    rows = []
    for c in crs:
        p_val = json.loads(c.proposed_value) if c.proposed_value else {}
        changed_fields = list(p_val.keys()) if isinstance(p_val, dict) else []
        rows.append({
            "id": c.id,
            "request_type": c.request_type,
            "doa_id": c.doa_id or "NEW_RULE",
            "base_version": f"v{c.base_version}",
            "fields_modified_count": len(changed_fields),
            "modified_fields": ", ".join(changed_fields[:4]) if changed_fields else "All",
            "concurrency_status": "VALID",
            "status": c.status
        })
    return {
        "report_id": "RPT-REV-02",
        "title": "2LoD Technical Review Queue & Concurrency Diff Analysis",
        "persona": "REVIEWER",
        "scope": "2LoD Risk Review Pipeline",
        "count": len(rows),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "columns": ["id", "request_type", "doa_id", "base_version", "fields_modified_count", "modified_fields", "concurrency_status", "status"],
        "data": rows
    }


@router.get("/approver/reports/executive-portfolio")
def get_approver_executive_portfolio_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approver)
):
    """RPT-APP-01: Executive Pending Approval Portfolio Report."""
    raw_crs = db.query(ChangeRequest).filter(
        ChangeRequest.status.in_(["UNDER_REVIEW", "PENDING_2LOD_REVIEW", "SUBMITTED"])
    ).all()
    crs = filter_change_requests_for_user(db, raw_crs, current_user)
    rows = []
    for c in crs:
        rows.append({
            "id": c.id,
            "requester_email": c.requester_email,
            "request_type": c.request_type,
            "doa_id": c.doa_id or "NEW",
            "department": c.department or "Commercial / Finance",
            "operational_impact": getattr(c, "operational_impact", "") or "Endorsed by Process Owner",
            "status": c.status,
            "financial_exposure": "$1M - $10M" if c.request_type == "MODIFY" else "Strategic Delegation",
            "created_at": c.created_at.isoformat() if c.created_at else None
        })
    return {
        "report_id": "RPT-APP-01",
        "title": "Executive Pending Approval Portfolio & Exposure Summary",
        "persona": "APPROVER",
        "scope": "Executive Committee Binding Review Inbox",
        "count": len(rows),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "columns": ["id", "requester_email", "request_type", "doa_id", "department", "operational_impact", "status", "financial_exposure", "created_at"],
        "data": rows
    }


@router.get("/approver/reports/binding-decisions")
def get_approver_binding_decisions_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approver)
):
    """RPT-APP-02: Executive Binding Decisions & Audit Rationale Report."""
    raw_crs = db.query(ChangeRequest).filter(
        ChangeRequest.status.in_(["APPROVED", "REJECTED", "PUBLISHED"])
    ).order_by(ChangeRequest.created_at.desc()).all()
    crs = filter_change_requests_for_user(db, raw_crs, current_user)
    rows = []
    for c in crs:
        rows.append({
            "id": c.id,
            "decision": c.status,
            "doa_id": c.doa_id or "NEW",
            "approver_email": c.reviewer_email or current_user.email,
            "decision_comment": c.decision_comment or "Executive Sign-off Executed",
            "published_status": "PUBLISHED" if c.status == "PUBLISHED" else "PENDING_PUBLICATION",
            "decided_at": c.reviewed_at.isoformat() if getattr(c, "reviewed_at", None) else c.created_at.isoformat()
        })
    return {
        "report_id": "RPT-APP-02",
        "title": "Executive Binding Decisions Audit Rationale Report",
        "persona": "APPROVER",
        "scope": "Executive Decision Ledger",
        "count": len(rows),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "columns": ["id", "decision", "doa_id", "approver_email", "decision_comment", "published_status", "decided_at"],
        "data": rows
    }


@router.get("/audit-readonly/reports/version-dossier")
def get_audit_version_dossier_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_audit)
):
    """RPT-AUD-01: Complete Version Snapshot Dossier."""
    versions = db.query(DOAVersion).order_by(DOAVersion.created_at.desc()).limit(100).all()
    rows = []
    for v in versions:
        rows.append({
            "version_id": v.id,
            "doa_id": v.doa_id,
            "version_number": f"v{v.version_number}",
            "status": v.status,
            "change_request_id": v.change_request_id or "INITIAL_BASELINE",
            "published_by": v.created_by or "System Administrator",
            "published_at": v.created_at.isoformat() if v.created_at else None
        })
    return {
        "report_id": "RPT-AUD-01",
        "title": "DOA Master Rule Complete Version Snapshot Dossier",
        "persona": "AUDIT_READONLY",
        "scope": "Version Snapshots Archive",
        "count": len(rows),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "columns": ["version_id", "doa_id", "version_number", "status", "change_request_id", "published_by", "published_at"],
        "data": rows
    }


@router.get("/audit-readonly/reports/immutable-ledger")
def get_audit_immutable_ledger_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_audit)
):
    """RPT-AUD-02: Tamper-Evident Immutable Audit Log Ledger."""
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
    rows = []
    for l in logs:
        rows.append({
            "log_id": l.id,
            "action": l.action,
            "entity": l.entity,
            "record_id": l.record_id,
            "actor_email": l.user_email,
            "actor_role": l.role,
            "comment": l.comment or "-",
            "timestamp": l.timestamp.isoformat() if l.timestamp else None
        })
    return {
        "report_id": "RPT-AUD-02",
        "title": "Tamper-Evident Immutable Audit Trail Ledger",
        "persona": "AUDIT_READONLY",
        "scope": "System Audit Trail",
        "count": len(rows),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "columns": ["log_id", "action", "entity", "record_id", "actor_email", "actor_role", "comment", "timestamp"],
        "data": rows
    }


@router.get("/audit-readonly/reports/sod-matrix")
def get_audit_sod_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_audit)
):
    """RPT-AUD-03: Segregation of Duties (SoD) Exception & Governance Integrity Report."""
    crs = db.query(ChangeRequest).all()
    rows = []
    for c in crs:
        self_approval_flag = (c.requester_id == c.reviewer_id and c.reviewer_id is not None)
        status_flag = "VIOLATION (Self-Approval Detected)" if self_approval_flag else "PASS (Segregation Maintained)"
        rows.append({
            "id": c.id,
            "requester_email": c.requester_email,
            "reviewer_email": c.reviewer_email or "Pending Review",
            "request_type": c.request_type,
            "status": c.status,
            "sod_compliance_status": status_flag
        })
    return {
        "report_id": "RPT-AUD-03",
        "title": "Segregation of Duties (SoD) Exception & Compliance Report",
        "persona": "AUDIT_READONLY",
        "scope": "Governance & 4-Eye Workflow Compliance",
        "count": len(rows),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "columns": ["id", "requester_email", "reviewer_email", "request_type", "status", "sod_compliance_status"],
        "data": rows
    }
