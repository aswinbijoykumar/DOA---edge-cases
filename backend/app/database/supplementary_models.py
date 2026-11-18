from datetime import datetime, timezone
import json
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float
)
from sqlalchemy.orm import relationship
from app.database.database import Base

def utcnow():
    return datetime.now(timezone.utc)

# 1. Authoritative Governance Source Links (VAL-01, Section 5)
class AuthoritativeSource(Base):
    __tablename__ = "authoritative_sources"

    id = Column(String(50), primary_key=True, index=True) # e.g. "SRC-POL-001"
    name = Column(String(255), nullable=False) # e.g. "Board Treasury Policy"
    source_type = Column(String(100), nullable=False) # Policy, Committee Charter, Board Resolution, Shareholder Resolution, Power of Attorney, Regulatory Requirement
    source_owner = Column(String(255), nullable=False) # e.g. "Chief Financial Officer"
    reference = Column(String(255), nullable=False) # Document ref / clause
    version = Column(String(50), default="1.0")
    effective_date = Column(String(50), nullable=False)
    expiry_review_date = Column(String(50), nullable=True)
    relevant_clause = Column(Text, nullable=True) # e.g. "Section 4.2 - Capital Commitments"
    jurisdiction = Column(String(50), default="All") # Bahrain, KSA, UAE, All
    status = Column(String(50), default="ACTIVE") # ACTIVE, EXPIRED, UNDER_REVISION
    created_at = Column(DateTime(timezone=True), default=utcnow)
    modified_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relationship to links
    decision_area_links = relationship("DecisionAreaSourceLink", back_populates="source", cascade="all, delete-orphan")


class DecisionAreaSourceLink(Base):
    __tablename__ = "decision_area_source_links"

    id = Column(Integer, primary_key=True, index=True)
    doa_id = Column(String(50), ForeignKey("doa_records.id"), nullable=False, index=True)
    source_id = Column(String(50), ForeignKey("authoritative_sources.id"), nullable=False, index=True)
    source_owner = Column(String(255), nullable=True)
    reference = Column(String(255), nullable=True)
    version = Column(String(50), nullable=True)
    effective_date = Column(String(50), nullable=True)
    expiry_review_date = Column(String(50), nullable=True)
    relevant_clause = Column(Text, nullable=True)
    impact_review_required = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    source = relationship("AuthoritativeSource", back_populates="decision_area_links")
    doa_record = relationship("DOARecord")


# 2. Controlled Expenditure Limits (VAL-11)
class ControlledExpenditureLimit(Base):
    __tablename__ = "controlled_expenditure_limits"

    id = Column(String(50), primary_key=True, index=True) # e.g. "LIM-FIN-01"
    code = Column(String(100), nullable=False, unique=True) # e.g. "CAPEX_TIER_1"
    name = Column(String(255), nullable=False)
    currency = Column(String(10), default="BHD") # BHD, SAR, USD
    amount = Column(Float, nullable=False) # e.g. 100000.00
    category = Column(String(100), nullable=False) # Capex, Opex, Credit, Procurement
    source_reference = Column(String(255), nullable=False) # Link to approved source document
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)


