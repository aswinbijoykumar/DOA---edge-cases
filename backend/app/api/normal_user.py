from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from app.database.database import get_db
from app.database.models import User, DOARecord, ChangeRequest
from app.core.dependencies import get_current_user, require_roles
from app.schemas.schemas import DOARead, ChangeRequestRead, ChangeRequestCreate
from app.services import doa_service, change_request_service
from app.services.version_service import record_to_dict
from app.api.change_requests import format_cr_response

router = APIRouter(prefix="/user", tags=["Normal User Workspace"])

# Allow NORMAL_USER and admin roles
require_normal_user = require_roles(["NORMAL_USER", "ADMIN", "DOA_ADMINISTRATOR", "SYSTEM_ADMINISTRATOR", "GOVERNANCE_TEAM"])

@router.get("/dashboard")
def get_user_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_normal_user)
):
    """
    Dedicated dashboard summary for Normal Users (Business Line Analysts).
    Returns personal proposal stats, recent user submissions, and active published rule counts.
    """
    is_approver = getattr(current_user, "persona_type", "") == "APPROVER"
    
    if is_approver:
        # Approvers oversee all incoming proposals awaiting executive review
        total_my_requests = db.query(ChangeRequest).count()
        my_pending = db.query(ChangeRequest).filter(ChangeRequest.status == "SUBMITTED").count()
        my_approved = db.query(ChangeRequest).filter(ChangeRequest.status == "APPROVED").count()
        my_published = db.query(ChangeRequest).filter(ChangeRequest.status == "PUBLISHED").count()
        my_rejected = db.query(ChangeRequest).filter(ChangeRequest.status == "REJECTED").count()
        recent_submissions = (
            db.query(ChangeRequest)
            .order_by(ChangeRequest.created_at.desc())
            .limit(5)
            .all()
        )
    else:
        my_requests = db.query(ChangeRequest).filter(ChangeRequest.requester_id == current_user.id).all()
        total_my_requests = len(my_requests)
        my_pending = sum(1 for r in my_requests if r.status == "SUBMITTED")
        my_approved = sum(1 for r in my_requests if r.status == "APPROVED")
        my_published = sum(1 for r in my_requests if r.status == "PUBLISHED")
        my_rejected = sum(1 for r in my_requests if r.status == "REJECTED")
        recent_submissions = (
            db.query(ChangeRequest)
            .filter(ChangeRequest.requester_id == current_user.id)
            .order_by(ChangeRequest.created_at.desc())
            .limit(5)
            .all()
        )

    total_published_doa = db.query(DOARecord).filter(DOARecord.status == "PUBLISHED").count()

    return {
        "role": current_user.role,
        "persona_type": getattr(current_user, "persona_type", "FRONTEND_USER"),
        "designation": getattr(current_user, "designation", "Analyst"),
        "department": getattr(current_user, "department", "Operations"),
        "user_name": current_user.full_name,
        "total_my_requests": total_my_requests,
        "my_pending": my_pending,
        "my_approved": my_approved,
        "my_published": my_published,
        "my_rejected": my_rejected,
        "total_published_doa": total_published_doa,
        "recent_submissions": [format_cr_response(cr) for cr in recent_submissions]
    }

@router.get("/doa", response_model=List[DOARead])
def get_user_doa_matrix(
    parent_function: Optional[str] = Query(None),
    business_line: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_normal_user)
):
    """Normal user access to search published DOA master rules."""
    return doa_service.get_doa_records(
        db=db,
        parent_function=parent_function,
        business_line=business_line,
        status="PUBLISHED",
        search=search
    )

@router.get("/designation-matrix")
def get_designation_wise_authorities(
    designation_key: str = Query("ceo", description="Column key e.g. board_of_directors, gceo, ceo, chairman, c_level1, board_committees"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_normal_user)
):
    """
    Functionality 5: View designation-wise authorities under one window.
    Filters all published authorities where the chosen designation possesses an explicit authority role
    (Approve, Endorse, Recommend, Notification) with exact action highlighting.
    """
    all_published = db.query(DOARecord).filter(DOARecord.status == "PUBLISHED").all()
    results = []

    for r in all_published:
        val = getattr(r, designation_key, None) or ""
        val = val.strip()
        if val:
            # Determine action category
            action_type = "OTHER"
            v_upper = val.upper()
            if "A" in v_upper or "APPROVE" in v_upper:
                action_type = "APPROVE"
            elif "E" in v_upper or "ENDORSE" in v_upper:
                action_type = "ENDORSE"
            elif "R" in v_upper or "RECOMMEND" in v_upper:
                action_type = "RECOMMEND"
            elif "N" in v_upper or "NOTIFY" in v_upper:
                action_type = "NOTIFICATION"

            results.append({
                "id": r.id,
                "function": r.function,
                "business_line": r.business_line,
                "decision_area": r.decision_area,
                "key_non_key": r.key_non_key,
                "authority_code": val,
                "action_type": action_type,
                "composite_authority": r.composite_authority,
                "policy_reference": getattr(r, "policy_reference", ""),
                "charter_section": getattr(r, "charter_section", ""),
                "regulatory_requirement": getattr(r, "regulatory_requirement", ""),
                "effective_date": r.effective_date
            })

    return {
        "designation_key": designation_key,
        "total_authorities": len(results),
        "authorities": results
    }

