from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import json

from app.database.database import get_db
from app.database.models import User, DOARecord, ChangeRequest, DOAVersion, AuditLog
from app.core.dependencies import get_current_user, require_persona, require_roles
from app.schemas.schemas import (
    DOARead, 
    ChangeRequestRead, 
    ChangeRequestCreate, 
    ActionDecision, 
    DiffResponse
)
from app.services import doa_service, change_request_service, diff_service
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
    """Business Line Analyst / Requestor dashboard: Personal submissions & active published matrix counts."""
    my_crs = db.query(ChangeRequest).filter(ChangeRequest.requester_id == current_user.id).all()
    dept = current_user.department or "Commercial Operations"
    
    # Department published count
    dept_published = db.query(DOARecord).filter(
        DOARecord.status == "PUBLISHED",
        (DOARecord.parent_function == dept) | (DOARecord.function == dept)
    ).count()

    total_published = db.query(DOARecord).filter(DOARecord.status == "PUBLISHED").count()

    return {
        "persona": "FRONTEND_USER",
        "title": "Business Line Analyst / Requestor",
        "user_name": current_user.full_name,
        "email": current_user.email,
        "department": dept,
        "total_submitted": len(my_crs),
        "pending": sum(1 for c in my_crs if c.status in ["SUBMITTED", "PENDING_PROCESS_OWNER", "PENDING_DEPT_OWNER", "UNDER_REVIEW"]),
        "approved": sum(1 for c in my_crs if c.status == "APPROVED"),
        "published": sum(1 for c in my_crs if c.status == "PUBLISHED"),
        "rejected": sum(1 for c in my_crs if c.status == "REJECTED"),
        "department_published_rules": dept_published,
        "total_published_doa": total_published,
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
    """Raise a new DOA Change Request (ADD, MODIFY, DELETE) initiated by Requestor."""
    cr = change_request_service.create_change_request(db, payload, current_user)
    return format_cr_response(cr)

@router.post("/requestor/proposals/{cr_id}/withdraw", response_model=ChangeRequestRead)
def withdraw_requestor_proposal(
    cr_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_requestor)
):
    """Allows Requestor to cancel or withdraw a proposal before formal binding approval."""
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
    """Process Owner dashboard: Process operational review queue, SOP links & endorsements."""
    # Process owner monitors operational workflows e.g. P2P, Capex, Supply Chain
    proc_filter = current_user.department or "Supply Chain Operations"
    
    operational_crs = db.query(ChangeRequest).filter(
        ChangeRequest.status.in_(["SUBMITTED", "PENDING_PROCESS_OWNER", "UNDER_REVIEW"])
    ).all()

    endorsed_count = db.query(ChangeRequest).filter(
        ChangeRequest.operational_impact.isnot(None)
    ).count()

    return {
        "persona": "PROCESS_OWNER",
        "title": "Process Integrity & Operational Lead",
        "user_name": current_user.full_name,
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
    """Retrieve all change requests needing operational review and process impact assessment."""
    crs = db.query(ChangeRequest).filter(
        ChangeRequest.status.in_(["SUBMITTED", "PENDING_PROCESS_OWNER", "UNDER_REVIEW"])
    ).order_by(ChangeRequest.created_at.desc()).all()
    return [format_cr_response(cr) for cr in crs]

@router.post("/process-owner/requests/{cr_id}/endorse", response_model=ChangeRequestRead)
def endorse_process_impact(
    cr_id: str,
    decision: ActionDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_process_owner)
):
    """Process Owner submits formal Operational Impact Assessment and endorses workflow."""
    cr = change_request_service.get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    impact_text = decision.operational_impact or decision.comment or "Operational impact reviewed and endorsed."
    cr.operational_impact = f"[Endorsed by Process Owner {current_user.full_name}]: {impact_text}"
    # Advance multi-hop workflow cycle: Process Owner Endorsed -> Forward to Functional / Department Owner
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
    """Department / Function Owner dashboard: Department oversight, budget signing thresholds & proposals."""
    dept = current_user.department or "Finance"
    
    # Segregated counts: Department specific DOA rules
    dept_rules = db.query(DOARecord).filter(
        DOARecord.status == "PUBLISHED",
        (DOARecord.parent_function == dept) | (DOARecord.function == dept)
    ).count()

    dept_crs = db.query(ChangeRequest).filter(
        (ChangeRequest.department == dept) | (ChangeRequest.department.ilike(f"%{dept}%"))
    ).all()

    return {
        "persona": "DEPT_OWNER",
        "title": "Department / Function Owner",
        "user_name": current_user.full_name,
        "department": dept,
        "managed_rules_count": dept_rules,
        "department_pending_crs": sum(1 for c in dept_crs if c.status in ["SUBMITTED", "UNDER_REVIEW"]),
        "department_approved_crs": sum(1 for c in dept_crs if c.status in ["APPROVED", "PUBLISHED"]),
        "signing_limits_summary": {
            "Level 1 (Up to $100K)": "Department Manager",
            "Level 2 (Up to $500K)": "Head of Finance / Treasury",
            "Level 3 (Above $500K)": "Executive Committee / CFO"
        },
        "recent_department_crs": [format_cr_response(c) for c in sorted(dept_crs, key=lambda x: x.created_at, reverse=True)[:5]]
    }

