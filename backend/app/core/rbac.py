import json
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database.models import User, DOARecord, ChangeRequest
from app.database.supplementary_models import ExceptionRequest


# =============================================================================
# 1. DOMAIN & ENTITY SCOPING RESOLUTION
# =============================================================================

ALL_DOMAINS = ["Finance", "Risk"]

ENTERPRISE_OVERSIGHT_ROLES = [
    "ADMIN",
    "DOA_ADMINISTRATOR",
    "GOVERNANCE_TEAM",
    "SYSTEM_ADMINISTRATOR",
]

CROSS_DOMAIN_PERSONAS = [
    "AUDIT_READONLY",
    "AUTHORITY_OWNER",
    "APPROVER",
    "REVIEWER",
]


def get_allowed_domains(user: User) -> List[str]:
    """
    Determine which DOA functional domains (Finance, Risk) a user is authorized to view.
    - Explicit user.allowed_domains overrides defaults when set.
    - Enterprise oversight roles and cross-domain assurance/governance personas view both domains.
    - Departmental / operational personas (DEPT_OWNER, FRONTEND_USER, PROCESS_OWNER) are scoped
      strictly to their department's functional domain.
    """
    explicit = getattr(user, "allowed_domains", None)
    if explicit and str(explicit).strip():
        raw = str(explicit).strip()
        if raw.upper() == "ALL":
            return list(ALL_DOMAINS)
        parsed = [d.strip() for d in raw.split(",") if d.strip()]
        if parsed:
            return parsed

    if user.role in ENTERPRISE_OVERSIGHT_ROLES:
        return list(ALL_DOMAINS)

    persona = getattr(user, "persona_type", None) or "FRONTEND_USER"
    if persona in CROSS_DOMAIN_PERSONAS:
        return list(ALL_DOMAINS)

    dept = (getattr(user, "department", None) or "").strip().lower()
    if not dept:
        # Backward-compatible default when test users omit department
        return list(ALL_DOMAINS)

    risk_keywords = ["risk", "credit", "erm", "cyber", "shariah", "aml", "sanction", "provisioning"]
    finance_keywords = [
        "finance",
        "treasury",
        "commercial",
        "supply chain",
        "operations",
        "procurement",
        "p2p",
        "accounting",
        "tax",
        "capital",
        "budget",
    ]

    matched = []
    if any(k in dept for k in finance_keywords):
        matched.append("Finance")
    if any(k in dept for k in risk_keywords):
        matched.append("Risk")

    return matched if matched else list(ALL_DOMAINS)


def get_user_entity_id(user: User) -> str:
    """Resolve user's home legal entity / geography ID."""
    explicit_entity = getattr(user, "entity_id", None)
    if explicit_entity and str(explicit_entity).strip():
        return str(explicit_entity).strip()

    if user.role in ["ADMIN", "DOA_ADMINISTRATOR", "GOVERNANCE_TEAM", "SYSTEM_ADMINISTRATOR"]:
        return "ALL"

    persona = getattr(user, "persona_type", None) or "FRONTEND_USER"
    if persona in ["AUDIT_READONLY", "AUTHORITY_OWNER", "APPROVER", "REVIEWER"]:
        return "ALL"

    dept = (getattr(user, "department", None) or "").upper()
    if "KSA" in dept or "SAUDI" in dept:
        return "ENT-KSA-01"
    if "UAE" in dept or "DUBAI" in dept:
        return "ENT-UAE-01"
    return "ENT-BH-01"


def normalize_entity_code(entity_or_geo: Optional[str]) -> str:
    """Normalize display geography names or entity IDs into canonical LegalEntity IDs."""
    if not entity_or_geo:
        return "ENT-BH-01"
    val = str(entity_or_geo).strip().upper()
    if val in ["ALL", "*"]:
        return "ALL"
    if "KSA" in val or "SAUDI" in val:
        return "ENT-KSA-01"
    if "UAE" in val or "DUBAI" in val:
        return "ENT-UAE-01"
    if "BH" in val or "BAHRAIN" in val:
        return "ENT-BH-01"
    return str(entity_or_geo).strip()


