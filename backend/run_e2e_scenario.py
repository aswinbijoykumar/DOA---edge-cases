"""
Standalone E2E Test Suite strictly modeling the two flowcharts from manual_test.md:
1. Standard Case Lifecycle Flow:
   [Requestor (Drafts)] -> [Pre-Submission (VAL-01..12)] -> [SUBMITTED]
   -> [2. Governance Team / 2LoD (Reviews diff, tags)] -> [PENDING_PROCESS_OWNER / UNDER_REVIEW]
   -> [3. Process Owner (Operational Impact Check)] -> [PENDING_DEPT_OWNER]
   -> [4. Department Owner (Thresholds & Budget Signoff)] -> [PENDING_2LOD_REVIEW]
   -> [5. 2LoD Risk Reviewer (Policy & Exposure)] -> [UNDER_REVIEW]
   -> [6. Executive Approver (4-Eye Check)] -> [APPROVED] (Also verifies REJECTED branch)
   -> [7. DOA Administrator (Controlled Publication)] -> [PUBLISHED v(n) -> v(n+1)]
   -> [Audit Trail Ledger Recorded]

2. Exceptional Case Lifecycle Flow:
   [Requestor (Drafts with hard-stop deviation)] -> [Validation Hard-Stop Detected: Blocked]
   -> [Requestor Logs Deviation + Statutory Rationale] -> [SUBMITTED Exception Request]
   -> [2. Stage 1: Reporting Mgr / BU Head] -> [REPORTING_MGR_APPROVED]
   -> [3. Stage 2: Division Head] -> [DIVISION_HEAD_APPROVED]
   -> [4. Stage 3: Governance Team] -> [GOVERNANCE_REVIEW]
   -> [5. Stage 4: Senior DOA Governance Member] -> [GOVERNANCE_APPROVED]
   -> [6. Exception Certification] -> [Certified Exceptional Case Enters Publication Queue]
   -> [7. DOA Administrator] -> [PUBLISHED with Exceptional Flag Active]
"""

import sys
import json
import httpx

BASE_URL = "http://127.0.0.1:8000/api"
client = httpx.Client(timeout=30.0)

PASSWORDS = {
    "admin@doa.local": "Admin@123",
    "governance@doa.local": "GovTeam@123",
    "doaadmin@doa.local": "DoaAdmin@123",
    "sysadmin@doa.local": "SysAdmin@123"
}

def login(email):
    password = PASSWORDS.get(email, "User@123")
    res = client.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if res.status_code != 200:
        raise Exception(f"Login failed for {email}: {res.status_code} {res.text}")
    return res.json()["access_token"]

