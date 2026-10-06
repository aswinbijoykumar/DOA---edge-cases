# Management Reports Hub — Architecture & Role-Based Generation Plan

**Document Reference:** `report_plan.md`  
**Target Architecture:** Delegation of Authority (DOA) Governance Platform  
**Target Codebase:** `DOA---edge-cases` (FastAPI backend + React 19 frontend)  
**Requirement Focus:** Pre-set Management Reports (Active Delegations, Pending Approval Requests, Recently Modified Rules, etc.) tailored to all 7 User Roles.

---

## 1. Executive Summary & Objective

In modern corporate governance, a "one-size-fits-all" reporting mechanism fails to satisfy distinct stakeholder duties. A Commercial Requestor requires operational line clarity, a Process Owner requires SLA and bottleneck analytics, an Executive Approver requires threshold exposure summaries, and an Auditor requires historical version diffs and regulatory registers.

This plan details:
1. **Core Pre-Set Reports Architecture** (Data schema, aggregation pipelines, and export capabilities).
2. **Dedicated Role-Specific Reporting Matrices** for each of the **7 Front-End User Roles**.
3. **Data Boundary & Domain Segregation** (Finance vs. Risk scoping).
4. **Export Formats & Delivery Channels** (Excel/CSV, PDF Audit Dossier, JSON API).

---

## 2. Global Pre-Set Report Catalog (Base Modules)

The platform provides 6 foundation report engines accessible across the governance hierarchy:

| Report ID | Report Module Name | Core Data Source | Aggregation & Filters |
|---|---|---|---|
| `RPT-01` | **Active Delegations by Department** | `doa_records` | Grouped by `parent_function` (Finance vs Risk) & `business_line`. Filter: `status == 'PUBLISHED'`. |
| `RPT-02` | **Pending Governance Approvals Queue** | `change_requests` | Filter: `status in ['SUBMITTED', 'PENDING_PROCESS_OWNER', 'PENDING_DEPT_OWNER', 'PENDING_2LOD_REVIEW', 'UNDER_REVIEW']`. |
| `RPT-03` | **Recently Modified Rules (Version 2+)** | `doa_records` + `doa_versions` | Filter: `current_version > 1`. Tracks delta between baseline and current publication. |
| `RPT-04` | **Regulatory Mandated Authorities Register** | `doa_records` | Filter: `regulatory == 'Y'`. Cites Central Bank regulations, statutory laws, and compliance policies. |
| `RPT-05` | **High-Risk & Key Strategic Decisions** | `doa_records` | Filter: `key_non_key == 'Key'`. Focuses on BoD, GCEO, and Board Committee approvals. |
| `RPT-06` | **Immutable Audit & Tamper-Evident Ledger** | `audit_logs` | Chronological event logs: Submissions, endorsements, approvals, rejections, and publications. |

---

## 3. Structural Reporting Plan for All 7 User Roles

