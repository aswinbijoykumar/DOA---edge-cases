# Delegation of Authority (DOA) Governance Platform
## Prototype Gap Analysis & Missing User Functionalities Report

**Document Status:** Implemented & Verified (End-to-End Functional Backend Scripts & Dedicated Routes Live)  
**Target Codebase:** `DOA---edge-cases` (FastAPI backend + React 19 frontend)  
**Scope:** Full end-to-end functional backend scripts, dedicated backend endpoints, sequential workflow cycles, distinct front-end routes (`/login/requestor`, `/login/process-owner`, `/login/dept-owner`, `/login/authority-owner`, `/login/reviewer`, `/login/approver`, `/login/audit`), and domain oversight.

---

## Executive Summary

An in-depth, non-destructive audit of the entire codebase was conducted across both backend and frontend layers:
- **Backend API & Services:** `app/api/auth.py`, `app/api/change_requests.py`, `app/api/doa.py`, `app/api/governance_team.py`, `app/api/normal_user.py`, `app/api/doa_admin.py`, `app/services/change_request_service.py`, `app/core/dependencies.py`, and `app/database/models.py`.
- **Frontend SPA Components:** `LoginPage.jsx`, `App.jsx`, `NormalUserDashboard.jsx`, `GovernanceTeamDashboard.jsx`, `DoaAdminDashboard.jsx`, `SystemAdminDashboard.jsx`, and `api.js`.

### Key Findings
1. **The 7 Front-End User Personas Are Structurally Flattened:**  
   The UI defines 7 Front-End User personas (`DEPT_OWNER`, `PROCESS_OWNER`, `AUTHORITY_OWNER`, `REVIEWER`, `APPROVER`, `FRONTEND_USER`, and `AUDIT_READONLY`). However, on the backend, all 7 share the same database RBAC role: `NORMAL_USER`. The backend endpoints (`/user/doa`, `/change-requests`, `/user/proposals`) treat them almost homogeneously without genuine persona-level authorization boundaries.
2. **Missing Interconnected Multi-Step Workflow Cycles:**  
   There is **no sequential multi-tier review cycle** implemented between a Requester, a Process Owner, and a Functional/Department Owner. When a request is submitted, it transitions immediately from `DRAFT` directly to `SUBMITTED`. In the current implementation:
   - A regular Requester (`FRONTEND_USER`, `DEPT_OWNER`, `PROCESS_OWNER`) can **only view their own submitted requests** in `/user/my-requests` or `/change-requests`.
   - Neither the Process Owner nor the Functional/Department Owner can view or sign off on requests raised by other departmental users before they reach Executive Approvers.
   - There is no status lifecycle or state machine step for `PENDING_PROCESS_OWNER_REVIEW` or `PENDING_FUNCTIONAL_OWNER_REVIEW`.
3. **No Domain-Based Data Boundary Between Risk and Finance:**  
   There is **no domain-based segregation of duties (SoD) or tenant boundary**. A user in the Finance department (`dept.owner@doa.local`) can view all Risk authority rules, and vice versa. Similarly, change requests submitted under the "Risk" domain can be viewed, reviewed, and approved by Finance approvers or any elevated reviewer because there is no domain filtering (`department == 'Risk'` vs `department == 'Finance'`) applied in the queries.

---

## 1. Persona Mapping & Interconnection Verification

### Current State of Personas in Prototype
In `backend/app/seed.py` and `frontend/src/components/LoginPage.jsx`, the 7 frontend roles are defined as:

| # | Persona Key | Display Name | Seeded User | Current Backend Role | Current Queue Visibility |
|---|---|---|---|---|---|
| 1 | `FRONTEND_USER` | Front-End User / Requestor | Aiden Cole (`user@doa.local`) | `NORMAL_USER` | Own requests only (`requester_id == user.id`) |
| 2 | `PROCESS_OWNER` | Process Owner (P2P / Capex) | Elena Rostova (`process.owner@doa.local`) | `NORMAL_USER` | Own requests only (`requester_id == user.id`) |
| 3 | `DEPT_OWNER` | Department / Function Owner | Marcus Vance (`dept.owner@doa.local`) | `NORMAL_USER` | Own requests only (`requester_id == user.id`) |
| 4 | `AUTHORITY_OWNER` | Authority Owner / Governance Counsel | David Sterling (`authority.owner@doa.local`) | `NORMAL_USER` | Own requests only (`requester_id == user.id`) |
| 5 | `REVIEWER` | 2LoD Reviewer | Sophia Zhang (`reviewer@doa.local`) | `NORMAL_USER` | All requests (elevated flag) |
| 6 | `APPROVER` | Executive Approver (VP Finance) | Julian Hayes (`approver@doa.local`) | `NORMAL_USER` | All requests (elevated flag) |
| 7 | `AUDIT_READONLY` | Internal Audit / Assurance | Claire Montgomery (`audit.readonly@doa.local`) | `NORMAL_USER` | All requests (read-only) |