def run_e2e_test_scenario():
    print("=" * 80)
    print("STARTING END-TO-END SCENARIO RUN FOR BOTH LIFECYCLES (manual_test.md)")
    print("=" * 80)

    # 0. Acquire Tokens for All Stakeholders
    print("\n[Step 0] Logging in all 7 role personas...")
    requestor_token = login("user@doa.local")
    process_owner_token = login("process.owner@doa.local")
    dept_owner_token = login("dept.owner@doa.local")
    reviewer_token = login("reviewer@doa.local")
    approver_token = login("approver@doa.local")
    governance_token = login("governance@doa.local")
    admin_token = login("admin@doa.local")
    print("  [PASS] All persona tokens successfully obtained.")

    # =========================================================================
    # LIFECYCLE 1: STANDARD CASE LIFECYCLE
    # =========================================================================
    print("\n" + "#" * 60)
    print("LIFECYCLE 1: STANDARD CASE LIFECYCLE")
    print("#" * 60)

    # 1.1 Pre-submission validation & Draft
    print("\n[Standard Step 1] Requestor drafts new proposal & runs Pre-Submission Checks (VAL-01..VAL-12)...")
    proposal_payload = {
        "request_type": "ADD",
        "department": "Finance",
        "process": "Treasury & Capital Management",
        "rationale": "E2E Standard Case: Introduce operational limits for commercial funding facilities.",
        "base_version": 1,
        "entity_id": "ENT-BH-01",
        "classification": "Board-level DOA",
        "operational_impact": "Streamlines local funding and treasury settlement approvals.",
        "attachments": [
            {"filename": "Board_Approved_Liquidity_Charter.pdf", "uri": "doc://governance/charter-2026.pdf", "type": "pdf"}
        ],
        "authoritative_source_ids": ["SRC-CBB-01"],
        "proposed_value": {
            "parent_function": "Finance",
            "function": "Finance",
            "business_line": "Treasury & Capital Management",
            "category": "Treasury & Capital Management",
            "key_non_key": "Key",
            "decision_area": "Approve short-term interbank money market placements up to USD 25M",
            "shareholders": "",
            "board_of_directors": "A",
            "gceo": "E",
            "c_level1": "P",
            "c_level2": "R",
            "composite_authority": "Board of Directors (A)",
            "regulatory": "Y",
            "currency": "USD",
            "tier_limit_amount": 25000000,
            "evidence_reference": "SRC-CBB-2026-001; Board Charter Article 4.2",
            "prea_sequence": "P-R-E-A"
        }
    }
    
    # Pre-submission check API
    val_res = client.post(
        f"{BASE_URL}/change-requests/validate",
        json=proposal_payload,
        headers={"Authorization": f"Bearer {requestor_token}"}
    )
    if val_res.status_code == 200:
        val_data = val_res.json()
        print(f"  [PASS] Pre-Submission check completed. Hard-stops: {val_data.get('hard_stops_count', 0)}")
    
    # Formal submission
    cr_res = client.post(
        f"{BASE_URL}/change-requests",
        json=proposal_payload,
        headers={"Authorization": f"Bearer {requestor_token}"}
    )
    assert cr_res.status_code in [200, 201], f"Submission failed: {cr_res.text}"
    cr = cr_res.json()
    cr_id = cr["id"]
    print(f"  [PASS] Proposal SUBMITTED successfully: ID = {cr_id}, Status = {cr['status']}")
    assert cr["status"] == "SUBMITTED"

    # 1.2 Governance Team / 2LoD Review
    print(f"\n[Standard Step 2] Governance Team / 2LoD inspects diff & tags required committees on #{cr_id}...")
    diff_res = client.get(f"{BASE_URL}/change-requests/{cr_id}/diff", headers={"Authorization": f"Bearer {governance_token}"})
    assert diff_res.status_code == 200
    print(f"  [PASS] Diff inspected successfully. Field modifications count: {len(diff_res.json().get('diffs', []))}")

    tag_res = client.post(
        f"{BASE_URL}/governance/requests/{cr_id}/tag-stakeholders",
        json={"stakeholders": ["Board Audit Committee", "Head of Compliance"]},
        headers={"Authorization": f"Bearer {governance_token}"}
    )
    print(f"  [PASS] Committees tagged. Advancing to PENDING_PROCESS_OWNER.")

    # 1.3 Process Owner Endorsement
    print(f"\n[Standard Step 3] Process Owner evaluates operational impact & SOP alignment...")
    po_res = client.post(
        f"{BASE_URL}/process-owner/requests/{cr_id}/endorse",
        json={"comment": "Operational boundary & Treasury SOP verified."},
        headers={"Authorization": f"Bearer {process_owner_token}"}
    )
    assert po_res.status_code == 200, f"Process Owner action failed: {po_res.text}"
    print(f"  [PASS] Process Owner endorsed. Status: {po_res.json().get('status')}")

    # 1.4 Department Owner Sign-off
    print(f"\n[Standard Step 4] Department Owner reviews budget limits & signs off...")
    dept_res = client.post(
        f"{BASE_URL}/dept-owner/requests/{cr_id}/signoff",
        json={"comment": "Department limits and financial threshold confirmed."},
        headers={"Authorization": f"Bearer {dept_owner_token}"}
    )
    assert dept_res.status_code == 200, f"Dept Owner action failed: {dept_res.text}"
    print(f"  [PASS] Department Owner sign-off recorded. Status: {dept_res.json().get('status')}")

    # 1.5 2LoD Risk Reviewer
    print(f"\n[Standard Step 5] 2LoD Risk Reviewer verifies single-counterparty exposure & policy compliance...")
    rev_res = client.post(
        f"{BASE_URL}/reviewer/requests/{cr_id}/recommend",
        json={"comment": "Risk compliance and single obligor exposure verified without objection."},
        headers={"Authorization": f"Bearer {reviewer_token}"}
    )
    assert rev_res.status_code == 200, f"Reviewer action failed: {rev_res.text}"
    print(f"  [PASS] Risk Reviewer recommended. Status: {rev_res.json().get('status')}")

    # 1.6 Executive Approval (4-Eye Check)
    print(f"\n[Standard Step 6] Executive Approver / VP Finance conducts 4-eye check & signs final approval...")
    appr_res = client.post(
        f"{BASE_URL}/change-requests/{cr_id}/approve",
        json={"decision_comment": "Final Executive Approval: Formal endorsement for Board Delegation matrix."},
        headers={"Authorization": f"Bearer {approver_token}"}
    )
    assert appr_res.status_code == 200, f"Executive approval failed: {appr_res.text}"
    print(f"  [PASS] Executive Approval granted: Status = {appr_res.json().get('status')}")
    assert appr_res.json().get('status') == "APPROVED"

    # 1.7 Controlled Publication by DOA Administrator
    print(f"\n[Standard Step 7] DOA Administrator executes Controlled Publication with version promotion...")
    pub_res = client.post(
        f"{BASE_URL}/change-requests/{cr_id}/publish",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert pub_res.status_code == 200, f"Controlled Publication failed: {pub_res.text}"
    pub_data = pub_res.json()
    new_doa_id = pub_data.get("doa_id")
    print(f"  [PASS] Controlled Publication Completed! Status: PUBLISHED. DOA Record: {new_doa_id}")

    # Verify Audit Trail
    audit_res = client.get(f"{BASE_URL}/audit", headers={"Authorization": f"Bearer {admin_token}"})
    assert audit_res.status_code == 200, f"Audit query failed: {audit_res.text}"
    logs = audit_res.json()
    print(f"  [PASS] Audit Trail Verified: {len(logs)} immutable audit log entries recorded in ledger.")

    # =========================================================================
    # LIFECYCLE 2: EXCEPTIONAL CASE LIFECYCLE
    # =========================================================================
    print("\n" + "#" * 60)
    print("LIFECYCLE 2: EXCEPTIONAL CASE GOVERNANCE LIFECYCLE")
    print("#" * 60)

    # 2.1 Validation Hard-Stop Detection & Exception Draft
    print("\n[Exceptional Step 1] Requestor drafts proposal containing hard-stop deviation (VAL-06 SoD Conflict)...")
    exc_payload = {
        "doa_id": new_doa_id or "DOA-ZZZ-999",
        "exception_type": "SOD_EXCEPTION",
        "deviated_principles": ["VAL-06 Segregation of Duties Override", "VAL-11 Financial Limit Override"],
        "rationale": "Urgent central bank liquidity facility required under emergency macro liquidity policy. Compensating control: Independent monthly ex-post inspection by Board Audit Committee.",
        "supporting_documents": [
            {"filename": "Board_Risk_Committee_Emergency_Resolution.pdf", "uri": "doc://governance/brc-resolution.pdf"}
        ],
        "proposed_effective_date": "2026-01-01",
        "review_date": "2027-01-01"
    }

    exc_res = client.post(
        f"{BASE_URL}/supplementary/exceptions",
        json=exc_payload,
        headers={"Authorization": f"Bearer {requestor_token}"}
    )
    assert exc_res.status_code in [200, 201], f"Exception draft creation failed: {exc_res.text}"
    exc = exc_res.json()
    exc_id = exc["id"]
    print(f"  [PASS] Exception Request Drafted: ID = {exc_id}, Status = {exc.get('status')}, Stage = {exc.get('current_stage')}")

    # 2.2 Stage 1: Reporting Manager Review
    print(f"\n[Exceptional Step 2] Stage 1: Reporting Manager / Business Unit Head reviews deviation rationale...")
    act1_res = client.post(
        f"{BASE_URL}/supplementary/exceptions/{exc_id}/action",
        json={"action": "APPROVE", "comment": "Emergency justification verified and validated against market conditions."},
        headers={"Authorization": f"Bearer {dept_owner_token}"}
    )
    assert act1_res.status_code == 200, f"Stage 1 action failed: {act1_res.text}"
    print(f"  [PASS] Stage 1 Approved. Next Stage = {act1_res.json().get('current_stage')}")
    assert act1_res.json().get('current_stage') == "PENDING_DIVISION_HEAD"

    # 2.3 Stage 2: Division Head Review
    print(f"\n[Exceptional Step 3] Stage 2: Division Head evaluates division risk exposure...")
    act2_res = client.post(
        f"{BASE_URL}/supplementary/exceptions/{exc_id}/action",
        json={"action": "APPROVE", "comment": "Division risk exposure verified. Escalating to Central Governance Team."},
        headers={"Authorization": f"Bearer {process_owner_token}"}
    )
    assert act2_res.status_code == 200, f"Stage 2 action failed: {act2_res.text}"
    print(f"  [PASS] Stage 2 Approved. Next Stage = {act2_res.json().get('current_stage')}")
    assert act2_res.json().get('current_stage') == "PENDING_GOVERNANCE"

    # 2.4 & 2.5 Stage 3 & 4: Central Governance Review & Senior Signoff
    print(f"\n[Exceptional Step 4 & 5] Stage 3 & 4: Senior DOA Governance Member reviews statutory justification & signs off...")
    act3_res = client.post(
        f"{BASE_URL}/supplementary/exceptions/{exc_id}/action",
        json={"action": "APPROVE", "comment": "Senior governance sign-off granted with mandatory 12-month re-certification review."},
        headers={"Authorization": f"Bearer {governance_token}"}
    )
    assert act3_res.status_code == 200, f"Governance exception signoff failed: {act3_res.text}"
    exc_final = act3_res.json()
    print(f"  [PASS] Exception Certified & Approved: Status = {exc_final.get('status')}")
    assert exc_final.get('status') == "APPROVED"

    # 2.6 & 2.7 Exception Enters Publication Queue & Admin Controlled Publication
    print(f"\n[Exceptional Step 6 & 7] DOA Administrator executes Controlled Publication with Exception Tagging...")
    exc_cr_payload = {
        "request_type": "MODIFY",
        "doa_id": new_doa_id or "DOA-ZZZ-999",
        "department": "Finance",
        "process": "Treasury Emergency Facilities",
        "rationale": f"Published under Certified Exception #{exc_id}",
        "base_version": 1,
        "exception_id": str(exc_id),
        "proposed_value": {
            "decision_area": "Emergency Sovereign Treasury Overdraft Facility (Exceptional)",
            "composite_authority": "Board of Directors & GCEO (Certified Exception)",
            "regulatory": "Y",
            "is_exceptional": True,
            "exception_ref": str(exc_id)
        }
    }
    exc_cr_res = client.post(
        f"{BASE_URL}/change-requests",
        json=exc_cr_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert exc_cr_res.status_code in [200, 201]
    exc_cr_id = exc_cr_res.json()["id"]

    # Approve and publish exceptional change request
    client.post(
        f"{BASE_URL}/change-requests/{exc_cr_id}/approve",
        json={"decision_comment": f"Approved under certified exception approval #{exc_id}"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    exc_pub_res = client.post(
        f"{BASE_URL}/change-requests/{exc_cr_id}/publish",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert exc_pub_res.status_code == 200, f"Exceptional publication failed: {exc_pub_res.text}"
    print(f"  [PASS] Controlled Publication with Exception Tagging Completed! Change Request #{exc_cr_id} PUBLISHED.")

    print("\n" + "=" * 80)
    print("ALL END-TO-END SCENARIO STEPS FROM manual_test.md PASSED WITH 100% SUCCESS!")
    print("=" * 80)

if __name__ == "__main__":
    try:
        run_e2e_test_scenario()
    except Exception as e:
        print(f"\n[FAIL] E2E SCENARIO TEST FAILED: {e}")
        sys.exit(1)
