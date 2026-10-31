from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import json

from app.database.database import get_db
from app.database.models import User, DOARecord
from app.database.supplementary_models import (
    AuthoritativeSource,
    ControlledExpenditureLimit,
    ExceptionRequest,
    LegalEntity,
    CrossGeographyMapping,
    PeriodicCertification,
    GovernanceFinding,
    TemporaryDelegation
)
from app.core.dependencies import get_current_user, require_roles
from app.schemas.supplementary_schemas import (
    DecisionAreaValidationRequest,
    DecisionAreaValidationResponse,
    ExceptionCreateRequest,
    ExceptionActionRequest,
    ExceptionResponse,
    AuthoritativeSourceCreate,
    AuthoritativeSourceUpdate,
    SourceImpactAssessmentResponse,
    CrossGeographyCompareRequest,
    CrossGeographyCompareResponse,
    BahrainKsaAlignmentReportResponse,
    PointInTimeReconstructRequest,
    PointInTimeReconstructResponse,
    PeriodicCertificationAction,
    TemporaryDelegationCreate
)
from app.services import decision_area_validation_service
from app.services import exception_workflow_service
from app.services import supplementary_governance_service
from app.services.audit_service import log_audit

router = APIRouter(prefix="/supplementary", tags=["Supplementary BRD Governance APIs"])

# Role guards
require_any_authenticated = get_current_user
require_gov_or_admin = require_roles(["ADMIN", "SYSTEM_ADMINISTRATOR", "DOA_ADMINISTRATOR", "GOVERNANCE_TEAM"])
require_senior_governance = require_roles(["ADMIN", "DOA_ADMINISTRATOR", "GOVERNANCE_TEAM"])