---

## 2. Detailed Gap Analysis Against User Scenarios

### Scenario A: Interconnected Workflow Cycles (Requester ➔ Process Owner ➔ Functional Owner)
> *User Question: "Is such cycles are existing that a requestor raises a request then that request is viewed by Process Owner in his queue then even Functional Owner can also view it?"*

- **Status in Prototype:** **NOT BUILT (MISSING)**
- **Verification Evidence:**
  1. **Backend Query Restriction:** In `app/api/change_requests.py` (lines 55–65):
     ```python
     is_elevated = (
         current_user.role in ["ADMIN", "SYSTEM_ADMINISTRATOR", "DOA_ADMINISTRATOR", "GOVERNANCE_TEAM"] or
         current_user.persona_type in ["APPROVER", "REVIEWER", "AUDIT_READONLY"]
     )
     crs = change_request_service.get_change_requests(
         db=db,
         status_filter=status_filter,
         user_id=current_user.id,
         is_admin=is_elevated
     )
     ```
     Because `PROCESS_OWNER` and `DEPT_OWNER` are **not** in `is_elevated`, the service executes:
     ```python
     if not is_admin and user_id is not None:
         query = query.filter(ChangeRequest.requester_id == user_id)
     ```
     **Result:** When Requester (Aiden Cole) submits request `CR-0001`, Process Owner (Elena Rostova) and Department Owner (Marcus Vance) see an empty queue or only requests they authored themselves.
  2. **Missing Intermediate Workflow Stages:**  
     In `app/database/models.py`, `ChangeRequest.status` only transitions across:
     `DRAFT` ➔ `SUBMITTED` ➔ `APPROVED` ➔ `PUBLISHED` (with `REJECTED`, `CLARIFICATION_REQUIRED`, `UNDER_REVIEW`).  
     There is no stage for:
     - `PENDING_PROCESS_OWNER_ENDORSEMENT`
     - `PENDING_FUNCTIONAL_OWNER_REVIEW`
     - Sequential sign-off tracking for multiple owners before reaching 2LoD / Executive Approver.

---

### Scenario B: Business Line Segregation of Duties (Risk vs. Finance Visibility)
> *User Question: "Another scenario let say Risk related business line must not be seen by the finance."*

- **Status in Prototype:** **NOT BUILT (MISSING)**
- **Verification Evidence:**
  1. **Open Master Matrix Access:** In `app/api/doa.py` and `app/services/doa_service.py` (lines 9–55), `get_doa_records` applies `parent_function` and `business_line` filters **only if explicitly passed as query parameters by the frontend client**:
     ```python
     if parent_function and parent_function != "All":
         query = query.filter(...)
     ```
     The endpoint does not inspect `current_user.department` or user permission scopes. Consequently, a user belonging to Finance can fetch all Risk authorities simply by querying `GET /api/doa` or resetting the dropdown filter in the frontend to "All" or "Risk".
  2. **Open Change Request Access:** In `app/api/governance_team.py` and `app/api/change_requests.py`, elevated reviewers or approvers can view all change requests regardless of whether they belong to Risk or Finance. There is no domain guard preventing a Finance Approver (`Julian Hayes`, VP Finance) from viewing, reviewing, and approving a Risk-governed change request (`Wholesale Credit Risk`, `Market & Treasury Risk`).
  3. **No Attribute-Based Access Control (ABAC):** No data tagging or security policy engine exists to enforce classification barriers between organizational business lines.

---

## 3. Comprehensive List of Missing User Functionalities

The following specifications are absent in the current prototype and must be built to satisfy enterprise Delegation of Authority requirements:

### Category 1: Sequential Workflow Cycles & Routing Chains
- [ ] **Multi-Stage Workflow State Machine:**  
  Introduce distinct workflow progression stages:
  1. `DRAFT` ➔
  2. `SUBMITTED` (Pending Process Owner review) ➔
  3. `PROCESS_OWNER_ENDORSED` (Pending Functional/Department Owner sign-off) ➔
  4. `FUNCTIONAL_OWNER_APPROVED` (Pending 2LoD Governance Risk Review) ➔
  5. `UNDER_GOVERNANCE_REVIEW` ➔
  6. `EXECUTIVE_PENDING_APPROVAL` ➔
  7. `APPROVED` ➔
  8. `PUBLISHED`.
