def test_create_and_diff_change_request(client, user_token):
    # 1. User creates a MODIFY change request
    payload = {
        "request_type": "MODIFY",
        "doa_id": "DOA-TEST-101",
        "department": "Finance",
        "process": "Capital Management",
        "rationale": "Updated threshold from 50k to 100k",
        "base_version": 1,
        "proposed_value": {
            "decision_area": "Approve increase or reduction of share capital up to 100k",
            "composite_authority": "Shareholders (A) -> BoD (A)",
            "regulatory": "Y"
        }
    }
    res = client.post("/api/change-requests", json=payload, headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200
    cr = res.json()
    cr_id = cr["id"]
    assert cr["status"] == "SUBMITTED"
    assert cr["doa_id"] == "DOA-TEST-101"

    # 2. Inspect Diff engine
    diff_res = client.get(f"/api/change-requests/{cr_id}/diff", headers={"Authorization": f"Bearer {user_token}"})
    assert diff_res.status_code == 200
    diff_data = diff_res.json()
    assert diff_data["is_stale"] is False
    assert diff_data["base_version"] == 1
    
    # Verify field changes in diffs
    diff_map = {d["field"]: d for d in diff_data["diffs"]}
    assert diff_map["decision_area"]["change_type"] == "MODIFIED"
    assert diff_map["regulatory"]["change_type"] == "MODIFIED"
    assert diff_map["composite_authority"]["change_type"] == "MODIFIED"

def test_rbac_approvals_and_conflict(client, user_token, admin_token):
    # Create request
    payload = {
        "request_type": "MODIFY",
        "doa_id": "DOA-TEST-101",
        "rationale": "Governance review",
        "base_version": 1,
        "proposed_value": {
            "comments": "Audited and endorsed"
        }
    }
    res = client.post("/api/change-requests", json=payload, headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200
    cr_id = res.json()["id"]

    # Normal user trying to approve -> 403 Forbidden
    app_res = client.post(f"/api/change-requests/{cr_id}/approve", json={"comment": "Hack"}, headers={"Authorization": f"Bearer {user_token}"})
    assert app_res.status_code == 403

    # Admin approves -> 200 OK
    admin_app_res = client.post(f"/api/change-requests/{cr_id}/approve", json={"comment": "Approved by BoD"}, headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_app_res.status_code == 200
    assert admin_app_res.json()["status"] == "APPROVED"

    # Normal user trying to publish -> 403 Forbidden
    pub_res = client.post(f"/api/change-requests/{cr_id}/publish", headers={"Authorization": f"Bearer {user_token}"})
    assert pub_res.status_code == 403

    # Admin publishes -> 200 OK
    admin_pub_res = client.post(f"/api/change-requests/{cr_id}/publish", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_pub_res.status_code == 200
    assert admin_pub_res.json()["status"] == "PUBLISHED"

    # Verify DOA record is now Version 2
    doa_res = client.get("/api/doa/DOA-TEST-101", headers={"Authorization": f"Bearer {user_token}"})
    assert doa_res.status_code == 200
    assert doa_res.json()["current_version"] == 2
    assert doa_res.json()["comments"] == "Audited and endorsed"

    # Verify Version history has 2 versions (v2 published, v1 historical)
    v_res = client.get("/api/doa/DOA-TEST-101/versions", headers={"Authorization": f"Bearer {user_token}"})
    assert v_res.status_code == 200
    versions = v_res.json()
    assert len(versions) == 2
    assert versions[0]["version_number"] == 2
    assert versions[0]["status"] == "PUBLISHED"
    assert versions[1]["version_number"] == 1
    assert versions[1]["status"] == "HISTORICAL"

    # Concurrency / Stale conflict test:
    # Another change request created against stale base_version=1 cannot be published
    stale_payload = {
        "request_type": "MODIFY",
        "doa_id": "DOA-TEST-101",
        "rationale": "Late submitter",
        "base_version": 1, # Record is now v2!
        "proposed_value": {
            "comments": "Conflict incoming"
        }
    }
    stale_cr_res = client.post("/api/change-requests", json=stale_payload, headers={"Authorization": f"Bearer {user_token}"})
    stale_cr_id = stale_cr_res.json()["id"]
    
    # Admin approves stale CR
    client.post(f"/api/change-requests/{stale_cr_id}/approve", json={"comment": "Accidentally approved"}, headers={"Authorization": f"Bearer {admin_token}"})
    
    # Admin publishing must return 409 CONFLICT due to stale version!
    conflict_res = client.post(f"/api/change-requests/{stale_cr_id}/publish", headers={"Authorization": f"Bearer {admin_token}"})
    assert conflict_res.status_code == 409
    assert "Conflict" in conflict_res.json()["detail"]
