# Delegation of Authority (DOA) Governance Platform
## Comprehensive Test Case Workflows & Lifecycle Specification

**Document Reference:** `test_lifecycle.md`  
**Target Codebase:** `DOA---edge-cases` (FastAPI backend + React 19 frontend)  
**Scope:** Complete manual and automated testing instructions for both happy-path (Approved & Published) and alternate/rejection paths (Executive Rejection, Requestor Self-Withdrawal, Clarification Reroute).

---

## Quick Reference: Role Credentials for Testing

| Persona Role | User Name | Email | Password | Landing Route | Tab in Login |
|---|---|---|---|---|---|
| **Requestor (Front-End User)** | Aiden Cole | `user@doa.local` | `User@123` | `/login/requestor` | Normal Users |
| **Process Owner** | Elena Rostova | `process.owner@doa.local` | `User@123` | `/login/process-owner` | Normal Users |
| **Department / Function Owner** | Marcus Vance | `dept.owner@doa.local` | `User@123` | `/login/dept-owner` | Normal Users |
| **Authority Owner** | David Sterling | `authority.owner@doa.local` | `User@123` | `/login/authority-owner` | Normal Users |
| **Reviewer (2LoD Risk)** | Sophia Zhang | `reviewer@doa.local` | `User@123` | `/login/reviewer` | Normal Users |
| **Executive Approver** | Julian Hayes | `approver@doa.local` | `User@123` | `/login/approver` | Normal Users |
| **Audit Read-Only** | Claire Montgomery | `audit.readonly@doa.local` | `User@123` | `/login/audit` | Normal Users |
| **Governance Team** | Risk & Governance Reviewer | `governance@doa.local` | `GovTeam@123` | `/login/governance` | Enterprise Admins |
| **DOA Administrator** | DOA Admin Custodian | `doaadmin@doa.local` | `DoaAdmin@123` | `/login/doa-admin` | Enterprise Admins |

---

# Workflow 1: Happy Path — End-to-End Proposal to Controlled Publication (Accepted ➔ Published)

This workflow tests the complete multi-hop governance lifecycle from initial proposal creation by a Business Line Analyst to live publication into the DOA Master Repository v(n+1).

```
[1. Requestor]
      │
      ▼  (Submits ADD or MODIFY proposal)
[Status: SUBMITTED / PENDING_PROCESS_OWNER]
      │
      ▼  (2. Process Owner verifies SOPs and clicks "Endorse")
[Status: PENDING_DEPT_OWNER]
      │
      ▼  (3. Dept Owner verifies budget limits and clicks "Signoff")
[Status: PENDING_2LOD_REVIEW]
      │
      ▼  (4. 2LoD Reviewer verifies policy citations and clicks "Recommend")
[Status: UNDER_REVIEW]
      │
      ▼  (5. Executive Approver reviews 4-eye checks and clicks "Approve")
[Status: APPROVED]
      │
      ▼  (6. DOA Administrator executes Controlled Publication)
[Status: PUBLISHED ──► Active in Master Repository v(n+1)]
```

### Test Steps:

#### Step 1.1: Requestor Creates a New Proposal
1. Log in as **Aiden Cole** (`user@doa.local` / `User@123`).
2. Navigate to the **New Request** tab.
3. Select **Mode:** `Add` (or `Modify`).
   * **Parent Function:** `Finance`
   * **Business Line:** `Bank Capital and Capital Management`
   * **Decision Area:** `Approve Tier 2 subordinated debt issuance up to $50M`
   * **Key / Non-Key:** `Key`
   * **Regulatory Mandate:** `Y`
   * **Rationale:** `Capital adequacy compliance requirement under Basel III framework.`
   * **Authority Chain Builder:** Select `Board Committees (AC) -> E1` and click `(+)` to add step.
4. Click **Submit Add Proposal**.
5. **Expected Result:**
   * Success toast appears with generated Change Request ID (e.g. `CR-0008`).
   * Status is recorded as **`SUBMITTED`** / **`PENDING_PROCESS_OWNER`**.
   * Switch to the **Change Queue** tab to confirm the proposal appears with a blue/amber status badge.

#### Step 1.2: Process Owner Endorses Operational Impact
1. Click **Logout** (top right).
2. Log in as **Elena Rostova** (`process.owner@doa.local` / `User@123`).
3. Navigate to the **Change Queue** tab.
4. Locate the newly created Change Request.
5. Under the **Governance Action** column, click the blue **`Endorse`** button.
6. In the prompt dialog, enter:  
   `"SOP and operational control impact verified; Procure-to-Pay workflow aligns."`