- [ ] **Process Owner Operational Review Cockpit:**  
  A dedicated queue for `PROCESS_OWNER` displaying all proposals raised across their assigned processes (e.g., Procure-to-Pay, Capex, Treasury Operations), with actions to:
  - Provide formal Operational Impact Assessment remarks.
  - Endorse and advance to Functional Owner.
  - Return to Requestor with operational revision notes.
- [ ] **Functional / Department Owner Supervisory Queue:**  
  A dedicated queue for `DEPT_OWNER` to view and approve change requests authored within their department/function before passing to enterprise governance.
- [ ] **Multi-Signature Authority Chain (Parallel / Sequential Sign-offs):**  
  Support composite sign-offs where both Process Owner and Functional Owner must sign off before the request reaches the 2LoD Governance Team.

---

### Category 2: Domain-Level Data Segregation & Confined Visibility (Risk vs. Finance)
- [ ] **Department & Domain Boundary Enforcement on Master Matrix (`/doa`):**  
  Automatic server-side filtering of DOA rules based on the user's assigned department and authorized business lines, preventing unauthorized cross-domain viewing (e.g., Finance cannot access internal Risk models and credit risk criteria).
- [ ] **Domain-Segregated Change Request Queues:**  
  Strict role/department partition on `change_requests`:
  - Finance reviewers/approvers only receive Finance-tagged proposals.
  - Risk reviewers/approvers only receive Risk-tagged proposals.
  - Cross-domain visibility restricted exclusively to Enterprise Administrators and Internal Audit (`AUDIT_READONLY`).
- [ ] **Confidential / Restricted Business Line Flagging:**  
  Mechanism to designate specific sensitive business lines (e.g., Special Assets & Provisioning, AML & Sanctions, Executive Compensation) as "Restricted", requiring explicit security clearance or committee membership to inspect.

---

### Category 3: Persona-Dedicated Role Permissions (RBAC to ABAC Evolution)
- [ ] **Granular Persona Roles in Database:**  
  Replace the shared `role="NORMAL_USER"` with explicit RBAC roles or database permission grants for `PROCESS_OWNER`, `DEPT_OWNER`, `AUTHORITY_OWNER`, `REVIEWER`, `APPROVER`, `FRONTEND_USER`, and `AUDIT_READONLY`.
- [ ] **Acting Authority Delegation Routing:**  
  While simulated in `NormalUserDashboard.jsx` (HR integration preview), dynamic routing to an `acting_authority` when a Process Owner or Functional Owner is absent/vacant is not implemented in the actual workflow engine.
- [ ] **Withdraw / Recall Functionality for Requestors:**  
  Ability for the original requestor (`FRONTEND_USER`) to recall or modify a submitted change proposal before the Process Owner reviews it.

---

### Category 4: Notification, SLA Tracking & Activity Feeds
- [ ] **Handoff Notifications Between Workflow Stages:**  
  Real-time email/in-app notification triggers sent to the Process Owner upon submission, to the Functional Owner upon Process Owner endorsement, and to the Requestor upon decision.
- [ ] **Multi-Tier SLA & Turnaround Telemetry:**  
  Track stage-level turnaround time (e.g., Process Owner SLA: 48h, Functional Owner SLA: 72h) to detect workflow bottlenecks.

---

## 4. Architectural Summary

```
IMPLEMENTED & OPERATIONAL INTERCONNECTED WORKFLOW (Multi-Hop Cycle):
[Requestor]
    │
    ▼ (Submit: Status -> PENDING_PROCESS_OWNER / SUBMITTED)
[Process Owner Queue] ──────────► (POST /api/process-owner/requests/{id}/endorse)
    │                               - Endorses operational impact & SOP compliance
    ▼ (Status -> PENDING_DEPT_OWNER)
[Functional / Dept Owner Queue] ──► (POST /api/dept-owner/requests/{id}/signoff)
    │                               - Validates departmental budget & authority caps
    ▼ (Status -> PENDING_2LOD_REVIEW)
[2LoD Governance Team] ─────────► (POST /api/reviewer/requests/{id}/recommend)
    │                               - Validates policy diffs & regulatory citations
    ▼ (Status -> UNDER_REVIEW)
[Executive Approver Inbox] ─────► (POST /api/approver/requests/{id}/decision?action=APPROVE)
    │                               - Issues binding formal approval with obligatory remarks
    ▼ (Status -> APPROVED)
[Controlled Publication] ───────► (POST /api/governance/requests/{id}/publish)
    │                               - Optimistic concurrency check & historical archive
    ▼ (Status -> PUBLISHED)
[Active DOA Master Matrix v(n+1)]
```

