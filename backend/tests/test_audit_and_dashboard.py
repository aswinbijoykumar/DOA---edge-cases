def test_audit_logs_recorded(client, admin_token, user_token):
    # Normal user submits a request to generate audit log
    client.post("/api/change-requests", json={
        "request_type": "MODIFY",
        "doa_id": "DOA-TEST-101",
        "rationale": "Audit test",
        "base_version": 1,
        "proposed_value": {"comments": "Audit trigger"}
    }, headers={"Authorization": f"Bearer {user_token}"})

    # Retrieve audit trail as admin
    res = client.get("/api/audit", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    logs = res.json()
    assert len(logs) > 0

    actions = [log["action"] for log in logs]
    assert "SUBMIT_CHANGE" in actions

    # Normal user accessing audit trail -> 403 Forbidden
    u_res = client.get("/api/audit", headers={"Authorization": f"Bearer {user_token}"})
    assert u_res.status_code == 403


def test_dashboard_summary(client, user_token):
    res = client.get("/api/dashboard/summary", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200
    summary = res.json()
    assert "total_published" in summary
    assert "pending_requests" in summary
    assert summary["total_published"] >= 1