7. Click **OK**.
8. **Expected Result:**
   * Success toast: *"Process Owner endorsed operational impact for CR-xxxx, routed to Functional Owner."*
   * Status badge transitions to teal: **`PENDING DEPT OWNER`**.

#### Step 1.3: Department / Function Owner Supervisory Sign-off
1. Click **Logout**.
2. Log in as **Marcus Vance** (`dept.owner@doa.local` / `User@123`).
3. Navigate to the **Change Queue** tab.
4. Locate the Change Request with status **`PENDING DEPT OWNER`**.
5. Under the **Governance Action** column, click the teal **`Signoff`** button.
6. In the prompt dialog, enter:  
   `"Departmental signing thresholds and treasury liquidity parameters verified."`
7. Click **OK**.
8. **Expected Result:**
   * Success toast: *"Department signoff recorded for CR-xxxx, routed to 2LoD Reviewer."*
   * Status badge transitions to cyan: **`PENDING 2LOD REVIEW`**.

#### Step 1.4: 2LoD Reviewer Technical Risk Clearance
1. Click **Logout**.
2. Log in as **Sophia Zhang** (`reviewer@doa.local` / `User@123`).
3. Navigate to the **Change Queue** (or **Review Queue**) tab.
4. Locate the Change Request with status **`PENDING 2LOD REVIEW`**.
5. Click **`Diff`** to inspect the proposed values against live baseline version.
6. Click the cyan **`Recommend`** button.
7. In the prompt dialog, enter:  
   `"2LoD independent technical risk review complete. No policy or compliance objections."`
8. Click **OK**.
9. **Expected Result:**
   * Success toast: *"2LoD recommendation submitted for CR-xxxx, cleared for Executive Approver."*
   * Status badge transitions to purple: **`UNDER REVIEW`**.

#### Step 1.5: Executive Approver Formal Binding Decision
1. Click **Logout**.
2. Log in as **Julian Hayes** (`approver@doa.local` / `User@123`).
3. Navigate to the **Change Queue** tab.
4. Locate the Change Request with status **`UNDER REVIEW`**.
5. Under the **Governance Action** column, click the green **`Approve`** button.
6. The **Executive Decision Dialog** modal opens.
7. Enter mandatory decision commentary:  
   `"Formal Executive Committee authorization granted in accordance with Group Governance Charter."`
8. Click **Submit Approval**.
9. **Expected Result:**
   * Success toast confirms formal executive approval.
   * Status badge transitions to blue: **`APPROVED`**.

#### Step 1.6: Master Controlled Publication
1. Click **Logout**.
2. On the Login Page, switch to the **Enterprise Administrators** tab.
3. Log in as **DOA Administrator** (`doaadmin@doa.local` / `DoaAdmin@123`) or **Governance Team** (`governance@doa.local` / `GovTeam@123`).
4. Navigate to the **Change Queue** tab.
5. Locate the Change Request with status **`APPROVED`**.
6. Under the **Governance Action** column, click the green **`Publish`** button.
7. **Expected Result:**
   * The backend validates optimistic concurrency, increments master version, snapshots historical state, and writes to immutable audit ledger.
   * Status updates to green: **`PUBLISHED`** with double checkmarks.
   * Switch to the **Search DoA** tab: the new record is live and visible in the active repository!

---

# Workflow 2: Rejection Paths (Executive Rejection & Requestor Self-Withdrawal)

This section provides two distinct test paths demonstrating how proposals are formally rejected or withdrawn before publication.

---

## Path 2A: Executive Formal Rejection with Mandatory Rationale

This scenario tests an executive rejection where the request fails 4-eye approval or exceeds risk tolerances.

```
[Requestor] ──(Submits Proposal)──> [Process Owner Endorses] ──> [Dept Owner Signs Off] ──> [2LoD Reviewer Clears]
                                                                                                    │
                                                                                                    ▼
                                                                                   [Executive Approver: REJECT]
                                                                                                    │
                                                                                                    ▼
                                                                                          [Status: REJECTED]
                                                                                   (Blocked from Publication)
```

### Test Steps:

#### Step 2A.1: Raise and Progress Proposal to `UNDER REVIEW`
1. Log in as **Aiden Cole** (`user@doa.local` / `User@123`).
2. In **New Request**, submit a proposal with Decision Area:  
   `"Exceed single borrower limits up to $150M without collateral"`
3. Progress the request through Process Owner (**Endorse**), Dept Owner (**Signoff**), and Reviewer (**Recommend**) until its status reaches **`UNDER REVIEW`**.

