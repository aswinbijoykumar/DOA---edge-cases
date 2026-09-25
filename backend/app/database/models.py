from datetime import datetime, timezone
import json
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from app.database.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="NORMAL_USER") # "ADMIN" or "NORMAL_USER"
    persona_type = Column(String(100), nullable=True, default="FRONTEND_USER") # DEPT_OWNER, PROCESS_OWNER, AUTHORITY_OWNER, REVIEWER, APPROVER, FRONTEND_USER, AUDIT_READONLY
    designation = Column(String(100), nullable=True) # e.g. "Head of Finance", "P2P Process Owner", "Chief Risk Officer"
    department = Column(String(100), nullable=True)
    reports_to = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    change_requests = relationship("ChangeRequest", back_populates="requester", foreign_keys="ChangeRequest.requester_id")


class DOARecord(Base):
    __tablename__ = "doa_records"

    id = Column(String(50), primary_key=True, index=True) # e.g. "225" or custom
    parent_function = Column(String(100), nullable=False, index=True) # Finance or Risk
    function = Column(String(100), nullable=False) # Finance / Risk
    business_line = Column(String(255), nullable=False, index=True) # Category/Business line
    category = Column(String(255), nullable=False)
    key_non_key = Column(String(50), default="Key") # Key or Non-Key
    decision_area = Column(Text, nullable=False) # Description of authority / activity
    
    # Authority breakdown
    shareholders = Column(String(100), nullable=True, default="")
    board_of_directors = Column(String(100), nullable=True, default="")
    subsidiary_board = Column(String(100), nullable=True, default="")
    chairman = Column(String(100), nullable=True, default="")
    board_committees = Column(String(100), nullable=True, default="")
    board_committees_op = Column(String(100), nullable=True, default="")
    board_committees2 = Column(String(100), nullable=True, default="")
    board_committees2_op = Column(String(100), nullable=True, default="")
    gceo = Column(String(100), nullable=True, default="")
    ceo = Column(String(100), nullable=True, default="")
    mgmt_committees = Column(String(100), nullable=True, default="")
    mgmt_committees_op = Column(String(100), nullable=True, default="")
    mgmt_committees2 = Column(String(100), nullable=True, default="")
    mgmt_committees2_op = Column(String(100), nullable=True, default="")
    c_level1 = Column(String(100), nullable=True, default="")
    c_level1_op = Column(String(100), nullable=True, default="")
    c_level2 = Column(String(100), nullable=True, default="")
    c_level2_op = Column(String(100), nullable=True, default="")
    
    comments = Column(Text, nullable=True, default="")
    regulatory = Column(String(10), default="N") # Y or N
    composite_authority = Column(Text, nullable=False) # e.g. "Shareholders (A) ➔ BoD (E2)..."
    rationale = Column(Text, nullable=True, default="")

    # Regulatory & Policy Linkages
    policy_reference = Column(String(255), nullable=True, default="") # e.g. "Treasury Policy §4.2 - Capital Commitments"
    charter_section = Column(String(255), nullable=True, default="") # e.g. "Audit Committee Charter Section 3.1"
    regulatory_requirement = Column(String(255), nullable=True, default="") # e.g. "Central Bank Governance Code Reg 12(b)"
    process_name = Column(String(255), nullable=True, default="") # e.g. "Procure-to-Pay (P2P)"
    attachments = Column(Text, nullable=True, default="[]") # JSON list of document metadata
    
    # Versioning and Lifecycle Status
    current_version = Column(Integer, default=1, nullable=False)
    status = Column(String(50), default="PUBLISHED", nullable=False) # DRAFT, PUBLISHED, ARCHIVED
    effective_date = Column(String(50), nullable=True, default="2026-01-01")
    review_date = Column(String(50), nullable=True, default="2027-01-01")
    
    created_by = Column(String(100), default="System")
    created_at = Column(DateTime(timezone=True), default=utcnow)
    modified_by = Column(String(100), nullable=True)
    modified_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    versions = relationship("DOAVersion", back_populates="doa_record", cascade="all, delete-orphan")
    change_requests = relationship("ChangeRequest", back_populates="doa_record")


class DOAVersion(Base):
    __tablename__ = "doa_versions"

    id = Column(Integer, primary_key=True, index=True)
    doa_id = Column(String(50), ForeignKey("doa_records.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    status = Column(String(50), nullable=False) # HISTORICAL, PUBLISHED
    effective_date = Column(String(50), nullable=True)
    snapshot = Column(Text, nullable=False) # Full JSON snapshot of the DOARecord at this version
    change_request_id = Column(String(50), nullable=True)
    created_by = Column(String(100), default="Admin")
    created_at = Column(DateTime(timezone=True), default=utcnow)

    doa_record = relationship("DOARecord", back_populates="versions")


class ChangeRequest(Base):
    __tablename__ = "change_requests"

    id = Column(String(50), primary_key=True, index=True) # e.g. "CR-001"
    request_type = Column(String(50), nullable=False) # ADD, MODIFY, DELETE, RETIRE
    doa_id = Column(String(50), ForeignKey("doa_records.id"), nullable=True, index=True)
    
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    requester_email = Column(String(255), nullable=False)
    
    department = Column(String(100), nullable=True)
    process = Column(String(255), nullable=True)
    rationale = Column(Text, nullable=True)
    
    base_version = Column(Integer, default=1, nullable=False) # Guard for optimistic concurrency / stale check
    current_value = Column(Text, nullable=True) # JSON snapshot of current DOA state
    proposed_value = Column(Text, nullable=False) # JSON snapshot of proposed changes
    
    status = Column(String(50), default="SUBMITTED", nullable=False) # DRAFT, SUBMITTED, APPROVED, REJECTED, PUBLISHED
    
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewer_email = Column(String(255), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    decision_comment = Column(Text, nullable=True)
    operational_impact = Column(Text, nullable=True) # Operational impact analysis from Process Owner
    attachments = Column(Text, nullable=True, default="[]") # JSON list of uploaded doc references
    
    created_at = Column(DateTime(timezone=True), default=utcnow)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)

    requester = relationship("User", foreign_keys=[requester_id], back_populates="change_requests")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    doa_record = relationship("DOARecord", back_populates="change_requests")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    user_email = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False, index=True) # SUBMIT_CHANGE, APPROVE_CHANGE, REJECT_CHANGE, PUBLISH_CHANGE, CREATE_DOA, ARCHIVE_DOA
    entity = Column(String(50), nullable=False) # DOA_RECORD, CHANGE_REQUEST
    record_id = Column(String(50), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), default=utcnow)
    old_value = Column(Text, nullable=True) # JSON string
    new_value = Column(Text, nullable=True) # JSON string
    comment = Column(Text, nullable=True)


class HREmployee(Base):
    __tablename__ = "hr_employees"

    id = Column(Integer, primary_key=True, index=True)
    emp_code = Column(String(50), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    designation = Column(String(100), nullable=False) # e.g. "Chief Financial Officer"
    doa_designation_key = Column(String(50), nullable=False) # c_level1, ceo, gceo, board_committees, etc.
    department = Column(String(100), nullable=False)
    reporting_to_name = Column(String(255), nullable=True)
    reporting_to_email = Column(String(255), nullable=True)
    is_vacant = Column(Boolean, default=False)
    acting_authority_name = Column(String(255), nullable=True)
    acting_authority_email = Column(String(255), nullable=True)
    acting_valid_until = Column(String(50), nullable=True)
    last_synced_at = Column(DateTime(timezone=True), default=utcnow)

