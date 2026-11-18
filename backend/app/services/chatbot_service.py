import os
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database.models import DOARecord, ChangeRequest, User
from app.core.config import settings
from app.services.excel_export_service import get_template_path
from app.schemas.schemas import (
    ChatbotQueryRequest,
    ChatbotQueryResponse,
    ChatbotSource,
    ChatbotAction
)

# Guardrail pattern definitions (Explicit Refusals for Prohibited Intents)
GUARDRAIL_PATTERNS = [
    # 1. Mutate / Execute Workflow Actions
    (
        r"(approve|reject|submit|create|delete|retire|modify|publish|amend)\s+(this|the|my)?\s*(change|request|record|cr|doa|proposal|rule)",
        "I am a read-only governance assistant. I cannot approve, reject, submit, amend, or retire authority records on your behalf. Please navigate to the appropriate workspace (e.g., Governance Review Queue or New Proposal form) to execute these actions."
    ),
    (
        r"(upload|attach)\s+(file|document|attachment|pdf)",
        "I cannot upload or attach files for you. To attach documents, please use the attachments section within the Change Request submission modal."
    ),
    # 2. Access Private/In-progress confidential details
    (
        r"(private|confidential|internal)\s+(note|comment|feedback|draft|thread)",
        "I cannot access or disclose in-progress reviewer comments, confidential deliberation notes, or private clarification threads. I only provide guidance on published delegation rules and standardized governance policies."
    ),
    (
        r"(will|is going to|speculate)\s+.*(be\s+approved|be\s+rejected|pass)",
        "I am not authorized to speculate on whether pending change requests will be approved or rejected. Decisions are made strictly by designated Governance Reviewers and DOA Administrators under 2LoD oversight."
    ),
    # 3. RBAC Bypass / System config
    (
        r"(elevate|grant|give\s+me|upgrade)\s+(admin|role|access|permission|privilege)",
        "I cannot grant or modify user roles or elevate permissions. Role assignments are strictly governed by System Administrators."
    ),
    (
        r"(database\s+password|jwt\s+secret|secret\s+key|credentials|connection\s+string)",
        "I cannot access or share system credentials, database secrets, or technical security configurations."
    ),
    # 4. Operational business transactions (Invoices, POs, payments)
    (
        r"(invoice\s+#?|purchase\s+order\s+#?|po\s+#?\d+|payment\s+status|vendor\s+payment|disbursement)",
        "Operational business transactions (such as live invoices, purchase orders, or payment disbursements) are outside the scope of the Delegation of Authority (DOA) framework. The DOA system defines the authority rules and approval limits, not the processing of individual ERP transactions."
    )
]

STOPWORDS = {
    "what", "is", "are", "the", "for", "can", "who", "how", "does", "do",
    "in", "on", "of", "to", "a", "an", "tell", "me", "about", "explain",
    "show", "list", "rule", "rules", "authority", "authorities", "limit",
    "limits", "threshold", "thresholds", "approval", "approve", "approves",
    "please", "help", "with", "under", "which", "when", "where", "there",
    "any", "all", "from", "this", "that", "these", "those", "have", "has",
    "need", "needed", "required", "require", "requires", "level", "matrix",
    "doa", "policy", "policies", "decision", "decisions", "area", "areas"
}