@router.get("/dept-owner/department-doas", response_model=List[DOARead])
def get_department_doas(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dept_owner)
):
    """Retrieve only DOA records pertaining to the Department Owner's domain (Finance / Treasury)."""
    dept = current_user.department or "Finance"
    return db.query(DOARecord).filter(
        DOARecord.status == "PUBLISHED",
        (DOARecord.parent_function == dept) | (DOARecord.function == dept)
    ).order_by(DOARecord.id).all()

@router.get("/dept-owner/queue", response_model=List[ChangeRequestRead])
def get_dept_owner_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dept_owner)
):
    """Retrieve requests forwarded to Department Owner for supervisory signoff."""
    dept = current_user.department or "Finance"
    crs = db.query(ChangeRequest).filter(
        ChangeRequest.status.in_(["PENDING_DEPT_OWNER", "SUBMITTED", "UNDER_REVIEW"])
    ).order_by(ChangeRequest.created_at.desc()).all()
    return [format_cr_response(cr) for cr in crs]

@router.post("/dept-owner/requests/{cr_id}/signoff", response_model=ChangeRequestRead)
def dept_owner_signoff(
    cr_id: str,
    decision: ActionDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dept_owner)
):
    """Department Owner issues supervisory departmental signoff on incoming requests."""
    cr = change_request_service.get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    signoff_note = f"[Dept Signoff by {current_user.full_name} ({current_user.department})]: {decision.comment or 'Departmental alignment confirmed'}"
    if cr.decision_comment:
        cr.decision_comment += f" | {signoff_note}"
    else:
        cr.decision_comment = signoff_note

    # Advance multi-hop workflow cycle: Functional / Department Owner signoff -> Forward to 2LoD Reviewer
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
    # Count composite authority rules
    bod_count = db.query(DOARecord).filter(DOARecord.status == "PUBLISHED", DOARecord.board_of_directors.isnot(None), DOARecord.board_of_directors != "").count()
    comm_count = db.query(DOARecord).filter(DOARecord.status == "PUBLISHED", DOARecord.board_committees.isnot(None), DOARecord.board_committees != "").count()
    gceo_count = db.query(DOARecord).filter(DOARecord.status == "PUBLISHED", DOARecord.gceo.isnot(None), DOARecord.gceo != "").count()

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
    records = db.query(DOARecord).filter(DOARecord.status == "PUBLISHED").limit(100).all()
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
    """Authority Owner verifies mandate alignment against Board Charters."""
    cr = change_request_service.get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

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
    pending_crs = db.query(ChangeRequest).filter(ChangeRequest.status.in_(["SUBMITTED", "UNDER_REVIEW"])).all()
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
    crs = db.query(ChangeRequest).filter(
        ChangeRequest.status.in_(["PENDING_2LOD_REVIEW", "SUBMITTED", "UNDER_REVIEW"])
    ).order_by(ChangeRequest.created_at.desc()).all()
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
    """Reviewer provides formal 2LoD risk recommendation and forwards to Approver."""
    cr = change_request_service.get_change_request_by_id(db, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

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
    pending_approvals = db.query(ChangeRequest).filter(
        ChangeRequest.status.in_(["SUBMITTED", "UNDER_REVIEW"])
    ).all()

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
    crs = db.query(ChangeRequest).filter(
        ChangeRequest.status.in_(["SUBMITTED", "UNDER_REVIEW"])
    ).order_by(ChangeRequest.created_at.desc()).all()
    return [format_cr_response(cr) for cr in crs]

@router.post("/approver/requests/{cr_id}/decision", response_model=ChangeRequestRead)
def make_approver_decision(
    cr_id: str,
    action: str = Query(..., pattern="^(APPROVE|REJECT)$"),
    decision: ActionDecision = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approver)
):
    """Approver makes a binding APPROVE or REJECT decision with obligatory rationale."""
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