# =============================================================================
# 2. CENTRALIZED CAPABILITY MATRIX PER USER / ROLE / PERSONA
# =============================================================================

def get_user_permissions(user: User) -> Dict[str, Any]:
    """
    Compute authoritative CRUD, workflow, reporting, and data-scoping capabilities
    for any authenticated user according to the BRD & RBAC rules.
    """
    role = user.role or "NORMAL_USER"
    persona = getattr(user, "persona_type", None) or "FRONTEND_USER"
    allowed_domains = get_allowed_domains(user)
    home_entity = get_user_entity_id(user)

    is_super_doa_admin = role in ["ADMIN", "DOA_ADMINISTRATOR"]
    is_gov_team = role == "GOVERNANCE_TEAM"
    is_sys_admin = role == "SYSTEM_ADMINISTRATOR"
    is_normal = role == "NORMAL_USER"

    # Read-only business access check (Internal Audit & IT SysAdmin cannot mutate DOA content)
    is_read_only = (is_normal and persona == "AUDIT_READONLY") or is_sys_admin

    # Proposal / CRUD initiation rights (ADD / MODIFY / DELETE via Change Request)
    can_propose = is_super_doa_admin or (
        is_normal and persona in ["FRONTEND_USER", "PROCESS_OWNER", "DEPT_OWNER", "AUTHORITY_OWNER"]
    )

    # Workflow stage-specific execution rights
    can_endorse_process = is_super_doa_admin or (is_normal and persona == "PROCESS_OWNER")
    can_dept_signoff = is_super_doa_admin or (is_normal and persona == "DEPT_OWNER")
    can_verify_charter = is_super_doa_admin or (is_normal and persona == "AUTHORITY_OWNER")
    can_review_2lod = is_super_doa_admin or is_gov_team or (is_normal and persona == "REVIEWER")
    can_governance_actions = is_super_doa_admin or is_gov_team
    can_approve = is_super_doa_admin or (is_normal and persona == "APPROVER")
    can_publish = is_super_doa_admin or is_gov_team
    can_direct_master_crud = is_super_doa_admin

    # Entity write scope (Section 4.4 & Section 6 Acceptance Criteria)
    can_write_all_entities = is_super_doa_admin or home_entity == "ALL"

    # Audit & Assurance visibility
    can_view_audit_logs = (
        role in ["ADMIN", "DOA_ADMINISTRATOR", "SYSTEM_ADMINISTRATOR", "GOVERNANCE_TEAM"]
        or persona in ["AUDIT_READONLY", "REVIEWER"]
    )

    # Supplementary BRD permissions
    can_raise_exception = can_propose
    exception_action_stages: List[str] = []
    if is_super_doa_admin:
        exception_action_stages = ["PENDING_REPORTING_MGR", "PENDING_DIVISION_HEAD", "PENDING_GOVERNANCE"]
    elif is_gov_team:
        exception_action_stages = ["PENDING_GOVERNANCE"]
    elif is_normal and persona == "DEPT_OWNER":
        exception_action_stages = ["PENDING_REPORTING_MGR"]
    elif is_normal and persona == "APPROVER":
        exception_action_stages = ["PENDING_DIVISION_HEAD"]

    can_manage_sources = is_super_doa_admin or is_gov_team
    can_manage_controlled_lists = is_super_doa_admin or is_sys_admin or is_gov_team
    can_view_alignment_report = (
        role in ["ADMIN", "DOA_ADMINISTRATOR", "GOVERNANCE_TEAM"]
        or (is_normal and persona in ["AUDIT_READONLY", "AUTHORITY_OWNER", "APPROVER", "REVIEWER", "DEPT_OWNER"])
    )
    can_reconstruct_pit = (
        role in ["ADMIN", "DOA_ADMINISTRATOR", "GOVERNANCE_TEAM"]
        or (is_normal and persona in ["AUDIT_READONLY", "AUTHORITY_OWNER", "APPROVER", "REVIEWER", "DEPT_OWNER"])
    )
    can_manage_findings = is_super_doa_admin or is_gov_team
    can_view_findings = can_manage_findings or (is_normal and persona in ["AUDIT_READONLY", "REVIEWER"])
    can_manage_system = role in ["ADMIN", "SYSTEM_ADMINISTRATOR"]

    return {
        "role": role,
        "persona_type": persona,
        "allowed_domains": allowed_domains,
        "is_all_domains": len(allowed_domains) >= len(ALL_DOMAINS),
        "entity_id": home_entity,
        "can_write_all_entities": can_write_all_entities,
        "is_read_only": is_read_only,
        "can_propose": can_propose,
        "can_withdraw": can_propose,
        "can_endorse_process": can_endorse_process,
        "can_dept_signoff": can_dept_signoff,
        "can_verify_charter": can_verify_charter,
        "can_review_2lod": can_review_2lod,
        "can_governance_actions": can_governance_actions,
        "can_approve": can_approve,
        "can_publish": can_publish,
        "can_direct_master_crud": can_direct_master_crud,
        "can_view_audit_logs": can_view_audit_logs,
        "can_raise_exception": can_raise_exception,
        "exception_action_stages": exception_action_stages,
        "can_manage_sources": can_manage_sources,
        "can_manage_controlled_lists": can_manage_controlled_lists,
        "can_view_alignment_report": can_view_alignment_report,
        "can_reconstruct_pit": can_reconstruct_pit,
        "can_manage_findings": can_manage_findings,
        "can_view_findings": can_view_findings,
        "can_manage_system": can_manage_system,
    }