GOVERNANCE_TERMINOLOGY = {
    "doa": "Delegation of Authority (DOA): A foundational governance framework establishing who within the organization holds the authority to recommend, endorse, or approve operational and strategic commitments.",
    "2lod": "Two Lines of Defense (2LoD): An internal governance model ensuring that operational departments (1st line) proposing changes undergo independent compliance and risk review by the Governance Team (2nd line) before executive publication.",
    "sod": "Segregation of Duties (SoD): A core internal control principle requiring that the person who initiates or proposes a change request cannot be the same person who approves or publishes it.",
    "r": "R / R1–R5 (Review and/or Recommend): The role or committee designated to examine proposals and recommend action prior to formal endorsement or approval.",
    "a": "A / A1–A2 (Approve): The ultimate decision-maker authorized to sanction the action or transaction up to defined threshold limits.",
    "e": "E / E1–E6 (Endorse): Intermediate functional, committee, or departmental concurrence required before final approval.",
    "p": "P / P1–P2 (Propose): The stakeholder or function accountable for initiating, preparing, and proposing a decision item.",
    "n": "N / N1–N3 (Notify / Notification): Indicates that the specified body or regulator (e.g., BoD, BRPC, or Central Bank) must be formally notified.",
    "submitted": "Status: Request formally lodged by requester; awaiting Process Owner / Department Owner / 2LoD Governance review.",
    "clarification_required": "Status: The Governance Team reviewed the proposal and returned it to the requester for additional documentation, evidence, or justification.",
    "under_review": "Status: Proposal actively under examination by Governance Reviewers or designated executive approvers.",
    "approved": "Status: Formally cleared by Executive Approver. Note: Approved requests do NOT overwrite the active matrix until Controlled Publication is executed.",
    "published": "Status: Formally released into the live master matrix by the DOA Administrator, incrementing the baseline version snapshot.",
    "archived": "Status: Historical version superseded by a newer version or retired due to regulatory/organizational updates."
}

# Cache for ToC acronyms loaded from Data - DOA Tool.xlsx (< 10 KB in memory)
_TOC_ACRONYMS_CACHE: Optional[Dict[str, Tuple[str, str]]] = None