Each persona is provisioned with tailored default reports, metrics, visual dimensions, and permissible actions.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MANAGEMENT REPORTS HUB                          │
├───────────────────────────────┬────────────────────────────────────────┤
│ 1. Requestor                  │ Personal Submissions & Operational Ops │
│ 2. Process Owner              │ Process SOPs, Bottlenecks & Impacts    │
│ 3. Department Owner           │ Budget Limits & Signing Thresholds     │
│ 4. Authority Owner            │ Charter Governance & Mandate Matrix    │
│ 5. Reviewer (2LoD Risk)       │ Technical Risk, Diffs & Policy Checks  │
│ 6. Executive Approver         │ High-Value Exposure & 4-Eye Approvals  │
│ 7. Audit Read-Only            │ Assurance Snapshots & Compliance Ledger│
└───────────────────────────────┴────────────────────────────────────────┘
```

---

### Role 1: Front-End User (Business Line Analyst / Requestor)
* **Persona:** Aiden Cole (`user@doa.local`)  
* **Department:** Commercial Operations  
* **Primary Focus:** Operational self-service, tracking proposal statuses, and viewing departmental authorities.

#### Tailored Pre-Set Reports:
1. **Personal Proposal Lifecycle Report (`RPT-USR-01`):**
   - **Columns:** CR ID, Request Type (ADD/MODIFY/DELETE), Target DOA ID, Current Workflow Stage (`PENDING_PROCESS_OWNER`, `PENDING_DEPT_OWNER`, etc.), Submission Timestamp, Reviewer Notes.
   - **Metrics:** Total Drafted, In-Review, Approved, Rejected.
2. **Department Operational Limits Report (`RPT-USR-02`):**
   - **Columns:** Decision Area, Commercial Signing Thresholds, Permitted Role Operators (`A`, `E1`, `R`), SOP Policy Reference.
   - **Filter:** Locked to user's assigned department (`Commercial Operations` / `Finance`).

---

### Role 2: Process Owner (Process Integrity & Operational Lead)
* **Persona:** Elena Rostova (`process.owner@doa.local`)  
* **Department:** Supply Chain Operations  
* **Primary Focus:** Workflow integrity, P2P/Capex operational controls, SLA turnarounds, and process bottleneck identification.

#### Tailored Pre-Set Reports:
1. **End-to-End Operational Process Alignment Report (`RPT-PO-01`):**
   - **Columns:** Process Name (`Procure-to-Pay`, `Capex`, `Vendor Sourcing`), Linked DOA Rule Count, Required Endorsing Committees (`MANCO`, `ORC`), Active SOP Citations.
2. **Pending Operational Impact Queue Report (`RPT-PO-02`):**
   - **Columns:** CR ID, Requester Email, Proposed Authority Changes, Operational Latency Impact Notes, Days in Process Owner Queue.
   - **SLA Telemetry:** Alerts on requests awaiting impact assessment for > 48 hours.

---

### Role 3: Department / Function Owner (Supervisory Custodian)
* **Persona:** Marcus Vance (`dept.owner@doa.local`)  
* **Department:** Finance & Treasury  
* **Primary Focus:** Departmental signing caps, financial exposure oversight, delegation thresholds, and treasury rule maintenance.

#### Tailored Pre-Set Reports:
1. **Departmental Delegated Signing Limits Matrix (`RPT-DO-01`):**
   - **Columns:** Function, Business Line, Level 1 ($100K Manager), Level 2 ($500K Head of Dept), Level 3 (Above $500K CFO/Exec), Statutory Authority Code.
   - **Summary:** Total active rules within Department, High-value thresholds vs. Non-Key thresholds.
2. **Departmental Rule Change History (`RPT-DO-02`):**
   - **Columns:** DOA ID, Decision Area, Previous Version vs. Current Version, Author of Change, Executive Sign-off Date.

---

### Role 4: Authority Owner (Mandate & Governance Body Custodian)
* **Persona:** David Sterling (`authority.owner@doa.local`)  
* **Department:** Legal & Board Secretariat  
* **Primary Focus:** Board terms of reference, corporate charters, composite multi-tier authority chains, and statutory compliance.

#### Tailored Pre-Set Reports:
1. **Governance Charter & Terms of Reference Matrix (`RPT-AO-01`):**
   - **Columns:** Governance Body (BoD, Audit Committee, Risk Committee, NRC, GCEO), Charter Code, Statutory Mandate Ref, Total Assigned Rules, Reserved Powers Count.
2. **Composite Authority Chain Flow Report (`RPT-AO-02`):**
   - **Columns:** DOA ID, Decision Area, Step 1 Operator, Step 2 Operator, Final Binding Approver, Charter Cross-Reference.
   - **Integrity Validation:** Flags any rule missing a mandatory Board or AGM ratification step.

--- 

### Role 5: Reviewer (2LoD Risk & Policy Review Analyst)
* **Persona:** Sophia Zhang (`reviewer@doa.local`)  
* **Department:** Enterprise Risk Management  
* **Primary Focus:** Independent technical risk validation, policy citations, attribute diffs, and regulatory compliance registers.

#### Tailored Pre-Set Reports:
1. **Regulatory Mandated Rules Register (`RPT-REV-01`):**
   - **Columns:** DOA Ref, Decision Area, Central Bank / Basel Regulatory Article Reference, Mandatory Committee Reviewer, Compliance Verification Status.
2. **2LoD Technical Review Queue & Diff Report (`RPT-REV-02`):**
   - **Columns:** CR ID, Request Type, Base Version, Modified Fields (Old Value vs. Proposed Value), Concurrency Check Status (`Stale` vs `Valid`), 2LoD Recommendation Notes.

---

### Role 6: Executive Approver (Executive Committee / VP Finance)
* **Persona:** Julian Hayes (`approver@doa.local`)  
* **Department:** Executive Management  
* **Primary Focus:** High-risk corporate exposure, formal binding decisions, 4-eye workflow verifications, and threshold sign-offs.

#### Tailored Pre-Set Reports:
1. **Executive Pending Approval Portfolio Report (`RPT-APP-01`):**
   - **Columns:** CR ID, Requester, Operational Impact Summary (from Process Owner), Department Sign-off (from Dept Owner), 2LoD Risk Recommendation (from Reviewer), Financial Exposure Amount.
2. **Executive Binding Decisions Audit Report (`RPT-APP-02`):**
   - **Columns:** Decision ID, Action (`APPROVED` / `REJECTED`), Obligatory Rationale Remarks, Approver Timestamp, Publication Readiness Indicator.

---

### Role 7: Internal Audit & Compliance (Read-Only Assurance)
* **Persona:** Claire Montgomery (`audit.readonly@doa.local`)  
* **Department:** Internal Audit & Assurance  
* **Primary Focus:** Tamper-evident governance proof, historical version snapshots, full audit ledger queries, and SoD compliance.

#### Tailored Pre-Set Reports:
1. **Complete Version Snapshot Dossier (`RPT-AUD-01`):**
   - **Columns:** DOA Record ID, Version Number (`v1`, `v2`, ...), Version Status (`HISTORICAL` / `PUBLISHED`), Change Request Reference, Published By, Publication Date, Full JSON State Snapshot.
2. **Tamper-Evident Immutable Audit Ledger (`RPT-AUD-02`):**
   - **Columns:** Log ID, Action Code, Entity (`DOA_RECORD`, `CHANGE_REQUEST`), Actor Email, Actor Role, Old Value Snapshot, New Value Snapshot, Timestamp (UTC).
3. **Segregation of Duties (SoD) Exception Report (`RPT-AUD-03`):**
   - **Analysis:** Automatically flags any instance where a Requester attempted to approve their own request or where intermediate 4-eye steps were bypassed.

---

## 4. Role-to-Report Access & Matrix Summary

| Report Name | Requestor | Process Owner | Dept Owner | Authority Owner | Reviewer | Approver | Internal Audit |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Personal Proposal Status** | **Primary** | - | - | - | - | - | Read-Only |
| **Operational Impact & SOPs** | - | **Primary** | View | - | View | View | Read-Only |
| **Dept Signing Limits Matrix** | View | View | **Primary** | View | View | View | Read-Only |
| **Charter & BoD Mandate Matrix** | View | - | - | **Primary** | View | View | Read-Only |
| **2LoD Technical Diff Report** | - | - | - | - | **Primary** | View | Read-Only |
| **Executive Decision Inbox** | - | - | - | - | - | **Primary** | Read-Only |
| **Historical Version Snapshots** | - | - | - | View | View | View | **Primary** |
| **Immutable Audit Log Ledger** | - | - | - | - | View | View | **Primary** |

---

## 5. Technical Implementation Blueprint

### 5.1 Backend REST API Architecture
Extend `backend/app/api/normal_user.py` and `roles_workflows.py` with parameterized report generation routes:

```python
# Generic report router
GET /api/user/reports/management?report_type={report_type}&parent_function={Finance|Risk}&format={json|csv|pdf}