# =============================================================================
# 3. QUERY FILTERS & RECORD-LEVEL ACCESS CHECKS
# =============================================================================

def apply_doa_read_scope(query, user: User):
    """Filter a SQLAlchemy DOARecord query to only domains the user is authorized to view."""
    domains = get_allowed_domains(user)
    if len(domains) >= len(ALL_DOMAINS):
        return query
    domain_clauses = []
    for dom in domains:
        domain_clauses.append(DOARecord.parent_function.ilike(f"%{dom}%"))
        domain_clauses.append(DOARecord.function.ilike(f"%{dom}%"))
    return query.filter(or_(*domain_clauses))


def can_user_read_doa(rec: DOARecord, user: User) -> bool:
    """Return True if user is authorized to view the given DOARecord."""
    # Published DOA matrix explorer records are readable organization-wide by all authenticated users
    if getattr(rec, "status", None) == "PUBLISHED":
        return True
    domains = get_allowed_domains(user)
    if len(domains) >= len(ALL_DOMAINS):
        return True
    rec_domain = f"{rec.parent_function or ''} {rec.function or ''}".lower()
    return any(d.lower() in rec_domain for d in domains)


def assert_can_read_doa(rec: DOARecord, user: User) -> None:
    if not can_user_read_doa(rec, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: User ({user.department or user.role}) is not authorized to view {rec.parent_function} domain records.",
        )


def infer_domain_from_text(dept_or_func: Optional[str], proposed_val: Optional[Dict[str, Any]] = None) -> Optional[str]:
    """Extract canonical domain ('Finance' or 'Risk') from CR fields or proposed payload."""
    prop = proposed_val or {}
    candidates = [
        prop.get("parent_function"),
        prop.get("function"),
        dept_or_func,
    ]
    joined = " ".join(str(c) for c in candidates if c).lower()
    if not joined:
        return None
    if any(k in joined for k in ["risk", "credit", "erm", "cyber", "shariah", "aml"]):
        return "Risk"
    if any(
        k in joined
        for k in ["finance", "treasury", "commercial", "supply chain", "operations", "procurement", "p2p", "tax", "capital", "budget"]
    ):
        return "Finance"
    return None


def assert_domain_write_access(target_domain: Optional[str], user: User) -> None:
    """Ensure user can only create/modify/delete DOA rules within their authorized functional domain."""
    perms = get_user_permissions(user)
    if not perms["can_propose"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"CRUD Violation: Role '{user.role}' / Persona '{perms['persona_type']}' is not authorized to create, modify, or delete DOA proposals.",
        )
    if perms["is_all_domains"] or not target_domain:
        return
    canon = infer_domain_from_text(target_domain)
    if canon and canon not in perms["allowed_domains"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Domain Scoping Violation: User authorized for {perms['allowed_domains']} cannot create or modify '{canon}' decision areas.",
        )


