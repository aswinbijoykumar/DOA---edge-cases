# DOA Case Lifecycle & Exception Execution Workflows

This document outlines the exact, step-by-step workflow specifications for both the **Standard DOA Case Lifecycle** and the **Exceptional Case Governance Lifecycle**, incorporating all newly developed governance checks, validation gates (VAL-01 – VAL-12), and role-based permissions.

---

## 1. Standard Case Lifecycle Workflow

```text
[1. Requestor / Proposer (P)]
      │
      ▼  (Pre-Submission Check passes VAL-01 to VAL-12: Evidence attached, SoD clear, P-R-E-A sequence valid)
[Status: SUBMITTED]
      │
      ▼  (2. Central Governance Team / 2LoD reviews diff, tags committees, requests clarification if needed)
[Status: PENDING_PROCESS_OWNER / UNDER_REVIEW]
      │
      ▼  (3. Process Owner evaluates operational impact & SOP alignment, clicks "Endorse")
[Status: PENDING_DEPT_OWNER]
      │
      ▼  (4. Department Owner reviews delegated budget limits, signing caps, and clicks "Signoff")
[Status: PENDING_2LOD_REVIEW]
      │
      ▼  (5. 2LoD Risk Reviewer evaluates policy compliance, single-counterparty exposure, clicks "Recommend")
[Status: UNDER_REVIEW]
      │
      ▼  (6. Executive Approver / VP Finance conducts 4-eye check, verifies no self-approval, clicks "Approve")
[Status: APPROVED]
      │
      ▼  (7. DOA Administrator runs optimistic concurrency check on base_version, executes Controlled Publication)
[Status: PUBLISHED ──► Previous v(n) archived as HISTORICAL, Active Record promoted to v(n+1)]
      │
      ▼
[Audit Trail: Immutable Log Entry Recorded ──► Available for Point-in-Time Historical Reconstruction]
```

### Standard Workflow Stage Steps:
1. **Pre-Submission Check & Submission (`Requestor`):**
   - Validates proposal against `VAL-01` to `VAL-12` (authoritative governance source links, currency and ceiling validation, Audit Committee terminal positioning, and SoD).
   - Generates change request with initial status `SUBMITTED`.
2. **Second-Line Governance Triage (`Governance Team`):**
   - Inspects current vs. proposed field-level diffs.
   - Tags required governance stakeholders (e.g., `Board Audit Committee`, `Chief Risk Officer`).
   - If clarification is needed, sets status to `CLARIFICATION_REQUIRED`; once clarified by the requestor, it returns to `SUBMITTED`.
3. **Operational Endorsement (`Process Owner`):**
   - Inspects P2P/Capex operational boundary impacts and records formal operational impact assessment notes.
   - Advances request to `PENDING_DEPT_OWNER`.
4. **Departmental Sign-off (`Department Owner`):**
   - Confirms finance thresholds (L1 Manager, L2 Head, L3 CFO) and statutory authorities.
   - Advances request to `PENDING_2LOD_REVIEW`.
5. **Risk Recommendation (`2LoD Reviewer`):**
   - Completes technical risk review and logs recommendation comment.
   - Advances request to `UNDER_REVIEW`.
6. **Executive Approval (`Executive Approver`):**
   - Checks that requester $\neq$ approver (Segregation of Duties).
   - Makes binding decision:
     - **REJECT:** Request set to `REJECTED` with mandatory rationale (cannot be published; requestor can amend and resubmit).
     - **APPROVE:** Request set to `APPROVED` with mandatory executive approval rationale.
7. **Controlled Publication (`DOA Administrator`):**
   - Verifies target DOA record has not been concurrently mutated (`base_version == current_version`, otherwise `HTTP 409 Conflict`).
   - Archives current version snapshot $v(n)$ as `HISTORICAL`.
   - Promotes DOA record to $v(n+1)$ with status `PUBLISHED`.
   - Records full action in append-only audit ledger.

---

## 2. Exceptional Case Lifecycle Workflow (Section 4.3)

*Triggered when a proposed decision area must deviate from standard validation principles (e.g., Segregation of Duties waiver, alternative committee sequence, statutory regulatory mandate).*

```text
[1. Requestor / Proposer (P)]
      │
      ▼  (Pre-Submission Check flags Hard-Stop e.g. VAL-01, VAL-06, VAL-08, or VAL-11)
[Validation Hard-Stop Detected: Submission Blocked]
      │
      ▼  (Requestor identifies deviated validation principles and records mandatory statutory/business rationale)
[Exception Request Drafted: Status = SUBMITTED]
      │
      ▼  (2. Stage 1: Reporting Manager / Business Unit Head reviews deviation rationale)
[Status: REPORTING_MGR_APPROVED / RETURNED_FOR_COMMENTS / REJECTED]
      │
      ▼  (3. Stage 2: Division Head evaluates division risk exposure and records endorsement)
[Status: DIVISION_HEAD_APPROVED / RETURNED_FOR_COMMENTS / REJECTED]
      │
      ▼  (4. Stage 3: Central Governance Team receives item explicitly as an Exception Approval Request)
[Status: GOVERNANCE_REVIEW]
      │
      ▼  (5. Stage 4: Senior Member of DOA Governance evaluates statutory justification and signs off)
[Status: GOVERNANCE_APPROVED]
      │
      ▼  (6. Decision Area certified as Exceptional: Deviated rules, approvers, rationales recorded)
[Certified Exceptional Case Enters Standard Approval / Publication Queue]
      │
      ▼  (7. DOA Administrator executes Controlled Publication with Exception Tagging)
[Status: PUBLISHED ──► Exceptional Flag Active, Reported in Exception Dashboard & Audit Ledger]
```

