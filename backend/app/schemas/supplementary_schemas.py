from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# -------------------------------------------------------------
# VAL-01 to VAL-12: BRD Validation Schemas
# -------------------------------------------------------------

class DecisionAreaValidationRequest(BaseModel):
    # VAL-02: Mandatory validation fields
    decision_area: str
    parent_function: str  # Finance / Risk
    business_line: str
    requester_email: Optional[str] = None
    proposer: str  # P
    reviewer: str  # R
    endorser: Optional[str] = None  # E (applicable)
    final_approver: str  # A (VAL-12: Clearly identified final approving authority)
    rationale: str
    supporting_documentation: Optional[List[Dict[str, Any]]] = None  # VAL-01
    entity_or_geography: Optional[str] = "Bahrain"
    proposed_effective_date: Optional[str] = "2026-01-01"

    # Financial Classification & Limits (VAL-10, VAL-11)
    is_financial: bool = False
    monetary_amount: Optional[float] = None
    currency: Optional[str] = "BHD"
    linked_expenditure_limit_id: Optional[str] = None

    # Governance sequence details (VAL-03, VAL-07, VAL-08, VAL-09)
    governance_pathway: Optional[List[Dict[str, str]]] = None
    board_committees_involved: Optional[List[str]] = None
    is_board_final_approver: Optional[bool] = False
    is_shareholders_final_approver: Optional[bool] = False

    # Authoritative Source Links (VAL-01)
    authoritative_source_ids: Optional[List[str]] = None

    # Exception Flag
    has_approved_exception: Optional[bool] = False
    exception_request_id: Optional[str] = None


class ValidationRuleResult(BaseModel):
    rule_code: str
    rule_name: str
    status: str  # "PASS", "FAIL", "WARNING"
    severity: str  # "HARD_STOP", "WARNING", "INFO"
    message: str


class DecisionAreaValidationResponse(BaseModel):
    is_valid: bool
    can_submit: bool
    classification: str  # "Board-level DOA" or "Management-level DOA" (VAL-04, VAL-05)
    rule_results: List[ValidationRuleResult]
    hard_stop_errors: List[str]
    warnings: List[str]
    requires_exception_workflow: bool


# -------------------------------------------------------------
# Section 4.3: Exception Workflow Schemas
# -------------------------------------------------------------

class ExceptionCreateRequest(BaseModel):
    change_request_id: Optional[str] = None
    doa_id: Optional[str] = None
    decision_area_id: Optional[str] = None
    decision_area_title: Optional[str] = None
    entity: Optional[str] = None
    exception_type: str = "POLICY_VARIANCE"
    deviated_principles: Optional[List[str]] = None
    deviated_validation_rules: Optional[List[str]] = None
    rationale: Optional[str] = None
    regulatory_or_business_rationale: Optional[str] = None
    reporting_manager_email: Optional[str] = None
    division_head_email: Optional[str] = None
    supporting_documents: Optional[List[Dict[str, Any]]] = None
    supporting_evidence_files: Optional[List[Any]] = None
    proposed_effective_date: Optional[str] = None
    review_date: Optional[str] = None


class ExceptionActionRequest(BaseModel):
    action: str  # "APPROVE", "RETURN", "AMEND", "REJECT"
    comment: Optional[str] = None  # Mandatory rationale at every stage
    rationale: Optional[str] = None  # Support rationale field from frontend
    amended_payload: Optional[Dict[str, Any]] = None

    @property
    def final_comment(self) -> str:
        return self.comment or self.rationale or ""