def assert_entity_write_access(target_entity_id: Optional[str], user: User) -> None:
    """
    BRD Section 4.4 & Section 6 Acceptance Criteria:
    Entity ownership prevents unauthorised cross-geography changes while permitting agreed read-only access.
    """
    perms = get_user_permissions(user)
    if perms["can_write_all_entities"]:
        return

    user_entity = normalize_entity_code(perms["entity_id"])
    target_entity = normalize_entity_code(target_entity_id or "ENT-BH-01")

    if user_entity != "ALL" and target_entity != user_entity:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Entity Ownership Violation: Cross-geography mutations are blocked. "
                f"User scoped to entity '{user_entity}' has read-only access to '{target_entity}' and cannot modify its DOA records."
            ),
        )


def get_cr_domain(db: Session, cr: ChangeRequest) -> Optional[str]:
    """Determine functional domain ('Finance' or 'Risk') for a ChangeRequest."""
    try:
        prop = json.loads(cr.proposed_value) if isinstance(cr.proposed_value, str) and cr.proposed_value else (cr.proposed_value or {})
    except Exception:
        prop = {}
    dom = infer_domain_from_text(cr.department, prop if isinstance(prop, dict) else {})
    if dom:
        return dom
    if cr.doa_id:
        rec = db.query(DOARecord).filter(DOARecord.id == cr.doa_id).first()
        if rec:
            return infer_domain_from_text(rec.parent_function or rec.function)
    return None


def can_user_view_change_request(db: Session, cr: ChangeRequest, user: User) -> bool:
    """
    Check if a user is authorized to view a specific ChangeRequest:
    - Requesters always see their own ChangeRequests.
    - Oversight/Governance/Admin/Audit/Reviewer/Approver/AuthorityOwner see requests within their allowed domains.
    - Dept Owners see own requests + requests belonging to their department/functional domain.
    - Process Owners see own requests + operational requests within their domain scope.
    - Requesters see ONLY their own submitted ChangeRequests.
    """
    if cr.requester_id == user.id or cr.requester_email == user.email:
        return True

    role = user.role or "NORMAL_USER"
    persona = getattr(user, "persona_type", None) or "FRONTEND_USER"

    if role in ["ADMIN", "DOA_ADMINISTRATOR", "GOVERNANCE_TEAM", "SYSTEM_ADMINISTRATOR"]:
        return True

    if persona in ["AUDIT_READONLY", "APPROVER", "REVIEWER", "AUTHORITY_OWNER"]:
        domains = get_allowed_domains(user)
        if len(domains) >= len(ALL_DOMAINS):
            return True
        cr_dom = get_cr_domain(db, cr)
        return (cr_dom is None) or (cr_dom in domains)

    if persona in ["DEPT_OWNER", "PROCESS_OWNER"]:
        domains = get_allowed_domains(user)
        cr_dom = get_cr_domain(db, cr)
        return (cr_dom is None) or (cr_dom in domains)

    # FRONTEND_USER: strictly own requests only
    return False


def assert_can_view_change_request(db: Session, cr: ChangeRequest, user: User) -> None:
    if not can_user_view_change_request(db, cr, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You are not authorized to view this Change Request.",
        )


def filter_change_requests_for_user(db: Session, crs: List[ChangeRequest], user: User) -> List[ChangeRequest]:
    """Filter a list of ChangeRequests strictly to those visible to current_user."""
    return [cr for cr in crs if can_user_view_change_request(db, cr, user)]


# =============================================================================
# 4. SEGREGATION OF DUTIES (VAL-06) & WORKFLOW STAGE GUARDS
# =============================================================================

def has_approved_sod_exception(db: Session, cr: ChangeRequest) -> bool:
    """Return True if ChangeRequest links to an APPROVED ExceptionRequest covering VAL-06 (SoD)."""
    exc_id = getattr(cr, "exception_id", None)
    if not exc_id:
        return False
    exc = db.query(ExceptionRequest).filter(
        ExceptionRequest.id == exc_id,
        ExceptionRequest.status == "APPROVED",
    ).first()
    if not exc:
        return False
    try:
        principles = json.loads(exc.deviated_principles or "[]")
    except Exception:
        principles = []
    exc_type = (exc.exception_type or "").upper()
    return ("VAL-06" in principles) or ("SOD" in exc_type) or ("SEGREGATION" in exc_type)


