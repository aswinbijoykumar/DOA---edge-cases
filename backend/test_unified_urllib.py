import urllib.request
import urllib.error
import json

BASE_URL = "http://localhost:8000/api"

def req(url, data=None, headers=None, method="GET"):
    if headers is None:
        headers = {}
    body = json.dumps(data).encode("utf-8") if data is not None else None
    if body:
        headers["Content-Type"] = "application/json"
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            return e.code, json.loads(content)
        except:
            return e.code, {"detail": content}

def login(email, password):
    status, data = req(f"{BASE_URL}/auth/login", {"email": email, "password": password}, method="POST")
    assert status == 200, f"Login failed: {data}"
    return data["access_token"], data

def run_tests():
    print("Logging in users...")
    req_token, req_user = login("user@doa.local", "User@123")
    print("Requestor logged in:", req_user["email"], "can_request:", req_user.get("can_request"), "can_review:", req_user.get("can_review"))

    rev_token, rev_user = login("reviewer@doa.local", "User@123")
    print("Reviewer logged in:", rev_user["email"], "can_request:", rev_user.get("can_request"), "can_review:", rev_user.get("can_review"))

    dual_token, dual_user = login("dual.user@doa.local", "User@123")
    print("Dual user logged in:", dual_user["email"], "can_request:", dual_user.get("can_request"), "can_review:", dual_user.get("can_review"))

    req_h = {"Authorization": f"Bearer {req_token}"}
    rev_h = {"Authorization": f"Bearer {rev_token}"}
    dual_h = {"Authorization": f"Bearer {dual_token}"}

    # SCENARIO 1: Requestor Lifecycle
    print("\n--- SCENARIO 1: Requestor Flow ---")
    draft_payload = {
        "request_type": "MODIFY",
        "doa_id": "1",
        "department": "Commercial Operations",
        "process": "Procure-to-Pay (P2P)",
        "rationale": "Draft test limit adjustment",
        "currency": "USD",
        "current_limit": "50,000",
        "proposed_limit": "150,000",
        "priority": "HIGH",
        "proposed_value": {"decision_area": "Commercial vendor limit"}
    }
    st, draft_cr = req(f"{BASE_URL}/change-requests/draft", draft_payload, headers=req_h, method="POST")
    assert st == 200 and draft_cr["status"] == "DRAFT", f"Save draft failed: {st} {draft_cr}"
    cr_id = draft_cr["id"]
    print("Saved Draft:", cr_id)

    st, _ = req(f"{BASE_URL}/change-requests/{cr_id}", {"rationale": "Updated draft rationale"}, headers=req_h, method="PUT")
    assert st == 200, f"Edit draft failed: {st}"
    print("Edited Draft:", cr_id)

    st, sub_cr = req(f"{BASE_URL}/change-requests/{cr_id}/submit", headers=req_h, method="POST")
    assert st == 200 and sub_cr["status"] == "SUBMITTED", f"Submit draft failed: {st} {sub_cr}"
    print("Submitted Request:", cr_id, "(status: SUBMITTED)")

    # SCENARIO 2: Reviewer Flow
    print("\n--- SCENARIO 2: Reviewer Flow ---")
    st, q = req(f"{BASE_URL}/change-requests/review-queue", headers=rev_h)
    assert st == 200 and any(item["id"] == cr_id for item in q), "CR not in queue"
    print(f"Found {cr_id} in Reviewer Queue")

    st, r1 = req(f"{BASE_URL}/change-requests/{cr_id}/start-review", headers=rev_h, method="POST")
    assert st == 200 and r1["status"] == "UNDER_REVIEW", f"Start review failed: {st} {r1}"
    print(f"Review started on {cr_id} (UNDER_REVIEW)")

    st, r2 = req(f"{BASE_URL}/change-requests/{cr_id}/clarification", {"message": "Please provide supporting audit memo"}, headers=rev_h, method="POST")
    assert st == 200 and r2["status"] == "CLARIFICATION_REQUIRED", f"Clarification failed: {st} {r2}"
    print(f"Clarification requested on {cr_id} (CLARIFICATION_REQUIRED)")

    st, r3 = req(f"{BASE_URL}/change-requests/{cr_id}/respond-clarification", {"message": "Audit memo attached"}, headers=req_h, method="POST")
    assert st == 200 and r3["status"] == "UNDER_REVIEW", f"Clarification response failed: {st} {r3}"
    print(f"Clarification answered on {cr_id} (UNDER_REVIEW)")

    st, r4 = req(f"{BASE_URL}/change-requests/{cr_id}/approve", {"comment": "Approved by Reviewer"}, headers=rev_h, method="POST")
    assert st == 200 and r4["status"] == "APPROVED", f"Approve failed: {st} {r4}"
    print(f"Reviewer approved {cr_id} (APPROVED)")

    # SCENARIO 3: Dual User & SoD
    print("\n--- SCENARIO 3: Dual-Role & Segregation of Duties ---")
    dual_payload = {
        "request_type": "ADD",
        "department": "Finance & Supply Chain Governance",
        "process": "Treasury & FX Operations",
        "rationale": "Dual role test",
        "proposed_value": {"decision_area": "Treasury limit"}
    }
    st, dual_cr = req(f"{BASE_URL}/change-requests", dual_payload, headers=dual_h, method="POST")
    assert st == 200, f"Dual submit failed: {st} {dual_cr}"
    dual_cr_id = dual_cr["id"]
    print("Dual user created request:", dual_cr_id)

    st, dual_q = req(f"{BASE_URL}/change-requests/review-queue", headers=dual_h)
    assert st == 200 and not any(item["id"] == dual_cr_id for item in dual_q), "SoD violation: own request in review queue"
    print(f"SoD Queue check: {dual_cr_id} correctly excluded from own queue")

    # SCENARIO 4: Security Tests
    print("\n--- SCENARIO 4: Security Tests ---")
    st, err = req(f"{BASE_URL}/change-requests/{dual_cr_id}/approve", {"comment": "Self approval attempt"}, headers=dual_h, method="POST")
    assert st == 403, f"Expected 403, got {st}"
    print(f"Self-approval blocked with 403 Forbidden: {err.get('detail')}")

    st, err2 = req(f"{BASE_URL}/change-requests/{dual_cr_id}/reject", {"comment": "Self reject attempt"}, headers=dual_h, method="POST")
    assert st == 403, f"Expected 403, got {st}"
    print(f"Self-rejection blocked with 403 Forbidden: {err2.get('detail')}")

    st, r5 = req(f"{BASE_URL}/change-requests/{dual_cr_id}/approve", {"comment": "Approved by independent reviewer Sophia"}, headers=rev_h, method="POST")
    assert st == 200 and r5["status"] == "APPROVED", f"Independent approval failed: {st}"
    print(f"Independent reviewer successfully approved {dual_cr_id}")

    print("\n==================================================")
    print("SUCCESS: ALL WORKFLOWS & SEGREGATION-OF-DUTIES CHECKS VERIFIED!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