class ExceptionResponse(BaseModel):
    id: str
    change_request_id: Optional[str] = None
    doa_id: Optional[str] = None
    decision_area_title: Optional[str] = None
    entity: Optional[str] = None
    requester_email: str
    exception_type: str
    deviated_principles: List[str]
    deviated_validation_rules: List[str] = []
    rationale: str
    regulatory_or_business_rationale: Optional[str] = None
    supporting_documents: List[Dict[str, Any]]
    current_stage: str  # PENDING_REPORTING_MGR, PENDING_DIVISION_HEAD, PENDING_GOVERNANCE, APPROVED, REJECTED, RETURNED_TO_REQUESTER
    status: str
    reporting_mgr_email: Optional[str] = None
    reporting_mgr_decision: Optional[str] = None
    division_head_email: Optional[str] = None
    division_head_decision: Optional[str] = None
    governance_reviewer_email: Optional[str] = None
    governance_decision: Optional[str] = None
    decision_history: List[Dict[str, Any]]
    created_at: Optional[datetime] = None


# -------------------------------------------------------------
# Section 4.1: Authoritative Sources & Source Change Schemas
# -------------------------------------------------------------

class AuthoritativeSourceCreate(BaseModel):
    name: str
    source_type: str
    source_owner: str
    reference: str
    version: str = "1.0"
    effective_date: str
    expiry_review_date: Optional[str] = None
    relevant_clause: Optional[str] = None
    jurisdiction: Optional[str] = "All"


class AuthoritativeSourceUpdate(BaseModel):
    name: Optional[str] = None
    source_owner: Optional[str] = None
    version: Optional[str] = None
    effective_date: Optional[str] = None
    expiry_review_date: Optional[str] = None
    relevant_clause: Optional[str] = None
    status: Optional[str] = None


class SourceImpactAssessmentResponse(BaseModel):
    source_id: str
    source_name: str
    flagged_decision_areas_count: int
    impacted_decision_areas: List[Dict[str, Any]]


# -------------------------------------------------------------
# Section 4.4 & Acceptance Criteria: Cross-Geography Alignment
# -------------------------------------------------------------

class CrossGeographyCompareRequest(BaseModel):
    decision_area_code: str
    source_entity_id: str
    target_entity_id: str


class CrossGeographyCompareResponse(BaseModel):
    decision_area_code: str
    source_geography: str
    target_geography: str
    match_status: str  # "COMPLETE_MATCH", "MISMATCH", "NOT_MAPPED"
    source_record: Optional[Dict[str, Any]]
    target_record: Optional[Dict[str, Any]]
    mismatch_reasons: List[str]
    required_alignment_outcome: Optional[str]
    timestamp: str


class BahrainKsaAlignmentReportResponse(BaseModel):
    report_title: str
    generated_at: str
    alignment_percentage: int
    total_decision_areas_mapped: int
    complete_matches_count: int
    mismatches_count: int
    not_mapped_count: int
    complete_matches: List[Dict[str, Any]] = []
    mismatches: List[Dict[str, Any]] = []
    alignment_records: List[Dict[str, Any]]


# -------------------------------------------------------------
# Section 5: Point-in-Time Reconstruction & Periodic Certification
# -------------------------------------------------------------

class PointInTimeReconstructRequest(BaseModel):
    doa_id: Optional[str] = None
    target_date: str  # YYYY-MM-DD
    entity_code: Optional[str] = None
    entity: Optional[str] = None


class PointInTimeReconstructResponse(BaseModel):
    doa_id: Optional[str] = None
    selected_date: str
    target_date: str
    entity_scope: str = "ALL"
    effective_version: Optional[int] = None
    status_at_date: str = "PUBLISHED"
    record_snapshot: Optional[Dict[str, Any]] = None
    active_governance_pathway: Optional[str] = None
    linked_authoritative_sources: List[Dict[str, Any]] = []
    total_records_effective: int = 0
    effective_records: List[Dict[str, Any]] = []


class PeriodicCertificationAction(BaseModel):
    certification_id: Optional[int] = None
    decision: str  # "CERTIFIED", "OVERDUE", "ESCALATED"
    comments: str


class TemporaryDelegationCreate(BaseModel):
    delegator_email: str
    delegator_designation: str
    recipient_email: str
    recipient_designation: str
    start_date: str
    end_date: str
    scope: str
    authority_ceiling: str
    reason: str