### Exceptional Workflow Stage Steps:
1. **Exception Identification & Submission (`Requestor`):**
   - Identifies specific deviated principles (e.g. `VAL-01 Evidence Waiver`, `VAL-06 SoD Override`, `VAL-11 Ceiling Override`).
   - Records mandatory documented regulatory or statutory business rationale.
   - Designates routing line (Reporting Manager $\rightarrow$ Division Head).
2. **Stage 1: Reporting Manager Review (`Dept / Line Head`):**
   - Options:
     - **Approve Exception:** Records mandatory rationale and advances to `REPORTING_MGR_APPROVED`.
     - **Return with Comments:** Returns request to requestor for required amendments.
     - **Reject Exception:** Terminates exception workflow.
3. **Stage 2: Division Head Review (`Division Head`):**
   - Evaluates divisional exposure.
   - Options:
     - **Approve Exception:** Records mandatory division rationale and advances to `DIVISION_HEAD_APPROVED`.
     - **Return with Comments:** Returns request for revision.
     - **Reject Exception:** Terminates workflow.
4. **Stage 3: Governance Team Triage (`Governance Team`):**
   - Receives item flagged explicitly as an **Exception Approval Request** (not standard approval).
   - Verifies legal source documentation and statutory citations.
5. **Stage 4: Senior DOA Governance Sign-off (`DOA Governance Senior Reviewer`):**
   - Senior member conducts final compliance evaluation before release.
   - Approves exception request $\rightarrow$ status becomes `GOVERNANCE_APPROVED`.
6. **Certification & Downstream Publication (`System & DOA Administrator`):**
   - Stores all deviated validation principles, approving identities, timestamps, and rationales in the audit record.
   - Decision area enters controlled publication queue.
   - Once published, the record remains flagged as `Exceptional` across the matrix and is surfaced in live **Exception Reporting** (Section 4.5).

---

## 3. List of Testable BRD Changes Performed

- **VAL-01 Supporting Evidence & Sources:** Enforces mandatory links to governing policies or resolutions. Blocks proposal submission until valid evidence is attached or an authorised exception waiver is recorded.
- **VAL-03 Audit Committee Sequencing:** Enforces Audit Committee as the terminal Board Committee in governance pathways. Flags hard-stop if any Board Committee appears after the Audit Committee.
- **VAL-04 / VAL-05 Classification Engine:** Automatically tags proposals as `Board-level DOA` (if approver is Shareholders, Board, Board Committee, GCEO, or CEO) or `Management-level DOA` (below CEO).
- **VAL-06 Segregation of Duties (SoD):** Blocks the same user from acting as both proposer and final approver. Prohibits combining incompatible roles in one request without approved override.
- **VAL-07 Board & Shareholder Governance:** Mandates at least one Board Committee endorsement if Board is final approver. Requires Board participation prior to shareholder approval.
- **VAL-08 / VAL-09 Pathway Sequencing:** Validates strict `Proposer (P) -> Reviewer (R) -> Endorser (E) -> Approver (A)` order. Restricts approval authority strictly to the Board when Board is final approver.
- **VAL-10 / VAL-11 Controlled Financial Limits:** Requires explicit monetary ceilings or linked pre-approved controlled limits with verified source citations for financial decision areas.
- **VAL-12 Singular Final Approver:** Mandates exactly one clearly identified final approving authority before submission is allowed to proceed.
- **Section 4.3 Multi-Stage Exception Workflow:** Provides a 4-step route (Reporting Manager $\rightarrow$ Division Head $\rightarrow$ Central Governance $\rightarrow$ Senior Reviewer) capturing mandatory rationales, amendments, returns, and decision history.
- **Section 4.4 Authoritative Source Impact Trigger:** Source updates flag linked decision areas for impact review, identifying differing authority while preserving approved matrix states without silent mutations.
- **Section 4.4 Cross-Geography Comparison:** Performs pairwise jurisdiction comparison (e.g., Bahrain B.S.C. vs KSA LLC) returning definitive alignment states (`IDENTICAL`, `MISMATCH_AUTHORITY_LIMIT`, `MISMATCH_GOVERNANCE_PATHWAY`).
- **Section 4.4 & Acceptance Criteria Bahrain-KSA Reconciliation Report:** Generates live reconciliation dossier separating full parity matches from mismatches, articulating specific mismatch causes and required harmonization actions.
- **Section 4.4 Temporary Delegations:** Manages acting authority delegations with strict ceilings, preventing exceedance of delegator authority and enforcing automated expiration.
- **Section 5 Historical Point-in-Time Reconstruction:** Allows auditors to choose any past date and reconstruct the exact legally effective authority matrix, limits, holders, and source links.
- **Frontend UI/UX Modals & Cockpits:** Added Pre-Submission Validator modal, Exception Proposal modal, Exception Review Inbox, Bahrain-KSA Parity dossier, and Point-in-Time audit tab across dashboards.