def get_toc_acronyms() -> Dict[str, Tuple[str, str]]:
    """Load and cache the 190+ official acronyms and authority codes from Data - DOA Tool.xlsx ToC sheet."""
    global _TOC_ACRONYMS_CACHE
    if _TOC_ACRONYMS_CACHE is not None:
        return _TOC_ACRONYMS_CACHE

    toc: Dict[str, Tuple[str, str]] = {
        "bod": ("BoD", "Board of Directors"),
        "ac": ("AC", "Audit Committee"),
        "brpc": ("BRPC", "Board Risk Policy Committee"),
        "excom": ("ExCom", "Executive Committee"),
        "gnrc": ("GNRC", "Governance, Nomination and Remuneration Committee"),
        "ssb": ("SSB", "Shariah Supervisory Board"),
        "grc": ("GRC", "Group Risk Committee"),
        "alco": ("ALCO", "Asset and Liability Committee"),
        "gceo": ("GCEO", "Group Chief Executive Officer"),
        "ceo": ("CEO", "Chief Executive Officer"),
        "gcfo": ("GCFO", "Group Chief Financial Officer"),
        "cfo": ("CFO", "Chief Financial Officer"),
        "gcro": ("GCRO", "Group Chief Risk Officer"),
        "gcco": ("GCCO", "Group Chief Compliance Officer"),
        "gcoo": ("GCOO", "Group Chief Operating Officer"),
        "chro": ("CHRO", "Chief Human Resources Officer"),
        "cbb": ("CBB", "Central Bank of Bahrain"),
        "icaap": ("ICAAP", "Internal Capital Adequacy Assessment Process"),
        "raroc": ("RAROC", "Risk-Adjusted Return on Capital"),
        "lcr": ("LCR", "Liquidity Coverage Ratio"),
        "capex": ("CAPEX", "Capital Expenditure"),
        "opex": ("OPEX", "Operating Expenditure")
    }

    tpath = get_template_path()
    if tpath and tpath.exists():
        try:
            ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            with zipfile.ZipFile(tpath, 'r') as z:
                ss = [
                    ''.join(t.text or '' for t in si.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'))
                    for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('main:si', ns)
                ]
                sh_root = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
                for r in sh_root.findall('main:sheetData/main:row', ns)[3:]:
                    rc: Dict[str, str] = {}
                    for c in r.findall('main:c', ns):
                        col_let = ''.join(ch for ch in c.attrib.get('r', '') if ch.isalpha())
                        v_el = c.find('main:v', ns)
                        val = v_el.text if v_el is not None and v_el.text is not None else ''
                        if c.attrib.get('t') == 's' and val != '':
                            val = ss[int(val)]
                        if val.strip():
                            rc[col_let] = val.strip()
                    for k_col, v_col in [('A', 'B'), ('D', 'E'), ('G', 'H'), ('I', 'J')]:
                        k, v = rc.get(k_col, ''), rc.get(v_col, '')
                        if k and v and not k.endswith(':'):
                            toc[k.lower()] = (k, v)
        except Exception as e:
            print(f"[ChatbotService] ToC load warning: {e}")

    _TOC_ACRONYMS_CACHE = toc
    return toc


NAVIGATION_GUIDE = [
    {
        "keywords": ["submit", "propose", "amend", "new request", "create request", "raise request"],
        "label": "Open Change Proposal Form",
        "action_type": "navigate",
        "target": "new-proposal",
        "instructions": "Navigate to the 'New Request / Initiate Proposal' tab to submit an Add, Modify, or Delete proposal using the Authority Chain Builder."
    },
    {
        "keywords": ["diff", "comparison", "side-by-side", "compare", "review queue", "change queue"],
        "label": "Open Change Queue",
        "action_type": "navigate",
        "target": "diff-inspector",
        "instructions": "In the Change Queue tab, click 'Review Proposal' on any request to inspect field-by-field Old vs. Proposed comparisons."
    },
    {
        "keywords": ["matrix", "search", "filter", "limits", "thresholds", "records", "explore"],
        "label": "Explore DOA Matrix",
        "action_type": "navigate",
        "target": "doa-matrix",
        "instructions": "Open the 'Search DoA (DOA Matrix Explorer)' tab to filter published rules by Function (Finance/Risk), Business Line, and keyword."
    },
    {
        "keywords": ["audit", "trail", "history", "logs", "ledger"],
        "label": "Inspect Audit Trail",
        "action_type": "navigate",
        "target": "audit-trail",
        "instructions": "Open the 'Audit Trail' view to inspect chronological, tamper-evident records of submissions, approvals, and publications."
    }
]

SUBMISSION_CHECKLIST = """
Mandatory Requirements Before Submitting a DOA Change Request:
1. **Function & Business Line**: Select the target domain (e.g., Finance > Bank Capital and Capital Management).
2. **Decision Area & Classification**: Specify the clear decision mandate and whether it is **Key** or **Non-Key**.
3. **Approval Authority Chain**: Define the full routing sequence across Propose (P), Review/Recommend (R), Endorse (E), and Approve (A).
4. **Business Justification & Operational Impact**: Provide the rationale explaining financial, operational, or regulatory necessity.
5. **Regulatory Mandate Flag (Y/N)**: Indicate if Central Bank (e.g., CBB) or statutory approval/notification is required.
"""


def check_guardrails(query: str) -> Optional[str]:
    """Check if query violates read-only or out-of-scope guardrails."""
    lower_query = query.lower()
    for pattern, refusal in GUARDRAIL_PATTERNS:
        if re.search(pattern, lower_query):
            return refusal
    return None


def _extract_referenced_rule_ids(query: str, history: Optional[List[Any]] = None) -> List[str]:
    """Extract explicit rule IDs (e.g., #245, rule 231, 982) from query or recent conversation history."""
    explicit_ids = re.findall(r"(?:#|rule\s+|doa\s+|id\s+|no\.?\s*)(\d{3})\b|\b(2[2-7]\d|30\d|31[01]|98[23]|99[456])\b", query.lower())
    found = []
    for g1, g2 in explicit_ids:
        rid = g1 or g2
        if rid and rid not in found:
            found.append(rid)

    # If none in current query and query looks like a follow-up ("is it", "who proposes it", "what about its comments"), check history
    if not found and history and re.search(r"\b(it|its|that|this\s+rule|who\s+proposes|who\s+approves|regulatory|comments)\b", query.lower()):
        for msg in reversed(history[-4:]):
            content = getattr(msg, "content", None) or (msg.get("content") if isinstance(msg, dict) else "") or ""
            hist_ids = re.findall(r"(?:#|DOA\s+#|Ref\s+#)(\d{3})\b", content)
            for hid in hist_ids:
                if hid not in found:
                    found.append(hid)
            if found:
                break
    return found


def retrieve_relevant_records(
    db: Session,
    query: str,
    limit: int = 5,
    current_user: Optional[User] = None,
    history: Optional[List[Any]] = None
) -> List[DOARecord]:
    """
    Lightweight, zero-RAM-overhead smart SQL retrieval:
    1. Direct Rule ID lookup (including multi-turn follow-up resolution)
    2. Stopword-filtered keyword extraction across all 30 DOA attributes
    3. Relevance scoring & ranking
    """
    base_q = db.query(DOARecord).filter(DOARecord.status == "PUBLISHED")

    # 1. Check explicit or history-referenced Rule IDs first
    ref_ids = _extract_referenced_rule_ids(query, history)
    direct_matches: List[DOARecord] = []
    if ref_ids:
        direct_matches = base_q.filter(DOARecord.id.in_(ref_ids)).all()
        if len(direct_matches) >= limit:
            return direct_matches[:limit]

    # 2. Extract meaningful domain keywords (removing stopwords & punctuation)
    clean_text = re.sub(r"[^\w\s&$-]", " ", query.lower())
    raw_tokens = [t.strip() for t in clean_text.split() if len(t.strip()) >= 2]
    keywords = [t for t in raw_tokens if t not in STOPWORDS]

    # Special expansions for common financial/threshold queries
    lower_q = query.lower()
    if any(k in lower_q for k in ["capex", "unbudgeted", "non-financial", "200,000", "500,000", "300,000", "asset", "acquisition"]):
        keywords.extend(["unbudgeted", "200,000", "500,000", "capital"])
    if any(k in lower_q for k in ["liability", "50,000", "third-party", "third party", "insurance"]):
        keywords.extend(["third-party", "liability", "50,000"])
    if any(k in lower_q for k in ["dividend", "share", "capital"]):
        keywords.extend(["capital", "share", "dividend"])

    # Deduplicate keywords while preserving order
    seen_kw = set()
    unique_keywords = []
    for kw in keywords:
        if kw not in seen_kw:
            seen_kw.add(kw)
            unique_keywords.append(kw)

    if not unique_keywords:
        return direct_matches if direct_matches else base_q.limit(limit).all()

    # Build SQL conditions across all key DOA columns (up to 6 meaningful keywords)
    conditions = []
    for term in unique_keywords[:6]:
        pat = f"%{term}%"
        conditions.extend([
            DOARecord.id.ilike(pat),
            DOARecord.decision_area.ilike(pat),
            DOARecord.category.ilike(pat),
            DOARecord.function.ilike(pat),
            DOARecord.business_line.ilike(pat),
            DOARecord.comments.ilike(pat),
            DOARecord.composite_authority.ilike(pat),
            DOARecord.board_committees.ilike(pat),
            DOARecord.board_committees2.ilike(pat),
            DOARecord.mgmt_committees.ilike(pat),
            DOARecord.mgmt_committees2.ilike(pat),
            DOARecord.c_level1.ilike(pat),
            DOARecord.c_level2.ilike(pat),
            DOARecord.gceo.ilike(pat),
            DOARecord.ceo.ilike(pat),
            DOARecord.shareholders.ilike(pat)
        ])

    candidates = base_q.filter(or_(*conditions)).limit(30).all()

    # 3. Score candidates by number of keyword hits in decision_area, category, authority, and comments
    def score_record(rec: DOARecord) -> int:
        score = 0
        if rec.id in ref_ids:
            score += 100
        haystack_primary = f"{rec.id} {rec.decision_area or ''} {rec.category or ''} {rec.business_line or ''}".lower()
        haystack_secondary = f"{rec.function or ''} {rec.composite_authority or ''} {rec.comments or ''} {rec.board_committees or ''} {rec.mgmt_committees or ''} {rec.c_level1 or ''} {rec.c_level2 or ''}".lower()
        for kw in unique_keywords:
            if kw in haystack_primary:
                score += 10
            if kw in haystack_secondary:
                score += 4
        return score

    scored = sorted(candidates, key=score_record, reverse=True)
    combined = list(direct_matches)
    seen_ids = {r.id for r in combined}
    for r in scored:
        if r.id not in seen_ids:
            combined.append(r)
            seen_ids.add(r.id)
        if len(combined) >= limit:
            break

    return combined[:limit]


def format_authority_chain_summary(record: DOARecord) -> str:
    """Build a clean, readable authority chain string for a DOARecord."""
    if getattr(record, "composite_authority", None):
        return record.composite_authority.replace("➔", "←").replace("->", "←")
    parts = []
    if record.shareholders:
        parts.append(f"Shareholders ({record.shareholders})")
    if record.board_of_directors:
        parts.append(f"BoD ({record.board_of_directors})")
    if record.board_committees:
        parts.append(f"{record.board_committees} ({record.board_committees_op or 'E'})")
    if record.board_committees2:
        parts.append(f"{record.board_committees2} ({record.board_committees2_op or 'E'})")
    if record.gceo:
        parts.append(f"GCEO ({record.gceo})")
    if record.ceo:
        parts.append(f"CEO ({record.ceo})")
    if record.mgmt_committees:
        parts.append(f"{record.mgmt_committees} ({record.mgmt_committees_op or 'E'})")
    if record.mgmt_committees2:
        parts.append(f"{record.mgmt_committees2} ({record.mgmt_committees2_op or 'E'})")
    if record.c_level1:
        parts.append(f"{record.c_level1} ({record.c_level1_op or 'R'})")
    if record.c_level2:
        parts.append(f"{record.c_level2} ({record.c_level2_op or 'P'})")
    return " ← ".join(parts) if parts else "Standard Governance Tier"


def build_rule_summary(record: DOARecord) -> str:
    """Format DOARecord into a rich, structured markdown summary."""
    auth_str = format_authority_chain_summary(record)
    reg_badge = "Yes (Regulatory Mandated)" if getattr(record, 'regulatory', 'N') == 'Y' else "No (Internal Mandate)"
    comments_line = f"\n  - **Notes / Comments:** {record.comments.strip()}" if getattr(record, 'comments', None) and record.comments.strip() else ""
    return (
        f"• **[DOA #{record.id}] {record.decision_area}**\n"
        f"  - **Function & Category:** {record.function} › {record.category or record.business_line} ({record.key_non_key})\n"
        f"  - **Approval Authority Chain:** `{auth_str}`\n"
        f"  - **Regulatory Mandated:** {reg_badge}"
        f"{comments_line}"
    )


def check_live_workspace_status_query(db: Session, query: str, current_user: User) -> Optional[str]:
    """
    Answer live personal status & workspace queries directly from SQLite (0 MB RAM overhead):
    - User's submitted change requests & statuses
    - Pending review queue count
    - User's role, persona, and authorized functional domains
    """
    lower_q = query.lower()
    is_status_query = any(
        phrase in lower_q
        for phrase in [
            "my request", "my proposal", "my submission", "my change request",
            "status of my", "pending in queue", "pending requests", "review queue count",
            "my role", "my permission", "which domain", "what domain", "allowed domain",
            "who am i", "my profile"
        ]
    )
    if not is_status_query:
        return None

    persona = getattr(current_user, "persona_type", None) or current_user.role
    domains = getattr(current_user, "allowed_domains", None) or current_user.department or "Finance"
    my_crs = (
        db.query(ChangeRequest)
        .filter(ChangeRequest.requester_id == current_user.id)
        .order_by(ChangeRequest.created_at.desc())
        .limit(5)
        .all()
    )
    total_pending_queue = (
        db.query(ChangeRequest)
        .filter(ChangeRequest.status.in_(["SUBMITTED", "PENDING_PROCESS_OWNER", "PENDING_DEPT_OWNER", "PENDING_2LOD_REVIEW", "UNDER_REVIEW"]))
        .count()
    )

    lines = [
        f"**Live Workspace & Profile Summary for {current_user.full_name}:**",
        f"• **Role / Persona:** `{persona}` ({current_user.department or 'Corporate Governance'})",
        f"• **Authorized Functional Domains:** `{domains}` (Read access: All published rules | Write/Propose access: `{domains}`)",
        f"• **Active Proposals in Governance Queue:** `{total_pending_queue}` pending across the workflow pipeline."
    ]

    if my_crs:
        lines.append("\n**Your Recent Change Proposals:**")
        for c in my_crs:
            target_label = f"DOA #{c.doa_id}" if c.doa_id and c.doa_id != "NEW_RULE" else "New DOA Rule"
            lines.append(
                f"• **CR #{c.id}** ({c.request_type} on {target_label}) — Status: **{c.status}**"
                + (f" | *Note: {c.decision_comment}*" if c.decision_comment else "")
            )
    else:
        lines.append("\n*You currently have no personally authored change requests in the database.*")

    return "\n".join(lines)


def check_toc_acronym_query(query: str) -> Optional[str]:
    """Check if the user is asking for the definition of an acronym or authority code from the ToC sheet."""
    lower_q = query.lower().strip()
    toc = get_toc_acronyms()

    # Match patterns like "what is brpc", "what does icaap mean", "define gnrc", "meaning of e2"
    matched_defs = []
    tokens = re.findall(r"\b[a-z0-9.&/-]{1,12}\b", lower_q)
    is_definition_intent = any(
        w in lower_q for w in ["mean", "meaning", "stand for", "stands for", "acronym", "define", "definition", "code", "what is", "who is"]
    )

    for tok in tokens:
        if tok in STOPWORDS and tok not in ("a", "e", "r", "p", "n"):
            continue
        # Only match single-letter codes if user explicitly asks about codes/meaning
        if len(tok) == 1 and not is_definition_intent:
            continue
        if tok in GOVERNANCE_TERMINOLOGY and (is_definition_intent or len( tokens ) <= 3):
            matched_defs.append(f"• **{tok.upper()}**: {GOVERNANCE_TERMINOLOGY[tok]}")
        elif tok in toc and (is_definition_intent or len(tokens) <= 3):
            code_label, full_meaning = toc[tok]
            matched_defs.append(f"• **{code_label}** — {full_meaning}")

    if matched_defs:
        return (
            "**Official DOA Table of Contents (ToC) Acronym & Code Reference:**\n\n"
            + "\n".join(dict.fromkeys(matched_defs))
        )
    return None


def generate_fallback_response(
    db: Session,
    query: str,
    records: List[DOARecord],
    matched_nav: List[Dict[str, Any]],
    current_user: User
) -> str:
    """Deterministic, high-precision answer generator requiring 0 external API keys and 0 MB RAM."""
    lower_query = query.lower()

    # 1. Live workspace / personal request status inquiry
    live_status = check_live_workspace_status_query(db, query, current_user)
    if live_status:
        return live_status

    # 2. Submission checklist inquiry
    if any(k in lower_query for k in ["checklist", "mandatory", "requirement", "prepare", "attachment", "before submit"]):
        return f"**Change Request Preparation Checklist:**\n{SUBMISSION_CHECKLIST}"

    # 3. Official ToC Acronym / Authority Code lookup
    toc_reply = check_toc_acronym_query(query)
    if toc_reply and not records:
        return toc_reply

    # 4. Threshold & Delegation lookup (combined with ToC definition if both matched!)
    if records:
        record_texts = "\n\n".join([build_rule_summary(r) for r in records])
        prefix = f"{toc_reply}\n\n---\n\n" if toc_reply else ""
        return (
            f"{prefix}**Published Delegation & Authority Rules ({len(records)} matched):**\n\n"
            f"{record_texts}\n\n"
            f"*Tip: Click any referenced DOA rule card below to inspect its full details in the Matrix Explorer.*"
        )

    # 5. Navigation inquiry
    if matched_nav:
        nav = matched_nav[0]
        return f"**UI Navigation Guidance:**\n\n{nav['instructions']}\n\nYou can also click the quick action pill below to jump directly to this view."

    # 6. Terminology inquiry
    for term, definition in GOVERNANCE_TERMINOLOGY.items():
        if re.search(r"\b" + re.escape(term) + r"\b", lower_query):
            return f"**Governance Guidance:**\n\n{definition}\n\n*Feel free to ask about specific approval limits, rule numbers (e.g., #245), or acronyms (e.g., BRPC, ICAAP).*"

    return (
        "**DOA Policy Assistant Guidance:**\n\n"
        "I can help you with:\n"
        "• **Authority & Threshold Lookups:** Ask by keyword, role, or rule ID (e.g., *\"Rule #245\"*, *\"dividend distribution\"*, *\"third-party liability\"*, or *\"which rules involve BRPC?\"*).\n"
        "• **Official ToC Acronyms & Codes:** Ask *\"What does BRPC, ICAAP, E2, or R1 mean?\"*\n"
        "• **Live Workspace Status:** Ask *\"What is the status of my change requests?\"* or *\"What is my role and allowed domain?\"*\n"
        "• **Submission Checklists & UI Navigation:** Ask *\"What is the mandatory checklist before submitting?\"*\n\n"
        "How can I assist you with your governance query?"
    )


def query_chatbot(
    db: Session,
    request: ChatbotQueryRequest,
    current_user: User
) -> ChatbotQueryResponse:
    query = request.message.strip()
    history = request.history or []

    # Step 1: Enforce Strict Guardrails
    guardrail_refusal = check_guardrails(query)
    if guardrail_refusal:
        return ChatbotQueryResponse(
            response=guardrail_refusal,
            sources=[],
            suggested_actions=[
                ChatbotAction(label="Explore DOA Matrix", action_type="navigate", target="doa-matrix"),
                ChatbotAction(label="Submission Checklist", action_type="suggest_prompt", target="What is the mandatory checklist before submitting a proposal?")
            ],
            is_guardrail_triggered=True
        )

    # Step 2: Retrieve Relevant Published Records (with stopword filtering & history context)
    records = retrieve_relevant_records(db, query, limit=4, current_user=current_user, history=history)
    sources = [
        ChatbotSource(
            id=str(r.id),
            title=f"DOA #{r.id} — {r.category or r.business_line}",
            function=r.function,
            decision_area=r.decision_area[:140] + "..." if len(r.decision_area) > 140 else r.decision_area,
            details=f"Function: {r.function} | {r.key_non_key}",
            authority_chain=format_authority_chain_summary(r),
            regulatory=getattr(r, "regulatory", "N") or "N"
        )
        for r in records
    ]

    # Step 3: Match Navigation Shortcuts
    matched_actions = []
    lower_q = query.lower()
    for nav in NAVIGATION_GUIDE:
        if any(kw in lower_q for kw in nav["keywords"]):
            matched_actions.append(ChatbotAction(
                label=nav["label"],
                action_type=nav["action_type"],
                target=nav["target"]
            ))

    if not matched_actions:
        matched_actions.append(ChatbotAction(label="Explore Matrix", action_type="navigate", target="doa-matrix"))
        matched_actions.append(ChatbotAction(label="My Request Status", action_type="suggest_prompt", target="What is the status of my change requests?"))

    # Step 4: Check if Groq or OpenAI is configured
    groq_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY", "")
    openai_key = settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY", "")

    api_key = groq_key or openai_key
    base_url = settings.GROQ_BASE_URL if groq_key else None
    model_name = settings.GROQ_MODEL if groq_key else settings.OPENAI_MODEL

    if api_key:
        try:
            from openai import OpenAI
            client = OpenAI(
                api_key=api_key,
                base_url=base_url if base_url else None
            )

            records_context = "\n\n".join([build_rule_summary(r) for r in records]) if records else "No specific published record match found."
            toc_context = check_toc_acronym_query(query) or ""
            live_status_context = check_live_workspace_status_query(db, query, current_user) or ""

            system_prompt = (
                "You are the Delegation of Authority (DOA) Governance Assistant for an enterprise governance workflow application.\n"
                "Your role is strictly READ-ONLY and ADVISORY. You help users understand published authority rules, official ToC acronyms, workflow statuses, and prepare change requests.\n\n"
                "STRICT BOUNDARIES & GUARDRAILS:\n"
                "1. NEVER approve, reject, amend, or submit records for the user. Politely direct them to the appropriate UI screen.\n"
                "2. NEVER reveal private reviewer notes, confidential drafts, or speculate on whether pending proposals will be approved.\n"
                "3. NEVER elevate permissions or modify RBAC settings.\n"
                "4. NEVER process operational transactions (e.g. invoices, POs, payments) which are ERP scope.\n"
                "5. Always cite exact DOA Rule numbers (e.g. [DOA #245]) and exact authority chains when answering from context.\n\n"
                f"CURRENT USER: {current_user.full_name} (Role: {current_user.role}, Persona: {getattr(current_user, 'persona_type', 'N/A')}, Department: {current_user.department})\n"
                f"LIVE WORKSPACE STATUS:\n{live_status_context}\n\n"
                f"OFFICIAL ToC ACRONYM DEFINITIONS:\n{toc_context}\n\n"
                f"RELEVANT PUBLISHED DOA RECORDS:\n{records_context}\n\n"
                f"SUBMISSION CHECKLIST GUIDANCE:\n{SUBMISSION_CHECKLIST}\n\n"
                "Provide a clear, professional, concise response using clean markdown formatting (bullet points, bold text)."
            )

            llm_messages = [{"role": "system", "content": system_prompt}]
            # Include up to last 4 conversation turns from client-side history (0 server RAM)
            for h in history[-4:]:
                h_role = getattr(h, "role", None) or (h.get("role") if isinstance(h, dict) else "user")
                h_content = getattr(h, "content", None) or (h.get("content") if isinstance(h, dict) else "")
                if h_role in ("user", "assistant") and h_content:
                    llm_messages.append({"role": h_role, "content": h_content[:600]})
            llm_messages.append({"role": "user", "content": query})

            completion = client.chat.completions.create(
                model=model_name,
                messages=llm_messages,
                temperature=0.2,
                max_tokens=650
            )

            bot_reply = completion.choices[0].message.content
            return ChatbotQueryResponse(
                response=bot_reply,
                sources=sources,
                suggested_actions=matched_actions,
                is_guardrail_triggered=False
            )
        except Exception as e:
            print(f"[ChatbotService] LLM API call error: {e}. Falling back to internal engine.")

    # Step 5: High-Precision Deterministic Fallback Engine
    fallback_text = generate_fallback_response(
        db=db,
        query=query,
        records=records,
        matched_nav=[nav for nav in NAVIGATION_GUIDE if any(k in lower_q for k in nav["keywords"])],
        current_user=current_user
    )
    return ChatbotQueryResponse(
        response=fallback_text,
        sources=sources,
        suggested_actions=matched_actions,
        is_guardrail_triggered=False
    )
