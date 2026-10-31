import json
from typing import Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from app.database.models import DOARecord, User
from app.database.supplementary_models import AuthoritativeSource, ControlledExpenditureLimit, DecisionAreaSourceLink
from app.schemas.supplementary_schemas import (
    DecisionAreaValidationRequest,
    DecisionAreaValidationResponse,
    ValidationRuleResult
)

# Board-level authority entities according to VAL-04 and VAL-05
BOARD_LEVEL_ENTITIES = [
    "shareholders",
    "board",
    "board of directors",
    "bod",
    "board committee",
    "audit committee",
    "risk management committee",
    "nomination committee",
    "remuneration committee",
    "group ceo",
    "gceo",
    "ceo",
    "chief executive officer"
]

def classify_doa_level(final_approver: str) -> str:
    """
    VAL-04 & VAL-05:
    Board-level: shareholders, Board, Board Committee, Group CEO, or CEO is final authority.
    Management-level: final authority is below CEO.
    """
    approver_clean = (final_approver or "").strip().lower()
    for entity in BOARD_LEVEL_ENTITIES:
        if entity in approver_clean:
            return "Board-level DOA"
    return "Management-level DOA"

def validate_decision_area_proposal(
    db: Session,
    req: DecisionAreaValidationRequest,
    current_user: User
) -> DecisionAreaValidationResponse:
    rule_results: List[ValidationRuleResult] = []
    hard_stops: List[str] = []
    warnings: List[str] = []

    # -------------------------------------------------------------------------
    # VAL-04 / VAL-05: DOA Classification
    # -------------------------------------------------------------------------
    classification = classify_doa_level(req.final_approver)
    rule_results.append(ValidationRuleResult(
        rule_code="VAL-04/05",
        rule_name="DOA Level Classification",
        status="PASS",
        severity="INFO",
        message=f"Classified as {classification} based on final approving authority '{req.final_approver}'."
    ))

    # -------------------------------------------------------------------------
    # VAL-01: Supporting evidence and authoritative sources
    # A requester proposing a new DOA decision area must attach Board-approved documentation
    # or other evidence. Submission blocked until attached or authorized exception.
    # -------------------------------------------------------------------------
    has_docs = bool(req.supporting_documentation and len(req.supporting_documentation) > 0)
    has_sources = bool(req.authoritative_source_ids and len(req.authoritative_source_ids) > 0)
    
    if not has_docs and not has_sources and not req.has_approved_exception:
        msg = "VAL-01 Hard Stop: Supporting Board-approved documentation or authoritative source link is mandatory before submission."
        rule_results.append(ValidationRuleResult(
            rule_code="VAL-01",
            rule_name="Supporting Evidence & Authoritative Sources",
            status="FAIL",
            severity="HARD_STOP",
            message=msg
        ))
        hard_stops.append(msg)
    else:
        rule_results.append(ValidationRuleResult(
            rule_code="VAL-01",
            rule_name="Supporting Evidence & Authoritative Sources",
            status="PASS",
            severity="INFO",
            message="Required supporting evidence/authoritative sources attached." if (has_docs or has_sources) else "Approved evidence exception noted."
        ))

    # -------------------------------------------------------------------------
    # VAL-02: Mandatory validation fields
    # requester, proposer, reviewer, applicable endorser, final approver, rationale, entity/geography, effective date
    # -------------------------------------------------------------------------
    missing_mandatory = []
    if not req.decision_area or not req.decision_area.strip():
        missing_mandatory.append("decision_area")
    if not req.parent_function or not req.parent_function.strip():
        missing_mandatory.append("parent_function")
    if not req.business_line or not req.business_line.strip():
        missing_mandatory.append("business_line")
    if not req.proposer or not req.proposer.strip():
        missing_mandatory.append("proposer")
    if not req.reviewer or not req.reviewer.strip():
        missing_mandatory.append("reviewer")
    if not req.final_approver or not req.final_approver.strip():
        missing_mandatory.append("final_approver")
    if not req.rationale or not req.rationale.strip():
        missing_mandatory.append("rationale")
    if not req.proposed_effective_date:
        missing_mandatory.append("proposed_effective_date")

    if missing_mandatory:
        msg = f"VAL-02 Hard Stop: Missing mandatory validation fields: {', '.join(missing_mandatory)}."
        rule_results.append(ValidationRuleResult(
            rule_code="VAL-02",
            rule_name="Mandatory Validation Fields",
            status="FAIL",
            severity="HARD_STOP",
            message=msg
        ))
        hard_stops.append(msg)
    else:
        rule_results.append(ValidationRuleResult(
            rule_code="VAL-02",
            rule_name="Mandatory Validation Fields",
            status="PASS",
            severity="INFO",
            message="All mandatory governance proposal fields are present."
        ))

    # -------------------------------------------------------------------------
    # VAL-03: Audit Committee sequencing
    # Where Audit Committee participates, it must be the last Board Committee in sequence.
    # If multiple Board Committees are involved, no other Board Committee may appear after Audit Committee.
    # -------------------------------------------------------------------------
    board_committees = req.board_committees_involved or []
    if "Audit Committee" in board_committees or "AC" in board_committees:
        # Check if Audit Committee is strictly the last committee in the list
        ac_names = ["Audit Committee", "AC"]
        other_committees_after_ac = False
        seen_ac = False
        for c in board_committees:
            if seen_ac and c not in ac_names:
                other_committees_after_ac = True
                break
            if c in ac_names:
                seen_ac = True

        if other_committees_after_ac:
            msg = "VAL-03 Hard Stop: Audit Committee must be the final Board Committee in the governance pathway. No other Board Committee may follow after Audit Committee."
            rule_results.append(ValidationRuleResult(
                rule_code="VAL-03",
                rule_name="Audit Committee Sequencing",
                status="FAIL",
                severity="HARD_STOP",
                message=msg
            ))
            hard_stops.append(msg)
        else:
            rule_results.append(ValidationRuleResult(
                rule_code="VAL-03",
                rule_name="Audit Committee Sequencing",
                status="PASS",
                severity="INFO",
                message="Audit Committee sequence conforms to corporate governance standards."
            ))
    else:
        rule_results.append(ValidationRuleResult(
            rule_code="VAL-03",
            rule_name="Audit Committee Sequencing",
            status="PASS",
            severity="INFO",
            message="Audit Committee not in current sequence."
        ))

    # -------------------------------------------------------------------------
    # VAL-06: Mandatory roles and segregation of duties (SoD)
    # Proposer and reviewer cannot be unassigned.
    # Same user cannot be both proposer and final approver unless approved exception applies.
    # Incompatible reviewer, endorser, approver cannot be combined.
    # -------------------------------------------------------------------------
    p_clean = (req.proposer or "").strip().lower()
    r_clean = (req.reviewer or "").strip().lower()
    e_clean = (req.endorser or "").strip().lower()
    a_clean = (req.final_approver or "").strip().lower()

    if p_clean and a_clean and (p_clean == a_clean or p_clean in a_clean) and not req.has_approved_exception:
        msg = "VAL-06 Hard Stop: Proposer and Final Approver cannot be the same party/user (Segregation of Duties Violation)."
        rule_results.append(ValidationRuleResult(
            rule_code="VAL-06",
            rule_name="Segregation of Duties (SoD)",
            status="FAIL",
            severity="HARD_STOP",
            message=msg
        ))
        hard_stops.append(msg)
    elif p_clean and r_clean and p_clean == r_clean and not req.has_approved_exception:
        msg = "VAL-06 Hard Stop: Proposer and Reviewer cannot be the same entity/user."
        rule_results.append(ValidationRuleResult(
            rule_code="VAL-06",
            rule_name="Segregation of Duties (SoD)",
            status="FAIL",
            severity="HARD_STOP",
            message=msg
        ))
        hard_stops.append(msg)
    else:
        rule_results.append(ValidationRuleResult(
            rule_code="VAL-06",
            rule_name="Segregation of Duties (SoD)",
            status="PASS",
            severity="INFO",
            message="Mandatory roles assigned and segregated without conflict."
        ))

    # -------------------------------------------------------------------------
    # VAL-07: Board/shareholder governance
    # If Board is final approving authority, at least one Board Committee review/endorsement is mandatory.
    # If shareholders are final approving authority, Board must participate before shareholder approval.
    # -------------------------------------------------------------------------
    is_board_final = req.is_board_final_approver or "board" in a_clean or "bod" in a_clean
    is_sh_final = req.is_shareholders_final_approver or "shareholder" in a_clean

    if is_board_final and not is_sh_final:
        has_committee = bool(req.board_committees_involved and len(req.board_committees_involved) > 0)
        if not has_committee and not req.has_approved_exception:
            msg = "VAL-07 Hard Stop: When the Board is final approving authority, prior Board Committee review/endorsement (e.g. Audit / Risk / NRC) is mandatory."
            rule_results.append(ValidationRuleResult(
                rule_code="VAL-07",
                rule_name="Board Prior Committee Endorsement",
                status="FAIL",
                severity="HARD_STOP",
                message=msg
            ))
            hard_stops.append(msg)
        else:
            rule_results.append(ValidationRuleResult(
                rule_code="VAL-07",
                rule_name="Board Prior Committee Endorsement",
                status="PASS",
                severity="INFO",
                message="Board pathway contains required Board Committee endorsement."
            ))

    if is_sh_final:
        # Board participation check
        has_board_step = False
        if req.governance_pathway:
            for step in req.governance_pathway:
                part = (step.get("participant") or "").lower()
                role = (step.get("role") or "").lower()
                if "board" in part or "bod" in part:
                    has_board_step = True
                    break
        if not has_board_step and not req.has_approved_exception:
            msg = "VAL-07 Hard Stop: When Shareholders are the final approving authority, the Board of Directors must participate in the governance pathway before shareholder submission."
            rule_results.append(ValidationRuleResult(
                rule_code="VAL-07",
                rule_name="Shareholder Prior Board Ratification",
                status="FAIL",
                severity="HARD_STOP",
                message=msg
            ))
            hard_stops.append(msg)
        else:
            rule_results.append(ValidationRuleResult(
                rule_code="VAL-07",
                rule_name="Shareholder Prior Board Ratification",
                status="PASS",
                severity="INFO",
                message="Shareholder governance pathway includes prior Board participation."
            ))

    # -------------------------------------------------------------------------
    # VAL-08: Governance pathway sequence
    # Sequence: Proposer (P) -> Reviewer (R) -> Endorser (E) -> final Approver (A)
    # -------------------------------------------------------------------------
    if req.governance_pathway and len(req.governance_pathway) > 1:
        # Verify sequence order
        role_order = {"proposer": 1, "p": 1, "reviewer": 2, "r": 2, "endorser": 3, "e": 3, "approver": 4, "a": 4, "final approver": 4}
        last_order = 0
        sequence_violation = False
        for step in req.governance_pathway:
            r_type = (step.get("role") or "").strip().lower()
            current_order = role_order.get(r_type, 2)
            if current_order < last_order:
                sequence_violation = True
                break
            last_order = current_order

        if sequence_violation and not req.has_approved_exception:
            msg = "VAL-08 Hard Stop: Governance pathway violates mandatory sequence: Proposer (P) -> Reviewer (R) -> Endorser (E) -> Approver (A)."
            rule_results.append(ValidationRuleResult(
                rule_code="VAL-08",
                rule_name="P-R-E-A Governance Sequence",
                status="FAIL",
                severity="HARD_STOP",
                message=msg
            ))
            hard_stops.append(msg)
        else:
            rule_results.append(ValidationRuleResult(
                rule_code="VAL-08",
                rule_name="P-R-E-A Governance Sequence",
                status="PASS",
                severity="INFO",
                message="Governance pathway strictly follows P -> R -> E -> A sequence."
            ))

    # -------------------------------------------------------------------------
    # VAL-09: Board as final approver
    # Where Board is final approver, Board is the only participant assigned approval authority.
    # All preceding participants must have non-approval roles (proposer, reviewer, endorser).
    # -------------------------------------------------------------------------
    if is_board_final:
        has_preceding_approver = False
        if req.governance_pathway:
            for step in req.governance_pathway[:-1]:
                r_type = (step.get("role") or "").strip().lower()
                if "approv" in r_type or r_type == "a":
                    has_preceding_approver = True
                    break
        if has_preceding_approver and not req.has_approved_exception:
            msg = "VAL-09 Hard Stop: Board is final approver; no preceding participant in the pathway may hold approval (A) authority."
            rule_results.append(ValidationRuleResult(
                rule_code="VAL-09",
                rule_name="Board Singular Approval Authority",
                status="FAIL",
                severity="HARD_STOP",
                message=msg
            ))
            hard_stops.append(msg)
        else:
            rule_results.append(ValidationRuleResult(
                rule_code="VAL-09",
                rule_name="Board Singular Approval Authority",
                status="PASS",
                severity="INFO",
                message="All preceding participants hold recommendation/endorsement roles."
            ))

    # -------------------------------------------------------------------------
    # VAL-10 & VAL-11: Financial limits
    # If classified as financial, requester must either:
    # 1) enter applicable monetary amount and currency, or
    # 2) select a linked pre-approved expenditure limit from a controlled list.
    # -------------------------------------------------------------------------
    if req.is_financial:
        has_amount = (req.monetary_amount is not None and req.monetary_amount > 0 and bool(req.currency))
        has_limit_ref = bool(req.linked_expenditure_limit_id)
        if not has_amount and not has_limit_ref and not req.has_approved_exception:
            msg = "VAL-11 Hard Stop: For a financial decision area, requester must enter a monetary amount with currency, or select a pre-approved expenditure limit."
            rule_results.append(ValidationRuleResult(
                rule_code="VAL-11",
                rule_name="Financial Limits Specification",
                status="FAIL",
                severity="HARD_STOP",
                message=msg
            ))
            hard_stops.append(msg)
        else:
            rule_results.append(ValidationRuleResult(
                rule_code="VAL-11",
                rule_name="Financial Limits Specification",
                status="PASS",
                severity="INFO",
                message="Financial limit or controlled ceiling established."
            ))

    # -------------------------------------------------------------------------
    # VAL-12: Final approving authority
    # Every decision area must have one clearly identified final approving authority before submission.
    # -------------------------------------------------------------------------
    if not req.final_approver or not req.final_approver.strip():
        msg = "VAL-12 Hard Stop: Final approving authority cannot be missing or unassigned."
        rule_results.append(ValidationRuleResult(
            rule_code="VAL-12",
            rule_name="Singular Final Approver Identification",
            status="FAIL",
            severity="HARD_STOP",
            message=msg
        ))
        hard_stops.append(msg)
    else:
        rule_results.append(ValidationRuleResult(
            rule_code="VAL-12",
            rule_name="Singular Final Approver Identification",
            status="PASS",
            severity="INFO",
            message=f"Final authority assigned to '{req.final_approver}'."
        ))

    can_submit = (len(hard_stops) == 0) or req.has_approved_exception
    requires_exception = (len(hard_stops) > 0) and not req.has_approved_exception

    return DecisionAreaValidationResponse(
        is_valid=len(hard_stops) == 0,
        can_submit=can_submit,
        classification=classification,
        rule_results=rule_results,
        hard_stop_errors=hard_stops,
        warnings=warnings,
        requires_exception_workflow=requires_exception
    )