# =============================================================================
# 1. VAL-01 to VAL-12: Decision Area Submission & Pre-Flight Validation
# =============================================================================
@router.post("/validate-proposal", response_model=DecisionAreaValidationResponse)
def validate_proposal(
    payload: DecisionAreaValidationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    VAL-01 to VAL-12: Comprehensive validation engine.
    Checks supporting documentation, P-R-E-A sequence, Audit Committee position,
    Board/Shareholder governance, SoD conflict, financial limits, and classification.
    """
    return decision_area_validation_service.validate_decision_area_proposal(
        db=db,
        req=payload,
        current_user=current_user
    )

# =============================================================================
# 2. Section 4.3: Exception Workflow (Reporting Mgr -> Div Head -> Governance)
# =============================================================================
@router.post("/exceptions", response_model=ExceptionResponse)
def raise_exception_request(
    payload: ExceptionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    Submit an exception request when a proposed decision area cannot comply
    with one or more validation principles due to regulatory or business reasons.
    """
    exc = exception_workflow_service.create_exception_request(
        db=db,
        payload=payload,
        current_user=current_user
    )
    return exception_workflow_service.format_exception_response(exc)

@router.get("/exceptions", response_model=List[ExceptionResponse])
def list_exception_requests(
    stage_filter: Optional[str] = Query(None, description="PENDING_REPORTING_MGR, PENDING_DIVISION_HEAD, PENDING_GOVERNANCE, APPROVED"),
    status_filter: Optional[str] = Query(None, description="SUBMITTED, IN_REVIEW, APPROVED, REJECTED, RETURNED"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    Section 4.5: Live, permission-controlled reporting of exceptional decision areas.
    """
    query = db.query(ExceptionRequest)
    if stage_filter:
        query = query.filter(ExceptionRequest.current_stage == stage_filter)
    if status_filter:
        query = query.filter(ExceptionRequest.status == status_filter)
    
    # Non-admin users see exceptions they raised or where they are designated reviewer
    if current_user.role not in ["ADMIN", "SYSTEM_ADMINISTRATOR", "DOA_ADMINISTRATOR", "GOVERNANCE_TEAM"]:
        query = query.filter(
            (ExceptionRequest.requester_id == current_user.id) |
            (ExceptionRequest.reporting_mgr_email == current_user.email) |
            (ExceptionRequest.division_head_email == current_user.email)
        )

    exceptions = query.order_by(ExceptionRequest.created_at.desc()).all()
    return [exception_workflow_service.format_exception_response(e) for e in exceptions]

@router.get("/exceptions/{exception_id}", response_model=ExceptionResponse)
def get_exception_details(
    exception_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """Fetch complete details, rationale, and decision history of an exception request."""
    exc = db.query(ExceptionRequest).filter(ExceptionRequest.id == exception_id).first()
    if not exc:
        raise HTTPException(status_code=404, detail="Exception request not found")
    return exception_workflow_service.format_exception_response(exc)

@router.post("/exceptions/{exception_id}/action", response_model=ExceptionResponse)
def action_exception_request(
    exception_id: str,
    payload: ExceptionActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    Action an exception request:
    - Reporting Manager: APPROVE, RETURN, AMEND
    - Division Head: APPROVE, RETURN, AMEND
    - Senior Governance Reviewer: APPROVE, REJECT, RETURN
    """
    exc = exception_workflow_service.process_exception_action(
        db=db,
        exception_id=exception_id,
        action_data=payload,
        current_user=current_user
    )
    return exception_workflow_service.format_exception_response(exc)

# =============================================================================
# 3. VAL-01: Authoritative Sources & Impact Assessment
# =============================================================================
@router.get("/authoritative-sources")
def list_authoritative_sources(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """List structured authoritative sources (policies, charters, resolutions, laws)."""
    return db.query(AuthoritativeSource).filter(AuthoritativeSource.status == "ACTIVE").all()

@router.post("/authoritative-sources")
def create_authoritative_source(
    payload: AuthoritativeSourceCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_gov_or_admin)
):
    """Create a new authoritative source link."""
    count = db.query(AuthoritativeSource).count() + 1
    src_id = f"SRC-{payload.source_type[:3].upper()}-{count:03d}"
    src = AuthoritativeSource(
        id=src_id,
        name=payload.name,
        source_type=payload.source_type,
        source_owner=payload.source_owner,
        reference=payload.reference,
        version=payload.version,
        effective_date=payload.effective_date,
        expiry_review_date=payload.expiry_review_date,
        relevant_clause=payload.relevant_clause,
        jurisdiction=payload.jurisdiction or "All",
        status="ACTIVE"
    )
    db.add(src)
    db.commit()
    db.refresh(src)
    return src

@router.post("/authoritative-sources/{source_id}/trigger-impact", response_model=SourceImpactAssessmentResponse)
def trigger_source_impact_assessment(
    source_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_gov_or_admin)
):
    """
    VAL-01: A source change shall flag linked decision areas for impact review
    and identify authority differing from the current source.
    """
    res = supplementary_governance_service.trigger_source_change_impact(
        db=db,
        source_id=source_id,
        admin_user=admin_user
    )
    return SourceImpactAssessmentResponse(
        source_id=res["source_id"],
        source_name=res["source_name"],
        flagged_decision_areas_count=res["flagged_decision_areas_count"],
        impacted_decision_areas=res["impacted_decision_areas"]
    )

# =============================================================================
# 4. VAL-11: Controlled Expenditure Limits List
# =============================================================================
@router.get("/expenditure-limits")
def list_controlled_expenditure_limits(
    category_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """VAL-11: Controlled pre-approved expenditure limits with source reference links."""
    q = db.query(ControlledExpenditureLimit).filter(ControlledExpenditureLimit.is_active == True)
    if category_filter:
        q = q.filter(ControlledExpenditureLimit.category == category_filter)
    return q.all()

# =============================================================================
# 5. Section 4.4 & Acceptance Criteria: Cross-Geography Comparison & Alignment
# =============================================================================
@router.post("/cross-geography/compare", response_model=CrossGeographyCompareResponse)
def compare_cross_geography(
    payload: CrossGeographyCompareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    Acceptance Criteria: Compare related decision areas across geographies
    (Bahrain vs KSA), returning match status, mismatch reasons, and required outcome.
    """
    return supplementary_governance_service.compare_cross_geography_decision_areas(
        db=db,
        decision_area_code=payload.decision_area_code,
        source_entity_id=payload.source_entity_id,
        target_entity_id=payload.target_entity_id
    )

@router.get("/reports/bahrain-ksa-alignment", response_model=BahrainKsaAlignmentReportResponse)
def get_bahrain_ksa_alignment_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    Acceptance Criteria: Bahrain–KSA alignment report reconciling underlying mapped decision areas,
    separating complete matches from mismatches, identifying every applicable mismatch reason,
    and recording required alignment outcome for each mismatched item.
    """
    return supplementary_governance_service.generate_bahrain_ksa_alignment_report(db=db)

# =============================================================================
# 6. Section 5: Point-in-Time Reconstruction of DOA
# =============================================================================
@router.post("/point-in-time/reconstruct", response_model=PointInTimeReconstructResponse)
def point_in_time_reconstruction(
    payload: PointInTimeReconstructRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    Section 5: Select a historical date and reconstruct the exact decision area,
    authority holders, limits, conditions, entity, and version that was effective on that date.
    """
    return supplementary_governance_service.reconstruct_point_in_time_doa(
        db=db,
        doa_id=payload.doa_id,
        target_date=payload.target_date
    )

# =============================================================================
# 7. Section 5: Periodic Certification
# =============================================================================
@router.get("/certifications")
def list_certifications(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """Section 5: View periodic certification cycle status and overdue records."""
    q = db.query(PeriodicCertification)
    if status_filter:
        q = q.filter(PeriodicCertification.status == status_filter)
    return q.all()

@router.post("/certifications/{certification_id}/action")
def action_certification(
    certification_id: int,
    payload: PeriodicCertificationAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """Action a periodic certification record (Designated Owner or Governance Reviewer)."""
    return supplementary_governance_service.process_periodic_certification(
        db=db,
        certification_id=certification_id,
        decision=payload.decision,
        comments=payload.comments,
        current_user=current_user
    )

# =============================================================================
# 8. Section 4.4: Temporary / Acting Delegations
# =============================================================================
@router.get("/temporary-delegations")
def list_temporary_delegations(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """List temporary delegations with ceiling, duration, and expiration status."""
    q = db.query(TemporaryDelegation)
    if active_only:
        q = q.filter(TemporaryDelegation.is_active == True)
    return q.all()

@router.post("/temporary-delegations")
def create_temporary_delegation(
    payload: TemporaryDelegationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    Section 4.4: Create a temporary delegation with defined start date, end date,
    scope, authority ceiling, reason, and approval record.
    """
    count = db.query(TemporaryDelegation).count() + 1
    del_id = f"DEL-{count:04d}"
    delegation = TemporaryDelegation(
        id=del_id,
        delegator_email=payload.delegator_email,
        delegator_designation=payload.delegator_designation,
        recipient_email=payload.recipient_email,
        recipient_designation=payload.recipient_designation,
        start_date=payload.start_date,
        end_date=payload.end_date,
        scope=payload.scope,
        authority_ceiling=payload.authority_ceiling,
        reason=payload.reason,
        approved_by_email=current_user.email,
        approval_record=f"Approved by {current_user.full_name} on {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
        is_active=True
    )
    db.add(delegation)
    db.commit()
    db.refresh(delegation)
    return delegation

# =============================================================================
# 9. Section 5: Configurable Governance Findings
# =============================================================================
@router.get("/findings")
def list_governance_findings(
    status_filter: Optional[str] = "OPEN",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin)
):
    """
    Section 5: Configurable validation checks for duplicate/overlapping decision areas,
    conflicting authority limits, missing final approvers, and expired sources.
    """
    q = db.query(GovernanceFinding)
    if status_filter:
        q = q.filter(GovernanceFinding.status == status_filter)
    return q.all()