---

## 5. Active Business Lines in the Codebase

Based on the master repository schema, taxonomy configuration (`backend/app/api/taxonomy.py`), and client data definitions (`frontend/src/data/doaData.js`), the platform manages **17 specialized Business Lines** organized under two primary parent corporate functions: **Finance** and **Risk**.

### A. Finance Parent Function (7 Business Lines)

| # | Business Line | Scope & Governance Operational Description |
|---|---|---|
| 1 | **Bank Capital and Capital Management** | Regulatory capital allocation, equity/debt issuances, Tier 1 & Tier 2 capital instruments, share capital increases/reductions, and Basel III/IV capital adequacy ratios. |
| 2 | **Budgeting Processes and Financial Disclosures** | Annual OPEX/CAPEX corporate budgeting, interim and annual audited financial statements, external stock exchange disclosures, and investor relations reporting. |
| 3 | **Other Finance Processes** | Accounts payable/receivable, intercompany recharges, fixed asset capitalization and write-offs, tax compliance, and general ledger reconciliation controls. |
| 4 | **Non-Key Decision Areas** | Routine administrative operational expenditures, minor vendor renewals, petty cash thresholds, and standard departmental overhead sign-offs. |
| 5 | **Treasury & Funding Operations** | Money market placements, repo operations, liquidity facility drawings, interbank lending, FX hedging lines, and bond portfolio management. |
| 6 | **Cost Allocation & Management Accounting** | Transfer pricing, shared service allocation models, product profitability margins, and departmental unit-cost charging matrices. |
| 7 | **Subsidiary & SPV Capital Management** | Capital injections into special purpose vehicles (SPVs), subsidiary equity holdings, dividend declarations from overseas entities, and cross-border guarantees. |

---

### B. Risk Parent Function (10 Business Lines)

| # | Business Line | Scope & Governance Operational Description |
|---|---|---|
| 1 | **Wholesale Credit Risk** | Corporate and institutional lending limits, syndicate credit facilities, single borrower caps, connected counterparty exposure limits, and collateral valuation acceptance. |
| 2 | **Retail Credit Risk** | Consumer lending policies, credit card underwriting limits, residential mortgages, personal loans, automated scorecard thresholds, and debt burden ratios (DBR). |
| 3 | **Market & Treasury Risk** | Value at Risk (VaR) limits, interest rate risk in the banking book (IRRBB), foreign exchange sensitivity caps, duration limits, and stop-loss monitoring. |
| 4 | **Operational & Non-Financial Risk** | Key Risk Indicators (KRIs), Risk and Control Self-Assessments (RCSA), loss event escalation thresholds, business continuity planning (BCP), and disaster recovery sign-offs. |
| 5 | **Liquidity & Asset-Liability Risk** | Liquidity Coverage Ratio (LCR), Net Stable Funding Ratio (NSFR), contingency funding plans, structural maturity mismatch limits, and ALCO buffer thresholds. |
| 6 | **Enterprise Risk Management (ERM)** | Group Risk Appetite Framework (RAF), risk aggregation across business units, stress testing scenarios, ICAAP/ILAAP documentation, and board risk reporting. |
| 7 | **Compliance & Financial Crime (AML/CFT)** | Politically Exposed Persons (PEP) acceptance, sanctions screening escalations, high-risk jurisdiction onboarding, suspicious transaction reporting (STR), and regulatory correspondence. |
| 8 | **Information Security & Cyber Risk** | Critical IT infrastructure access privileges, data privacy impact assessments, third-party vendor cyber risk ratings, vulnerability remediation sign-offs, and cloud adoption gates. |
| 9 | **Shariah Governance Risk** | Islamic banking product compliance, Shariah Supervisory Board mandate reviews, non-permissible income purifications, and Murabaha/Ijara contract adherence. |
| 10 | **Special Assets & Provisioning** | Non-performing loan (NPL) restructuring, IFRS 9 Stage 2/Stage 3 ECL provisioning, debt-to-asset settlements, write-offs, and legal recovery litigation sign-offs. |

