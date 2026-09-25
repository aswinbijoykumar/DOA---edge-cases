def test_list_doa_records(client, user_token):
    res = client.get("/api/doa", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert data[0]["id"] == "DOA-TEST-101"

def test_get_single_doa(client, user_token):
    res = client.get("/api/doa/DOA-TEST-101", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["decision_area"] == "Approve increase or reduction of share capital"
    assert data["current_version"] == 1

def test_doa_versions(client, user_token):
    res = client.get("/api/doa/DOA-TEST-101/versions", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["version_number"] == 1
    assert data[0]["status"] == "PUBLISHED"

def test_filter_doa_by_function(client, user_token):
    res = client.get("/api/doa?parent_function=Finance", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200
    data = res.json()
    assert all("Finance" in r["parent_function"] for r in data)
