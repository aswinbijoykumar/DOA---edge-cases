# Supplementary BRD Backend Implementation (Edge Cases & Governance Controls)

In accordance with the Supplementary Business Requirements Document (BRD), the backend has been augmented with modular services and database tables built cleanly on top of the existing foundation without breaking existing interfaces.

---

## 1. Supplementary Relational Entities (`app/database/supplementary_models.py`)

- **`authoritative_sources`**: Master registry of governing charters, resolutions, policies, laws, and powers of attorney (VAL-01).
- **`decision_area_source_links`**: Many-to-many relationship linking decision areas to authoritative sources with impact review flags.
- **`controlled_expenditure_limits`**: Controlled monetary expenditure limits with currency, ceiling amount, and approved source references (VAL-11).
- **`exception_requests`**: Multi-stage exception requests (`SUBMITTED` $\rightarrow$ `REPORTING_MGR_APPROVED` $\rightarrow$ `DIVISION_HEAD_APPROVED` $\rightarrow$ `GOVERNANCE_APPROVED`), storing deviated rules, rationale, decision history, and audit trails (Section 4.3).
- **`legal_entities`**: Multi-entity and geography definitions (e.g., Bahrain B.S.C., KSA LLC, UAE Branch) with read-only vs read-write access boundaries (Section 4.4).
- **`cross_geography_mappings`**: Cross-geography decision area alignment mappings with authority limit and pathway comparison states.
- **`periodic_certifications`**: Periodic compliance certification cycles (Annual, Semi-Annual) with proactive notification and escalation status tracking (Section 5).
- **`governance_findings`**: Configurable compliance and integrity findings with severity, owner, due date, and resolution states.
- **`temporary_delegations`**: Acting authority delegations with strict authority ceilings, non-exceedance verification, and auto-expiry logic.

---

## 2. Decision Area Validation Engine (`app/services/decision_area_validation_service.py`)

Implements strict pre-submission checks with hard-stop violations vs approved exceptions:
- **VAL-01**: Mandatory evidence attachment or linked authoritative source verification.
- **VAL-02**: Mandatory validation fields validation (requester, proposer, reviewer, approver, rationale, effective date).
- **VAL-03**: Audit Committee sequencing rule enforcement (Audit Committee must be the terminal Board Committee).
- **VAL-04 & VAL-05**: Automatic DOA classification (`BOARD_LEVEL` if final approver is Shareholders, Board, Board Committee, GCEO, or CEO; otherwise `MANAGEMENT_LEVEL`).
- **VAL-06**: Segregation of Duties (SoD) enforcement (proposer cannot be final approver; incompatible roles blocked).
- **VAL-07**: Board/Shareholder governance rule (Board requires at least one Board Committee endorsement; Shareholders require Board participation).
- **VAL-08**: Governance pathway sequence verification (`P -> R -> E -> A`).
- **VAL-09**: Singular final approval authority rule when Board is final approver.
- **VAL-10 & VAL-11**: Financial classification and limit validation against controlled pre-approved ceilings or explicit amounts.
- **VAL-12**: Singular, non-ambiguous final approving authority verification.

---

## 3. Multi-Stage Exception Workflow Service (`app/services/exception_workflow_service.py`)

Enforces the 4-step governance exception lifecycle:
1. **Reporting Manager Review**: Approval, amendment, or return with mandatory rationale.
2. **Division Head Review**: Departmental review and endorsement.
3. **DOA Governance Senior Review**: Governance team triage and final senior reviewer evaluation before publication.
4. **Immutable Audit Trail**: Captures user identity, role, timestamp, old/new states, comments, and rationale at each stage.

---

## 4. Supplementary Governance Service (`app/services/supplementary_governance_service.py`)

- **Authoritative Source Impact Assessment**: Triggers impact assessments upon source changes/updates, identifying affected decision areas and flagging them for mandatory impact review without silently mutating approved authority records.
- **Cross-Geography Comparison Engine**: Compares corresponding decision areas across jurisdictions (e.g., Bahrain vs. KSA) returning an explicit comparison result (`IDENTICAL`, `MISMATCH_AUTHORITY_LIMIT`, `MISMATCH_GOVERNANCE_PATHWAY`, `UNMAPPED`).
- **Bahrain–KSA Alignment Reconciliation Report**: Generates an automated reconciliation breakdown separating complete matches from mismatches, articulating specific mismatch reasons and required alignment outcomes.
- **Point-in-Time Reconstruction**: Historical reconstruction engine enabling authorized compliance users to inspect the exact active authority state, limits, holders, and source links effective on any arbitrary historical date.

---

## 5. Supplementary REST API Topology (`/api/supplementary`)

- `POST /api/supplementary/validate-proposal`: Validates proposed decision areas against VAL-01..12 rules.
- `GET|POST /api/supplementary/exceptions`: Submits and lists exceptional decision area workflows.
- `POST /api/supplementary/exceptions/{id}/action`: Executes multi-stage exception actions (`APPROVE`, `REJECT`, `RETURN_FOR_COMMENTS`).
- `GET|POST /api/supplementary/authoritative-sources`: Manages authoritative policy/resolution sources.
- `POST /api/supplementary/authoritative-sources/{id}/trigger-impact`: Triggers source change impact assessment.
- `GET|POST /api/supplementary/expenditure-limits`: Retrieves and manages controlled expenditure limits.
- `GET|POST /api/supplementary/cross-geography/mappings`: Manages cross-entity jurisdiction mappings.
- `POST /api/supplementary/cross-geography/compare`: Executes pairwise cross-geography comparison.
- `GET /api/supplementary/reports/bahrain-ksa-alignment`: Produces Bahrain–KSA reconciliation report.
- `POST /api/supplementary/point-in-time/reconstruct`: Reconstructs historical active DOA state for any given date.
- `GET|POST /api/supplementary/certifications`: Manages periodic recertifications.
- `GET|POST /api/supplementary/temporary-delegations`: Manages acting authority delegations with ceilings.
- `GET|POST /api/supplementary/findings`: Manages governance integrity findings.
