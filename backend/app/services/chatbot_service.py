import os
import json
import re
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database.models import DOARecord, User
from app.core.config import settings
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

GOVERNANCE_TERMINOLOGY = {
    "doa": "Delegation of Authority (DOA): A foundational governance framework establishing who within the organization holds the authority to recommend, endorse, or approve operational and strategic commitments.",
    "2lod": "Two Lines of Defense (2LoD): An internal governance model ensuring that operational departments (1st line) proposing changes undergo independent compliance and risk review by the Governance Team (2nd line) before executive publication.",
    "r": "R (Recommend / Review): The role or committee designated to examine proposals and recommend action prior to formal endorsement or approval.",
    "a": "A (Approve): The ultimate decision-maker authorized to sanction the action or transaction up to defined threshold limits.",
    "e": "E (Endorse): Intermediate functional or departmental concurrence required before final approval.",
    "p": "P (Process Owner): The stakeholder accountable for end-to-end design, execution integrity, and maintenance of a specific process area.",
    "submitted": "Status: Request formally lodged by requester; awaiting 2LoD Governance Team review.",
    "clarification_required": "Status: The Governance Team reviewed the proposal and returned it to the requester for additional documentation, evidence, or justification.",
    "under_review": "Status: Proposal actively under examination by Governance Reviewers or designated committees.",
    "approved": "Status: Formally cleared by Governance Reviewers. Note: Approved requests do NOT overwrite the active matrix until Controlled Publication is executed.",
    "published": "Status: Formally released into the live master matrix by the DOA Administrator, incrementing the baseline version snapshot.",
    "archived": "Status: Historical version superseded by a newer version or retired due to regulatory/organizational updates."
}

NAVIGATION_GUIDE = [
    {
        "keywords": ["submit", "propose", "amend", "new request", "create request", "raise request"],
        "label": "Open Change Proposal Form",
        "action_type": "navigate",
        "target": "new-proposal",
        "instructions": "Click '+ New Proposal' or 'Propose Change' in the top header or sidebar to open the 3-step Change Request modal."
    },
    {
        "keywords": ["diff", "comparison", "side-by-side", "compare"],
        "label": "View Diff Inspector",
        "action_type": "navigate",
        "target": "diff-inspector",
        "instructions": "In the Governance Review Queue or Change Request details, click 'Inspect Diffs' to view field-by-field Old vs New side-by-side comparisons."
    },
    {
        "keywords": ["matrix", "search", "filter", "limits", "thresholds", "records"],
        "label": "Explore DOA Matrix",
        "action_type": "navigate",
        "target": "doa-matrix",
        "instructions": "Navigate to the DOA Matrix directory tab where you can search by keyword, filter by Function (Finance/Risk), and inspect designation authority columns."
    },
    {
        "keywords": ["audit", "trail", "history", "logs"],
        "label": "Inspect Audit Trail",
        "action_type": "navigate",
        "target": "audit-trail",
        "instructions": "Access the 'Audit Trail' or 'Compliance Ledger' view from the navigation menu to review tamper-evident chronological event records."
    }
]

SUBMISSION_CHECKLIST = """
Mandatory Requirements Before Submitting a DOA Change Request:
1. Decision Area & Category: Clear identification of the specific authority rule being amended or created.
2. Business Justification: Detailed rationale explaining operational, financial, or organizational necessity.
3. Authority Chain: Specifying designations for Review (R), Endorsement (E), and Final Approval (A).
4. Proposed Effective Date: Intended go-live date following publication.
5. Supporting Documentation:
   - Board minutes or committee charter if altering statutory limits.
   - Formal policy extract or regulatory reference (e.g., MAS, CBO, or IFRS compliance notes) if flagged as Regulatory Mandate (Y).
"""

def check_guardrails(query: str) -> Optional[str]:
    """Check if query violates read-only or out-of-scope guardrails."""
    lower_query = query.lower()
    for pattern, refusal in GUARDRAIL_PATTERNS:
        if re.search(pattern, lower_query):
            return refusal
    return None

def retrieve_relevant_records(db: Session, query: str, limit: int = 4) -> List[DOARecord]:
    """Search published DOA records matching query terms."""
    terms = [t.strip() for t in query.split() if len(t.strip()) > 2]
    if not terms:
        return db.query(DOARecord).filter(DOARecord.status == "PUBLISHED").limit(limit).all()

    conditions = []
    for term in terms[:3]:
        conditions.append(DOARecord.decision_area.ilike(f"%{term}%"))
        conditions.append(DOARecord.category.ilike(f"%{term}%"))
        conditions.append(DOARecord.function.ilike(f"%{term}%"))
        conditions.append(DOARecord.business_line.ilike(f"%{term}%"))

    results = (
        db.query(DOARecord)
        .filter(DOARecord.status == "PUBLISHED")
        .filter(or_(*conditions))
        .limit(limit)
        .all()
    )
    return results

def build_rule_summary(record: DOARecord) -> str:
    """Format DOARecord into a concise text summary for context."""
    authorities = []
    if record.board_of_directors: authorities.append(f"Board: {record.board_of_directors}")
    if record.ceo: authorities.append(f"CEO: {record.ceo}")
    if record.gceo: authorities.append(f"GCEO: {record.gceo}")
    if record.c_level1: authorities.append(f"C-Level 1: {record.c_level1} ({record.c_level1_op or 'A'})")
    if record.c_level2: authorities.append(f"C-Level 2: {record.c_level2} ({record.c_level2_op or 'A'})")
    if record.mgmt_committees: authorities.append(f"Mgmt Committee: {record.mgmt_committees} ({record.mgmt_committees_op or 'A'})")

    auth_str = ", ".join(authorities) if authorities else "Standard governance tier"
    reg_str = f" [Regulatory Mandate: {record.regulatory}]" if getattr(record, 'regulatory', None) == 'Y' else ""
    return f"• [Ref #{record.id}] {record.function} > {record.category}: {record.decision_area} | Authority: {auth_str}{reg_str}"

