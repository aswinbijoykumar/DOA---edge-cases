import requests
import json

BASE_URL = "http://localhost:8000/api"

def login(email, password):
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if res.status_code != 200:
        raise Exception(f"Login failed for {email}: {res.status_code} {res.text}")
    data = res.json()
    return data["access_token"], data

def test_workflow():
    print("==================================================")
    print("STARTING COMPLETE END-TO-END WORKFLOW & SoD TESTS")
    print("==================================================")

    # 1. Login as Requestor
    req_token, req_user = login("user@doa.local", "User@123")
    print(f"[OK] Logged in Requestor: {req_user['email']} (can_request={req_user.get('can_request')}, can_review={req_user.get('can_review')})")
    req_headers = {"Authorization": f"Bearer {req_token}", "Content-Type": "application/json"}

    # 2. Login as Reviewer
    rev_token, rev_user = login("reviewer@doa.local", "User@123")
    print(f"[OK] Logged in Reviewer: {rev_user['email']} (can_request={rev_user.get('can_request')}, can_review={rev_user.get('can_review')})")
    rev_headers = {"Authorization": f"Bearer {rev_token}", "Content-Type": "application/json"}

    # 3. Login as Dual Role User
    dual_token, dual_user = login("dual.user@doa.local", "User@123")
    print(f"[OK] Logged in Dual User: {dual_user['email']} (can_request={dual_user.get('can_request')}, can_review={dual_user.get('can_review')})")
    dual_headers = {"Authorization": f"Bearer {dual_token}", "Content-Type": "application/json"}

    # -----------------------------------------------------------------
    # SCENARIO 1: Requestor Lifecycle (Draft -> Submit -> Clarification -> Final Status)
    # -----------------------------------------------------------------
    print("\n--- SCENARIO 1: Requestor Flow ---")
    draft_payload = {
        "request_type": "MODIFY",
        "doa_id": "1",
        "department": "Commercial Operations",
        "process": "Procure-to-Pay (P2P)",
        "rationale": "Raising operational signing limit for supply chain contracts",
        "currency": "USD",
        "current_limit": "50,000",
        "proposed_limit": "150,000",
        "effective_date": "2026-05-01",
        "priority": "HIGH",
        "due_date": "2026-05-15",
        "risk_impact": "Operational efficiency improvement, low financial default risk",
        "proposed_value": {
            "decision_area": "Authorize commercial vendor service orders up to USD 150,000",
            "department": "Commercial Operations"
        }
    }
    # Save Draft
    res = requests.post(f"{BASE_URL}/change-requests/draft", headers=req_headers, json=draft_payload)
    assert res.status_code == 200, f"Save draft failed: {res.text}"
    draft_cr = res.json()
    cr_id = draft_cr["id"]
    assert draft_cr["status"] == "DRAFT"
    print(f"[OK] Saved Draft: {cr_id} with status {draft_cr['status']}")

    # Edit Draft
    edit_payload = {"rationale": "Updated rationale: Raising operational signing limit for high-volume vendors"}
    res = requests.put(f"{BASE_URL}/change-requests/{cr_id}", headers=req_headers, json=edit_payload)
    assert res.status_code == 200, f"Edit draft failed: {res.text}"
    print(f"[OK] Edited Draft: {cr_id}")

    # Submit Draft
    res = requests.post(f"{BASE_URL}/change-requests/{cr_id}/submit", headers=req_headers)
    assert res.status_code == 200, f"Submit draft failed: {res.text}"
    submitted_cr = res.json()
    assert submitted_cr["status"] == "SUBMITTED"
    print(f"[OK] Submitted Draft: {cr_id} now status {submitted_cr['status']}")

    # -----------------------------------------------------------------
    # SCENARIO 2: Reviewer Flow & Clarification
    # -----------------------------------------------------------------
    print("\n--- SCENARIO 2: Reviewer Flow ---")
    # Reviewer inspects queue
    res = requests.get(f"{BASE_URL}/change-requests/review-queue", headers=rev_headers)
    assert res.status_code == 200
    queue = res.json()
    assert any(item["id"] == cr_id for item in queue), "Submitted CR should appear in Reviewer Queue"
    print(f"[OK] Request {cr_id} verified in Reviewer Queue")

    # Start review
    res = requests.post(f"{BASE_URL}/change-requests/{cr_id}/start-review", headers=rev_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "UNDER_REVIEW"
    print(f"[OK] Reviewer started review on {cr_id} (status: UNDER_REVIEW)")

    # Request Clarification
    clar_inquiry = {"message": "Please confirm if VP of Commercial has reviewed the vendor SLAs."}
    res = requests.post(f"{BASE_URL}/change-requests/{cr_id}/clarification", headers=rev_headers, json=clar_inquiry)
    assert res.status_code == 200
    assert res.json()["status"] == "CLARIFICATION_REQUIRED"
    print(f"[OK] Reviewer requested clarification on {cr_id} (status: CLARIFICATION_REQUIRED)")

    # Requestor responds to clarification
    clar_response = {"message": "Confirmed. VP Commercial signed off on vendor SLA schedule A."}
    res = requests.post(f"{BASE_URL}/change-requests/{cr_id}/respond-clarification", headers=req_headers, json=clar_response)
    assert res.status_code == 200
    assert res.json()["status"] == "UNDER_REVIEW"
    print(f"[OK] Requestor responded to clarification; {cr_id} returned to UNDER_REVIEW")

    # Reviewer approves request
    decision = {"comment": "All criteria met, SLA sign-off verified."}
    res = requests.post(f"{BASE_URL}/change-requests/{cr_id}/approve", headers=rev_headers, json=decision)
    assert res.status_code == 200
    assert res.json()["status"] == "APPROVED"
    print(f"[OK] Reviewer approved request {cr_id} (status: APPROVED)")

    # -----------------------------------------------------------------
    # SCENARIO 3: Dual-Role User & Segregation of Duties (SoD)
    # -----------------------------------------------------------------
    print("\n--- SCENARIO 3: Dual-Role & Segregation-of-Duties (SoD) ---")
    # Dual user creates their own request
    dual_payload = {
        "request_type": "ADD",
        "department": "Finance & Supply Chain Governance",
        "process": "Treasury & FX Operations",
        "rationale": "Dual user test proposal",
        "currency": "USD",
        "current_limit": "0",
        "proposed_limit": "500,000",
        "priority": "MEDIUM",
        "proposed_value": {
            "decision_area": "Execute FX spot trades up to USD 500,000",
            "department": "Finance & Supply Chain Governance"
        }
    }
    res = requests.post(f"{BASE_URL}/change-requests", headers=dual_headers, json=dual_payload)
    assert res.status_code == 200
    dual_cr = res.json()
    dual_cr_id = dual_cr["id"]
    print(f"[OK] Dual-role user submitted their own request: {dual_cr_id}")

    # Check that dual user's own request does NOT show up in their reviewer queue
    res = requests.get(f"{BASE_URL}/change-requests/review-queue", headers=dual_headers)
    assert res.status_code == 200
    dual_queue = res.json()
    assert not any(item["id"] == dual_cr_id for item in dual_queue), "SoD Violation: Self-submitted request must not appear in own review queue"
    print(f"[OK] SoD Queue check passed: {dual_cr_id} excluded from author's reviewer queue")

    # -----------------------------------------------------------------
    # SCENARIO 4: Security Enforcement - Backend Rejection of Self-Approval & Unauthorized Actions
    # -----------------------------------------------------------------
    print("\n--- SCENARIO 4: Security Tests ---")
    
    # Attempt 1: Dual user attempts to self-approve their own request
    res = requests.post(f"{BASE_URL}/change-requests/{dual_cr_id}/approve", headers=dual_headers, json={"comment": "Self approval attempt"})
    assert res.status_code == 403, f"Expected 403 for self-approval, got {res.status_code}"
    print(f"[OK] Prevented Self-Approval on {dual_cr_id} (HTTP 403 returned)")

    # Attempt 2: Dual user attempts to self-reject their own request as a reviewer
    res = requests.post(f"{BASE_URL}/change-requests/{dual_cr_id}/reject", headers=dual_headers, json={"comment": "Self rejection attempt"})
    assert res.status_code == 403, f"Expected 403 for self-rejection, got {res.status_code}"
    print(f"[OK] Prevented Self-Rejection on {dual_cr_id} (HTTP 403 returned)")

    # Attempt 3: Unauthorized user attempts to edit another user's request
    res = requests.put(f"{BASE_URL}/change-requests/{dual_cr_id}", headers=req_headers, json={"rationale": "Hacked rationale"})
    assert res.status_code in [400, 403], f"Expected 403 for unauthorized edit, got {res.status_code}"
    print(f"[OK] Prevented Unauthorized Request Modification (HTTP {res.status_code} returned)")

    # Attempt 4: Clean up / Another reviewer can approve dual user's request
    res = requests.post(f"{BASE_URL}/change-requests/{dual_cr_id}/approve", headers=rev_headers, json={"comment": "Independent approval by Sophia Zhang"})
    assert res.status_code == 200
    print(f"[OK] Independent reviewer successfully approved {dual_cr_id}")

    print("\n==================================================")
    print("ALL 4 SCENARIOS & SECURITY CHECKS PASSED PERFECTLY!")
    print("==================================================")

if __name__ == "__main__":
    test_workflow()
