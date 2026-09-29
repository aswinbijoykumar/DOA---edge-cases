from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr

# Auth Schemas
class LoginRequest(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    email: str
    full_name: str
    role: str
    persona_type: Optional[str] = "FRONTEND_USER"
    designation: Optional[str] = None
    department: Optional[str] = None
    can_request: bool = True
    can_review: bool = False

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    persona_type: Optional[str] = "FRONTEND_USER"
    designation: Optional[str] = None
    department: Optional[str] = None
    reports_to: Optional[str] = None
    is_active: bool
    can_request: bool = True
    can_review: bool = False

    class Config:
        from_attributes = True

# DOA Schemas
class DOABase(BaseModel):
    id: str
    parent_function: str
    function: str
    business_line: str
    category: str
    key_non_key: str = "Key"
    decision_area: str
    shareholders: Optional[str] = ""
    board_of_directors: Optional[str] = ""
    subsidiary_board: Optional[str] = ""
    chairman: Optional[str] = ""
    board_committees: Optional[str] = ""
    board_committees_op: Optional[str] = ""
    board_committees2: Optional[str] = ""
    board_committees2_op: Optional[str] = ""
    gceo: Optional[str] = ""
    ceo: Optional[str] = ""
    mgmt_committees: Optional[str] = ""
    mgmt_committees_op: Optional[str] = ""
    mgmt_committees2: Optional[str] = ""
    mgmt_committees2_op: Optional[str] = ""
    c_level1: Optional[str] = ""
    c_level1_op: Optional[str] = ""
    c_level2: Optional[str] = ""
    c_level2_op: Optional[str] = ""
    comments: Optional[str] = ""
    regulatory: str = "N"
    composite_authority: str
    rationale: Optional[str] = ""
    status: str = "PUBLISHED"
    effective_date: Optional[str] = "2026-01-01"
    review_date: Optional[str] = "2027-01-01"
    policy_reference: Optional[str] = ""
    charter_section: Optional[str] = ""
    regulatory_requirement: Optional[str] = ""
    process_name: Optional[str] = ""
    attachments: Optional[str] = "[]"

class DOACreate(DOABase):
    pass

class DOARead(DOABase):
    current_version: int
    created_by: Optional[str] = "System"
    created_at: Optional[datetime] = None
    modified_by: Optional[str] = None
    modified_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DOAVersionRead(BaseModel):
    id: int
    doa_id: str
    version_number: int
    status: str
    effective_date: Optional[str]
    snapshot: Dict[str, Any]
    change_request_id: Optional[str]
    created_by: Optional[str]
    created_at: Optional[datetime]
    policy_reference: Optional[str] = ""
    charter_section: Optional[str] = ""
    regulatory_requirement: Optional[str] = ""

    class Config:
        from_attributes = True

# Change Request Schemas
class ChangeRequestCreate(BaseModel):
    request_type: str # ADD, MODIFY, DELETE, RETIRE
    doa_id: Optional[str] = None
    department: Optional[str] = None
    process: Optional[str] = None
    rationale: Optional[str] = None
    currency: Optional[str] = "USD"
    current_limit: Optional[str] = None
    proposed_limit: Optional[str] = None
    effective_date: Optional[str] = None
    priority: Optional[str] = "MEDIUM" # LOW, MEDIUM, HIGH, CRITICAL
    due_date: Optional[str] = None
    risk_impact: Optional[str] = None
    base_version: int = 1
    proposed_value: Dict[str, Any] # Contains fields proposed
    operational_impact: Optional[str] = None
    attachments: Optional[List[Dict[str, Any]]] = None

class ChangeRequestUpdate(BaseModel):
    department: Optional[str] = None
    process: Optional[str] = None
    rationale: Optional[str] = None
    currency: Optional[str] = None
    current_limit: Optional[str] = None
    proposed_limit: Optional[str] = None
    effective_date: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    risk_impact: Optional[str] = None
    proposed_value: Optional[Dict[str, Any]] = None
    operational_impact: Optional[str] = None
    attachments: Optional[List[Dict[str, Any]]] = None

class ActionDecision(BaseModel):
    comment: Optional[str] = None
    operational_impact: Optional[str] = None

class ReviewerRecommendationPayload(BaseModel):
    recommendation: str # RECOMMEND_APPROVAL, RECOMMEND_REJECTION
    notes: str
    operational_comments: Optional[str] = None

class ReviewerCommentPayload(BaseModel):
    comment: str
    operational_comments: Optional[str] = None

class ClarificationCreate(BaseModel):
    message: str
    attachments: Optional[List[Dict[str, Any]]] = None

class ClarificationRead(BaseModel):
    id: int
    change_request_id: str
    user_id: int
    user_email: str
    user_name: str
    message_type: str
    message: str
    attachments: Optional[List[Dict[str, Any]]] = []
    created_at: Optional[datetime]

    class Config:
        from_attributes = True

class NotificationRead(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    link: Optional[str] = None
    notification_type: str
    is_read: bool
    created_at: Optional[datetime]

    class Config:
        from_attributes = True

class ChangeRequestRead(BaseModel):
    id: str
    request_type: str
    doa_id: Optional[str]
    requester_id: int
    requester_email: str
    department: Optional[str]
    process: Optional[str]
    rationale: Optional[str]
    currency: Optional[str] = "USD"
    current_limit: Optional[str] = None
    proposed_limit: Optional[str] = None
    effective_date: Optional[str] = None
    priority: Optional[str] = "MEDIUM"
    due_date: Optional[str] = None
    risk_impact: Optional[str] = None
    base_version: int
    current_value: Optional[Dict[str, Any]] = None
    proposed_value: Dict[str, Any]
    status: str # DRAFT, SUBMITTED, UNDER_REVIEW, CLARIFICATION_REQUIRED, APPROVED, REJECTED, PUBLISHED
    reviewer_id: Optional[int] = None
    reviewer_email: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    decision_comment: Optional[str] = None
    reviewer_recommendation: Optional[str] = None # RECOMMEND_APPROVAL, RECOMMEND_REJECTION
    reviewer_comments: Optional[str] = None
    operational_comments: Optional[str] = None
    operational_impact: Optional[str] = None
    attachments: Optional[List[Dict[str, Any]]] = []
    clarifications: Optional[List[ClarificationRead]] = []
    created_at: Optional[datetime]
    submitted_at: Optional[datetime] = None
    published_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Diff Schemas
class FieldDiff(BaseModel):
    field: str
    field_label: str
    current_value: Any
    proposed_value: Any
    change_type: str # ADDED, MODIFIED, REMOVED, UNCHANGED

class DiffResponse(BaseModel):
    change_request_id: str
    request_type: str
    doa_id: Optional[str]
    base_version: int
    current_doa_version: Optional[int]
    is_stale: bool
    diffs: List[FieldDiff]

# Audit Log Schemas
class AuditLogRead(BaseModel):
    id: int
    user_id: Optional[int]
    user_email: str
    role: str
    action: str
    entity: str
    record_id: str
    timestamp: datetime
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    comment: Optional[str] = None

    class Config:
        from_attributes = True

# Dashboard Summary
class DashboardSummary(BaseModel):
    total_published: int
    total_doa_records: int
    key_decisions_count: int
    regulatory_mandated_count: int
    risk_records_count: int
    finance_records_count: int
    pending_requests: int
    approved_requests: int
    rejected_requests: int
    published_requests: int
    total_change_requests: int

# Governance Action Schemas
class GovernanceActionPayload(BaseModel):
    comment: Optional[str] = None
    stakeholders: Optional[List[str]] = None
    target_committee: Optional[str] = None
    reason: Optional[str] = None