# 3. Exception Requests (VAL-01, Section 4.3, 4.5)
# Route: Requester -> Reporting Mgr -> Division Head -> Governance Team (Senior Reviewer)
class ExceptionRequest(Base):
    __tablename__ = "exception_requests"

    id = Column(String(50), primary_key=True, index=True) # e.g. "EXC-0001"
    change_request_id = Column(String(50), ForeignKey("change_requests.id"), nullable=True, index=True)
    doa_id = Column(String(50), ForeignKey("doa_records.id"), nullable=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    requester_email = Column(String(255), nullable=False)
    
    exception_type = Column(String(100), nullable=False) # e.g. EVIDENCE_EXCEPTION, SEQUENCE_EXCEPTION, SOD_EXCEPTION, LIMIT_EXCEPTION, OTHER
    deviated_principles = Column(Text, nullable=False) # JSON list of validation rules deviated from (e.g. ["VAL-01", "VAL-06"])
    rationale = Column(Text, nullable=False) # Documented business/regulatory rationale
    supporting_documents = Column(Text, nullable=True, default="[]") # JSON list of file links
    
    # Workflow Stage: PENDING_REPORTING_MGR -> PENDING_DIVISION_HEAD -> PENDING_GOVERNANCE -> APPROVED / REJECTED / RETURNED
    current_stage = Column(String(100), default="PENDING_REPORTING_MGR", nullable=False)
    status = Column(String(50), default="SUBMITTED", nullable=False) # SUBMITTED, IN_REVIEW, APPROVED, REJECTED, RETURNED
    
    # Reporting Manager Stage
    reporting_mgr_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reporting_mgr_email = Column(String(255), nullable=True)
    reporting_mgr_decision = Column(String(50), nullable=True) # APPROVED, RETURNED, AMENDED
    reporting_mgr_rationale = Column(Text, nullable=True)
    reporting_mgr_decided_at = Column(DateTime(timezone=True), nullable=True)
    
    # Division Head Stage
    division_head_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    division_head_email = Column(String(255), nullable=True)
    division_head_decision = Column(String(50), nullable=True) # APPROVED, RETURNED, AMENDED
    division_head_rationale = Column(Text, nullable=True)
    division_head_decided_at = Column(DateTime(timezone=True), nullable=True)
    
    # Governance Team Senior Reviewer Stage
    governance_reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    governance_reviewer_email = Column(String(255), nullable=True)
    governance_decision = Column(String(50), nullable=True) # APPROVED, REJECTED, RETURNED
    governance_rationale = Column(Text, nullable=True)
    governance_decided_at = Column(DateTime(timezone=True), nullable=True)
    
    effective_date = Column(String(50), nullable=True)
    review_date = Column(String(50), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utcnow)
    modified_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Audit history of intermediate turns
    decision_history = Column(Text, default="[]") # JSON list of stage transitions and comments


# 4. Entity & Geography Mapping (VAL-02, Section 4.4, Acceptance Criteria)
class LegalEntity(Base):
    __tablename__ = "legal_entities"

    id = Column(String(50), primary_key=True, index=True) # e.g. "ENT-BH-01"
    code = Column(String(50), unique=True, nullable=False) # "BAHRAIN_MAIN", "KSA_SUBSIDIARY", "UAE_BRANCH"
    name = Column(String(255), nullable=False)
    geography = Column(String(50), nullable=False) # "Bahrain", "KSA", "UAE", "International"
    currency = Column(String(10), default="BHD") # BHD, SAR, AED, USD
    parent_entity_id = Column(String(50), ForeignKey("legal_entities.id"), nullable=True)
    is_active = Column(Boolean, default=True)


# Cross-Geography Alignment Mapping (Section 4.4, Acceptance Criteria: Bahrain–KSA)
class CrossGeographyMapping(Base):
    __tablename__ = "cross_geography_mappings"

    id = Column(Integer, primary_key=True, index=True)
    decision_area_code = Column(String(100), nullable=False, index=True) # Normalized concept, e.g. "BANK_CAPITAL_ALLOC"
    source_entity_id = Column(String(50), ForeignKey("legal_entities.id"), nullable=False)
    source_doa_id = Column(String(50), ForeignKey("doa_records.id"), nullable=False)
    target_entity_id = Column(String(50), ForeignKey("legal_entities.id"), nullable=False)
    target_doa_id = Column(String(50), ForeignKey("doa_records.id"), nullable=True) # Null if missing in target
    
    match_status = Column(String(50), nullable=False) # COMPLETE_MATCH, MISMATCH, NOT_MAPPED
    mismatch_reasons = Column(Text, default="[]") # JSON list of reasons: AUTHORITY_TIER_DIFF, THRESHOLD_DIFF, COMMITTEE_DIFF, REGULATORY_DIFF
    required_alignment_outcome = Column(Text, nullable=True) # e.g. "Harmonize threshold to SAR 500k"
    last_compared_at = Column(DateTime(timezone=True), default=utcnow)


# 5. Periodic Certification (Section 5)
class PeriodicCertification(Base):
    __tablename__ = "periodic_certifications"

    id = Column(Integer, primary_key=True, index=True)
    doa_id = Column(String(50), ForeignKey("doa_records.id"), nullable=False, index=True)
    cycle_year = Column(Integer, nullable=False) # 2026
    cycle_quarter = Column(String(10), nullable=True) # Q1, Q2, Q3, Q4, Annual
    designated_owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    designated_owner_email = Column(String(255), nullable=False)
    governance_reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    status = Column(String(50), default="PENDING_OWNER") # PENDING_OWNER, PENDING_GOVERNANCE, CERTIFIED, OVERDUE, ESCALATED
    owner_certified_at = Column(DateTime(timezone=True), nullable=True)
    owner_comments = Column(Text, nullable=True)
    governance_confirmed_at = Column(DateTime(timezone=True), nullable=True)
    governance_decision = Column(String(50), nullable=True)
    due_date = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)


# 6. Configurable Finding / Compliance Action Item (Section 5)
class GovernanceFinding(Base):
    __tablename__ = "governance_findings"

    id = Column(String(50), primary_key=True, index=True) # e.g. "FND-2026-001"
    finding_type = Column(String(100), nullable=False) # DUPLICATE_DECISION, CONFLICTING_LIMITS, MISSING_FINAL_APPROVER, INACTIVE_VACANT_AUTHORITY, EXPIRED_SOURCE_DOC, BROKEN_ENTITY_MAP
    severity = Column(String(20), default="MEDIUM") # CRITICAL, HIGH, MEDIUM, LOW
    doa_id = Column(String(50), ForeignKey("doa_records.id"), nullable=True, index=True)
    owner_email = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), default="OPEN") # OPEN, IN_PROGRESS, RESOLVED, WAIVED
    due_date = Column(String(50), nullable=True)
    resolution_record = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    resolved_at = Column(DateTime(timezone=True), nullable=True)


# 7. Temporary Acting Delegation (Section 4.4)
class TemporaryDelegation(Base):
    __tablename__ = "temporary_delegations"

    id = Column(String(50), primary_key=True, index=True) # e.g. "DEL-0001"
    delegator_email = Column(String(255), nullable=False)
    delegator_designation = Column(String(100), nullable=False)
    recipient_email = Column(String(255), nullable=False)
    recipient_designation = Column(String(100), nullable=False)
    
    start_date = Column(String(50), nullable=False)
    end_date = Column(String(50), nullable=False)
    scope = Column(Text, nullable=False) # Scope of authority delegated
    authority_ceiling = Column(String(100), nullable=False) # Cannot exceed delegator ceiling
    reason = Column(Text, nullable=False)
    approved_by_email = Column(String(255), nullable=True)
    approval_record = Column(Text, nullable=True)
    
    is_active = Column(Boolean, default=True)
    expiry_notified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