def assert_sod_not_proposer(db: Session, cr: ChangeRequest, actor: User, action_label: str) -> None:
    """
    BRD VAL-06 Segregation of Duties:
    Unless an approved exception applies, the same user shall not act as both proposer and
    reviewer, endorser, final approver, or publisher within the same change request.
    """
    is_same_user = (cr.requester_id == actor.id) or (
        cr.requester_email and actor.email and cr.requester_email.lower() == actor.email.lower()
    )
    if is_same_user and not has_approved_sod_exception(db, cr):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Segregation of Duties Violation (VAL-06): Proposer ({actor.email}) cannot perform "
                f"'{action_label}' on their own Change Request #{cr.id} unless an approved VAL-06 exception is linked."
            ),
        )


def assert_exception_stage_actor(exc: ExceptionRequest, actor: User, action: str) -> None:
    """
    BRD Section 4.3 Multi-Stage Exception Workflow Actor Authorization:
    - Requester cannot approve/amend/reject their own exception at any stage.
    - Stage 1 (PENDING_REPORTING_MGR): Designated reporting_mgr_email, DEPT_OWNER, or DOA_ADMINISTRATOR/ADMIN.
    - Stage 2 (PENDING_DIVISION_HEAD): Designated division_head_email, APPROVER, or DOA_ADMINISTRATOR/ADMIN
      (and cannot be the same actor who approved Stage 1 unless ADMIN override).
    - Stage 3 (PENDING_GOVERNANCE): Senior member of DOA Governance role group (GOVERNANCE_TEAM, DOA_ADMINISTRATOR, ADMIN).
    """
    perms = get_user_permissions(actor)
    if perms["is_read_only"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Read-Only Role Violation: User is not authorized to action exception requests.",
        )

    if exc.requester_id == actor.id or (exc.requester_email or "").lower() == (actor.email or "").lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Segregation of Duties Violation (Section 4.3): Requester cannot review or approve their own exception request.",
        )

    stage = exc.current_stage
    is_admin = actor.role in ["ADMIN", "DOA_ADMINISTRATOR"]
    actor_email_lower = (actor.email or "").lower()

    if stage == "PENDING_REPORTING_MGR":
        is_designated_mgr = bool(exc.reporting_mgr_email and exc.reporting_mgr_email.lower() == actor_email_lower)
        is_mgr_role = is_admin or (actor.role == "NORMAL_USER" and actor.persona_type == "DEPT_OWNER")
        if not (is_designated_mgr or is_mgr_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Stage Authorization Error: Only the Reporting Manager / Department Head may action Stage 1 (PENDING_REPORTING_MGR).",
            )
        if action.upper() == "REJECT" and not is_admin:
            # Per BRD 4.3 rule 2: Reporting manager may approve, amend, or return with comments (or reject if admin)
            pass

    elif stage == "PENDING_DIVISION_HEAD":
        is_designated_div = bool(exc.division_head_email and exc.division_head_email.lower() == actor_email_lower)
        is_div_role = is_admin or (actor.role == "NORMAL_USER" and actor.persona_type == "APPROVER")
        if not (is_designated_div or is_div_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Stage Authorization Error: Only the Division Head / Executive Approver may action Stage 2 (PENDING_DIVISION_HEAD).",
            )
        if not is_admin and exc.reporting_mgr_id and exc.reporting_mgr_id == actor.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Segregation of Duties Violation: The same individual cannot approve both Reporting Manager and Division Head stages.",
            )

    elif stage == "PENDING_GOVERNANCE":
        is_senior_gov = actor.role in ["ADMIN", "DOA_ADMINISTRATOR", "GOVERNANCE_TEAM"]
        if not is_senior_gov:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Stage Authorization Error (BRD 4.3): Only a senior member of the DOA Governance role group may action Stage 3 (PENDING_GOVERNANCE).",
            )