# Role-specific parameterized endpoints:
GET /api/process-owner/reports/operational-alignment
GET /api/dept-owner/reports/signing-limits
GET /api/authority-owner/reports/charter-mandates
GET /api/reviewer/reports/regulatory-register
GET /api/approver/reports/pending-executive-portfolio
GET /api/audit-readonly/reports/tamper-evident-ledger
```

### 5.2 Frontend UI Enhancements
Inside `NormalUserDashboard.jsx` (Sub-view 3: `Management Reports Hub`):
1. **Dynamic Tab Categorization:** Filter report selector cards based on `currentUser.persona_type`.
2. **Export Actions:**
   - **Export to CSV / Excel:** Client-side CSV generator converting table JSON into downloadable spreadsheet.
   - **Print / PDF Dossier:** Clean print-media stylesheet generating audit-ready PDF sheets.
3. **Live Search & Column Sorting:** In-table keyword filter and ascending/descending sorts on all columns.

---

## 6. Implementation Milestones

1. **Milestone 1:** Refine backend report queries to support role-filtered datasets and domain scoping.
2. **Milestone 2:** Update `NormalUserDashboard.jsx` to display role-tailored report cards based on the active persona.
3. **Milestone 3:** Add one-click CSV export utility to download any generated report table.
4. **Milestone 4:** Verification via PyTest automated test cases and React production build.