#### Step 2A.2: Executive Rejection
1. Click **Logout**.
2. Log in as **Julian Hayes** (`approver@doa.local` / `User@123`).
3. Navigate to the **Change Queue** tab.
4. Locate the proposal with status **`UNDER REVIEW`**.
5. Under the **Governance Action** column, click the red **`Reject`** button.
6. The **Executive Decision Dialog** opens:
   * **Action Badge:** `REJECT` (styled in red).
   * Enter obligatory rejection remarks:  
     `"Rejected by Executive Committee: Proposed single borrower limit violates CBB Credit Exposure standard §4.2."`
7. Click **Confirm Rejection**.

#### Step 2A.3: Verification of Rejection Safeguards
1. **Status Badge:** Transitions to red **`REJECTED`**.
2. **Publication Blocked:** Log in as **DOA Administrator** (`doaadmin@doa.local`) and open **Change Queue**. Notice that the green **Publish** button is **NOT available** for this request (only `APPROVED` requests can be published).
3. **Audit Trail Verification:**
   * Switch to the **Audit Trail** tab.
   * Verify an immutable log entry with:
     - **Action:** `REJECT_CHANGE`
     - **Actor:** `approver@doa.local`
     - **Commentary:** Contains the exact rejection reason entered by the Approver.
4. **Master Matrix Integrity:** Switch to **Search DoA**; verify the rejected rule was **never added or altered** in the master table.

---

## Path 2B: Requestor Self-Withdrawal (Cancellation by Author)

This scenario tests a Requestor recalling an erroneous proposal before executive decision.

```
[Requestor (Aiden Cole)] ────(Submits Erroneous Proposal)────► [Status: SUBMITTED]
          │
          └────────(Clicks "Withdraw" on Own Proposal)──────► [Status: REJECTED / WITHDRAWN]
```

### Test Steps:

#### Step 2B.1: Submit Erroneous Proposal
1. Log in as **Aiden Cole** (`user@doa.local` / `User@123`).
2. In **New Request**, submit a test proposal with rationale: `"Accidental draft submission"`.
3. Open the **Change Queue** tab.

#### Step 2B.2: Requestor Withdraws Proposal
1. Locate the proposal you just authored (status **`SUBMITTED`**).
2. Under the **Governance Action** column, notice the **`Withdraw`** button (visible only to the original author for their own pending requests).
3. Click **`Withdraw`**.
4. A confirmation dialog appears:  
   `"Are you sure you want to withdraw your proposal CR-xxxx?"`
5. Click **OK**.

#### Step 2B.3: Verification
1. Success toast appears: *"Proposal CR-xxxx withdrawn successfully."*
2. Status transitions to **`REJECTED`** with commentary: `[Withdrawn by Requestor Aiden Cole]`.
3. The proposal is halted and cannot be progressed further.

---

## Summary Matrix of Status Lifecycles

| Event | Initiating Role | Endpoint Triggered | Resulting Status | Next Permitted Action |
|---|---|---|---|---|
| **Submit Proposal** | Requestor (`FRONTEND_USER`) | `POST /api/requestor/proposals` | `SUBMITTED` / `PENDING_PROCESS_OWNER` | Process Owner Endorse / Requestor Withdraw |
| **Endorse Impact** | Process Owner (`PROCESS_OWNER`) | `POST /api/process-owner/requests/{id}/endorse` | `PENDING_DEPT_OWNER` | Dept Owner Signoff |
| **Dept Signoff** | Dept Owner (`DEPT_OWNER`) | `POST /api/dept-owner/requests/{id}/signoff` | `PENDING_2LOD_REVIEW` | 2LoD Reviewer Recommend |
| **2LoD Recommendation** | Reviewer (`REVIEWER`) | `POST /api/reviewer/requests/{id}/recommend` | `UNDER_REVIEW` | Executive Approver Decision |
| **Executive Approval** | Approver (`APPROVER`) | `POST /api/approver/requests/{id}/decision?action=APPROVE` | `APPROVED` | DOA Admin / Governance Publish |
| **Executive Rejection** | Approver (`APPROVER`) | `POST /api/approver/requests/{id}/decision?action=REJECT` | `REJECTED` | Terminal State (Archived) |
| **Self-Withdrawal** | Requestor (`FRONTEND_USER`) | `POST /api/requestor/proposals/{id}/withdraw` | `REJECTED` | Terminal State (Archived) |
| **Master Publication** | Admin / Governance (`DOA_ADMIN`) | `POST /api/governance/requests/{id}/publish` | `PUBLISHED` | Active Rule v(n+1) in Matrix |