@router.get("/reports/management")
def get_management_reports(
    report_type: str = Query("active_by_dept", description="active_by_dept, pending_approvals, recently_modified, regulatory_mandated, high_risk"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_normal_user)
):
    """
    Functionality 7: Management Reports - generate pre-set reports
    """
    if report_type == "pending_approvals":
        crs = db.query(ChangeRequest).filter(ChangeRequest.status == "SUBMITTED").all()
        return {
            "title": "Pending Governance Approval Requests",
            "count": len(crs),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "data": [format_cr_response(c) for c in crs]
        }
    elif report_type == "recently_modified":
        # Records with current_version > 1 or modified recently
        records = db.query(DOARecord).filter(DOARecord.current_version > 1).order_by(DOARecord.modified_at.desc()).limit(50).all()
        if not records:
            records = db.query(DOARecord).order_by(DOARecord.id.desc()).limit(20).all()
        return {
            "title": "Recently Modified Authorities (Version 2+ Updates)",
            "count": len(records),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "data": [record_to_dict(r) for r in records]
        }
    elif report_type == "regulatory_mandated":
        records = db.query(DOARecord).filter(DOARecord.regulatory == "Y").all()
        return {
            "title": "Regulatory Mandated Authorities Register",
            "count": len(records),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "data": [record_to_dict(r) for r in records]
        }
    elif report_type == "high_risk":
        records = db.query(DOARecord).filter(DOARecord.key_non_key == "Key").all()
        return {
            "title": "High-Risk & Key Strategic Decisions DOA Report",
            "count": len(records),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "data": [record_to_dict(r) for r in records]
        }
    else: # active_by_dept
        all_published = db.query(DOARecord).filter(DOARecord.status == "PUBLISHED").all()
        by_function = {}
        for r in all_published:
            fn = r.parent_function or r.function or "General"
            by_function[fn] = by_function.get(fn, 0) + 1
        return {
            "title": "Active Delegations by Department & Function",
            "count": len(all_published),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "summary_by_function": by_function,
            "data": [record_to_dict(r) for r in all_published]
        }

@router.get("/hr-integration")
def get_hr_integration_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_normal_user)
):
    """
    Functionality 9: HR System Integration simulation for live designations,
    reporting lines, vacancy detection, and acting authority routing.
    """
    from app.database.models import HREmployee
    emps = db.query(HREmployee).all()
    return {
        "status": "CONNECTED",
        "last_sync": datetime.now(timezone.utc).isoformat(),
        "total_synced_positions": len(emps),
        "vacancies_detected": sum(1 for e in emps if e.is_vacant),
        "acting_delegations_active": sum(1 for e in emps if e.acting_authority_name),
        "employees": [
            {
                "emp_code": e.emp_code,
                "full_name": e.full_name,
                "email": e.email,
                "designation": e.designation,
                "doa_designation_key": e.doa_designation_key,
                "department": e.department,
                "reporting_to_name": e.reporting_to_name,
                "is_vacant": e.is_vacant,
                "acting_authority_name": e.acting_authority_name,
                "acting_authority_email": e.acting_authority_email,
                "acting_valid_until": e.acting_valid_until,
            }
            for e in emps
        ]
    }

@router.get("/my-requests", response_model=List[ChangeRequestRead])
def get_my_change_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_normal_user)
):
    """Fetch only change requests authored by this user."""
    crs = change_request_service.get_change_requests(
        db=db,
        user_id=current_user.id,
        is_admin=False
    )
    return [format_cr_response(cr) for cr in crs]

@router.post("/proposals", response_model=ChangeRequestRead)
def submit_proposal(
    payload: ChangeRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_normal_user)
):
    """Submit a new rule proposal (ADD, MODIFY, or DELETE)."""
    cr = change_request_service.create_change_request(db, payload, current_user)
    return format_cr_response(cr)