def generate_fallback_response(query: str, records: List[DOARecord], matched_nav: List[Dict[str, Any]]) -> str:
    """Deterministic, high-quality answer generator when OpenAI API key is unavailable."""
    lower_query = query.lower()

    # 1. Submission checklist inquiry
    if any(k in lower_query for k in ["checklist", "mandatory", "requirement", "prepare", "attachment", "before submit"]):
        return f"**Change Request Preparation Checklist:**\n{SUBMISSION_CHECKLIST}"

    # 2. Navigation inquiry
    if matched_nav:
        nav = matched_nav[0]
        return f"**UI Navigation Guidance:**\n\n{nav['instructions']}\n\nYou can also click the quick action below to jump directly to this view."

    # 3. Terminology inquiry (exact word matches)
    for term, definition in GOVERNANCE_TERMINOLOGY.items():
        if re.search(r"\b" + re.escape(term) + r"\b", lower_query):
            return f"**Governance Guidance:**\n\n{definition}\n\n*Feel free to ask about specific approval limits or submission checklists.*"

    # 4. Threshold & Delegation lookup
    if records:
        record_texts = "\n\n".join([build_rule_summary(r) for r in records])
        return (
            f"**Published Delegation & Authority Information:**\n\n"
            f"Here are the approved rules matching your inquiry from the published master matrix:\n\n"
            f"{record_texts}\n\n"
            f"*Note: These reflect currently active, published thresholds. For proposed amendments, submit a change proposal.*"
        )

    return (
        "**DOA Assistant Guidance:**\n\n"
        "I can help you with:\n"
        "• Looking up published financial limits and role authorities (e.g., CapEx, Procurement, Credit).\n"
        "• Explaining workflow statuses (Draft, Under Review, Clarification Required, Approved, Published).\n"
        "• Preparing change proposals (mandatory fields, attachment guidelines).\n"
        "• Navigating the UI (Change Request modal, side-by-side Diff Inspector, Audit Ledger).\n\n"
        "How can I assist you with your governance query?"
    )

def query_chatbot(
    db: Session,
    request: ChatbotQueryRequest,
    current_user: User
) -> ChatbotQueryResponse:
    query = request.message.strip()

    # Step 1: Enforce Strict Guardrails
    guardrail_refusal = check_guardrails(query)
    if guardrail_refusal:
        return ChatbotQueryResponse(
            response=guardrail_refusal,
            sources=[],
            suggested_actions=[
                ChatbotAction(label="View Published Matrix", action_type="navigate", target="doa-matrix"),
                ChatbotAction(label="Check Submission Checklist", action_type="suggest_prompt", target="What is the mandatory checklist before submitting a proposal?")
            ],
            is_guardrail_triggered=True
        )

    # Step 2: Retrieve Relevant Published Records
    records = retrieve_relevant_records(db, query, limit=3)
    sources = [
        ChatbotSource(
            id=str(r.id),
            title=f"DOA #{r.id} - {r.category}",
            function=r.function,
            decision_area=r.decision_area[:120] + "..." if len(r.decision_area) > 120 else r.decision_area,
            details=f"Function: {r.function} | Key/Non-Key: {r.key_non_key}"
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
        matched_actions.append(ChatbotAction(label="New Proposal", action_type="navigate", target="new-proposal"))

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

            records_context = "\n".join([build_rule_summary(r) for r in records]) if records else "No specific published record match found."

            system_prompt = (
                "You are the Delegation of Authority (DOA) Governance Assistant for an enterprise governance workflow application.\n"
                "Your role is strictly READ-ONLY and ADVISORY. You help users understand published authority rules, navigate the UI, understand workflow statuses, and prepare change requests.\n\n"
                "STRICT BOUNDARIES & GUARDRAILS:\n"
                "1. NEVER approve, reject, amend, or submit records for the user. Politely direct them to the appropriate UI screen.\n"
                "2. NEVER reveal private reviewer notes, confidential drafts, or speculate on whether pending proposals will be approved.\n"
                "3. NEVER elevate permissions or modify RBAC settings.\n"
                "4. NEVER process operational transactions (e.g. invoices, POs, payments) which are ERP scope.\n"
                "5. Only reference published authority limits provided in context or general governance best practices.\n\n"
                f"CURRENT USER: {current_user.full_name} ({current_user.role})\n"
                f"RELEVANT PUBLISHED DOA RECORDS:\n{records_context}\n\n"
                f"SUBMISSION CHECKLIST GUIDANCE:\n{SUBMISSION_CHECKLIST}\n\n"
                "Provide a clear, professional, concise response using clean markdown formatting (bullet points, bold text)."
            )

            completion = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query}
                ],
                temperature=0.2,
                max_tokens=600
            )

            bot_reply = completion.choices[0].message.content
            return ChatbotQueryResponse(
                response=bot_reply,
                sources=sources,
                suggested_actions=matched_actions,
                is_guardrail_triggered=False
            )
        except Exception as e:
            # Graceful fallback to deterministic engine on API error
            print(f"[ChatbotService] LLM API call error: {e}. Falling back to internal engine.")

    # Step 5: High-Quality Deterministic Fallback Response
    fallback_text = generate_fallback_response(query, records, [nav for nav in NAVIGATION_GUIDE if any(k in lower_q for k in nav["keywords"])])
    return ChatbotQueryResponse(
        response=fallback_text,
        sources=sources,
        suggested_actions=matched_actions,
        is_guardrail_triggered=False
    )
