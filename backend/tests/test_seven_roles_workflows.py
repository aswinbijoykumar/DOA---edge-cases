import pytest
from app.database.models import User
from app.core.security import get_password_hash

def test_seven_role_end_to_end_workflows(client, setup_db):
    from tests.conftest import TestingSessionLocal
    db = TestingSessionLocal()
    
    # Ensure all 7 persona users exist in test database
    personas = [
        {"email": "test.requestor@doa.local", "persona_type": "FRONTEND_USER", "full_name": "Test Requestor", "department": "Commercial Operations"},
        {"email": "test.process.owner@doa.local", "persona_type": "PROCESS_OWNER", "full_name": "Test Process Owner", "department": "Supply Chain Operations"},
        {"email": "test.dept.owner@doa.local", "persona_type": "DEPT_OWNER", "full_name": "Test Dept Owner", "department": "Finance"},
        {"email": "test.authority.owner@doa.local", "persona_type": "AUTHORITY_OWNER", "full_name": "Test Authority Owner", "department": "Legal"},
        {"email": "test.reviewer@doa.local", "persona_type": "REVIEWER", "full_name": "Test Reviewer", "department": "Risk"},
        {"email": "test.approver@doa.local", "persona_type": "APPROVER", "full_name": "Test Approver", "department": "Executive Management"},
        {"email": "test.audit@doa.local", "persona_type": "AUDIT_READONLY", "full_name": "Test Audit", "department": "Internal Audit"},
    ]

    tokens = {}
    for p in personas:
        user = db.query(User).filter(User.email == p["email"]).first()
        if not user:
            user = User(
                email=p["email"],
                hashed_password=get_password_hash("Pass@123"),
                full_name=p["full_name"],
                role="NORMAL_USER",
                persona_type=p["persona_type"],
                department=p["department"],
                is_active=True
            )
            db.add(user)
    db.commit()
    db.close()

    # Log in and get tokens for all 7 personas
    for p in personas:
        res = client.post("/api/auth/login", json={"email": p["email"], "password": "Pass@123"})
        assert res.status_code == 200
        tokens[p["persona_type"]] = res.json()["access_token"]

    # 1. FRONTEND_USER (Requestor) creates a proposal
    req_token = tokens["FRONTEND_USER"]
    req_dash = client.get("/api/requestor/dashboard", headers={"Authorization": f"Bearer {req_token}"})
    assert req_dash.status_code == 200
    assert req_dash.json()["persona"] == "FRONTEND_USER"

    # Fetch current version of DOA-TEST-101
    target_doa_res = client.get("/api/doa/DOA-TEST-101", headers={"Authorization": f"Bearer {req_token}"})
    assert target_doa_res.status_code == 200
    live_base_ver = target_doa_res.json()["current_version"]

    proposal_payload = {
        "request_type": "MODIFY",
        "doa_id": "DOA-TEST-101",
        "department": "Finance",
        "process": "Procure-to-Pay (P2P)",
        "rationale": "Workflow cycle test proposal",
        "base_version": live_base_ver,
        "proposed_value": {
            "decision_area": "End-to-end multi-role verified delegation rule",
            "regulatory": "Y"
        }
    }
    create_res = client.post("/api/requestor/proposals", json=proposal_payload, headers={"Authorization": f"Bearer {req_token}"})
    assert create_res.status_code == 200
    cr_id = create_res.json()["id"]

    # 2. PROCESS_OWNER reviews operational queue and endorses process impact
    po_token = tokens["PROCESS_OWNER"]
    po_dash = client.get("/api/process-owner/dashboard", headers={"Authorization": f"Bearer {po_token}"})
    assert po_dash.status_code == 200
    po_queue = client.get("/api/process-owner/queue", headers={"Authorization": f"Bearer {po_token}"})
    assert po_queue.status_code == 200

    endorse_res = client.post(
        f"/api/process-owner/requests/{cr_id}/endorse",
        json={"operational_impact": "SOP verified, zero operational latency impact."},
        headers={"Authorization": f"Bearer {po_token}"}
    )
    assert endorse_res.status_code == 200
    assert endorse_res.json()["status"] == "PENDING_DEPT_OWNER"
    assert "SOP verified" in endorse_res.json()["operational_impact"]

    # 3. DEPT_OWNER reviews department queue and signs off
    do_token = tokens["DEPT_OWNER"]
    do_dash = client.get("/api/dept-owner/dashboard", headers={"Authorization": f"Bearer {do_token}"})
    assert do_dash.status_code == 200
    do_queue = client.get("/api/dept-owner/queue", headers={"Authorization": f"Bearer {do_token}"})
    assert do_queue.status_code == 200
    signoff_res = client.post(
        f"/api/dept-owner/requests/{cr_id}/signoff",
        json={"comment": "Finance departmental threshold alignment confirmed."},
        headers={"Authorization": f"Bearer {do_token}"}
    )
    assert signoff_res.status_code == 200
    assert signoff_res.json()["status"] == "PENDING_2LOD_REVIEW"
    assert "Dept Signoff" in signoff_res.json()["decision_comment"]

    # 4. AUTHORITY_OWNER inspects authority matrix and verifies charter mandate
    ao_token = tokens["AUTHORITY_OWNER"]
    ao_dash = client.get("/api/authority-owner/dashboard", headers={"Authorization": f"Bearer {ao_token}"})
    assert ao_dash.status_code == 200
    ao_matrix = client.get("/api/authority-owner/matrix", headers={"Authorization": f"Bearer {ao_token}"})
    assert ao_matrix.status_code == 200
    verify_res = client.post(
        f"/api/authority-owner/requests/{cr_id}/verify-mandate",
        json={"comment": "Mandate aligns with Schedule B of Board Charter."},
        headers={"Authorization": f"Bearer {ao_token}"}
    )
    assert verify_res.status_code == 200
    assert "Charter Mandate Verified" in verify_res.json()["decision_comment"]

    # 5. REVIEWER (2LoD Risk) reviews technical queue, checks diff, and recommends
    rev_token = tokens["REVIEWER"]
    rev_dash = client.get("/api/reviewer/dashboard", headers={"Authorization": f"Bearer {rev_token}"})
    assert rev_dash.status_code == 200
    rev_queue = client.get("/api/reviewer/queue", headers={"Authorization": f"Bearer {rev_token}"})
    assert rev_queue.status_code == 200
    rev_diff = client.get(f"/api/reviewer/diff/{cr_id}", headers={"Authorization": f"Bearer {rev_token}"})
    assert rev_diff.status_code == 200
    assert rev_diff.json()["is_stale"] is False
    rec_res = client.post(
        f"/api/reviewer/requests/{cr_id}/recommend",
        json={"comment": "2LoD technical risk assessment completed without objection."},
        headers={"Authorization": f"Bearer {rev_token}"}
    )
    assert rec_res.status_code == 200
    assert rec_res.json()["status"] == "UNDER_REVIEW"
    assert "2LoD Risk Endorsed" in rec_res.json()["decision_comment"]

    # 6. APPROVER (Executive) reviews inbox and issues binding APPROVE decision
    app_token = tokens["APPROVER"]
    app_dash = client.get("/api/approver/dashboard", headers={"Authorization": f"Bearer {app_token}"})
    assert app_dash.status_code == 200
    app_inbox = client.get("/api/approver/inbox", headers={"Authorization": f"Bearer {app_token}"})
    assert app_inbox.status_code == 200
    dec_res = client.post(
        f"/api/approver/requests/{cr_id}/decision?action=APPROVE",
        json={"comment": "Executive decision: Formal approval granted."},
        headers={"Authorization": f"Bearer {app_token}"}
    )
    assert dec_res.status_code == 200
    assert dec_res.json()["status"] == "APPROVED"

    # 7. AUDIT_READONLY (Assurance) verifies dashboard metrics, version history, and audit ledger
    aud_token = tokens["AUDIT_READONLY"]
    aud_dash = client.get("/api/audit-readonly/dashboard", headers={"Authorization": f"Bearer {aud_token}"})
    assert aud_dash.status_code == 200
    assert aud_dash.json()["assurance_metrics"]["Total Master DOAs"] >= 1

    aud_vers = client.get("/api/audit-readonly/versions/DOA-TEST-101", headers={"Authorization": f"Bearer {aud_token}"})
    assert aud_vers.status_code == 200
    assert "version_history" in aud_vers.json()

    aud_ledger = client.get("/api/audit-readonly/ledger", headers={"Authorization": f"Bearer {aud_token}"})
    assert aud_ledger.status_code == 200
    assert len(aud_ledger.json()) > 0

    # 8. MANAGEMENT REPORTS (Functionality 7) - Verify generation for all 7 User Roles
    # Requestor reports
    r_life = client.get("/api/requestor/reports/lifecycle", headers={"Authorization": f"Bearer {req_token}"})
    assert r_life.status_code == 200
    assert r_life.json()["report_id"] == "RPT-USR-01"
    assert "data" in r_life.json()

    r_limits = client.get("/api/requestor/reports/operational-limits", headers={"Authorization": f"Bearer {req_token}"})
    assert r_limits.status_code == 200
    assert r_limits.json()["report_id"] == "RPT-USR-02"

    # Process Owner reports
    po_align = client.get("/api/process-owner/reports/operational-alignment", headers={"Authorization": f"Bearer {po_token}"})
    assert po_align.status_code == 200
    assert po_align.json()["report_id"] == "RPT-PO-01"

    po_queue = client.get("/api/process-owner/reports/impact-queue", headers={"Authorization": f"Bearer {po_token}"})
    assert po_queue.status_code == 200
    assert po_queue.json()["report_id"] == "RPT-PO-02"

    # Dept Owner reports
    do_limits = client.get("/api/dept-owner/reports/signing-limits", headers={"Authorization": f"Bearer {do_token}"})
    assert do_limits.status_code == 200
    assert do_limits.json()["report_id"] == "RPT-DO-01"

    do_hist = client.get("/api/dept-owner/reports/change-history", headers={"Authorization": f"Bearer {do_token}"})
    assert do_hist.status_code == 200
    assert do_hist.json()["report_id"] == "RPT-DO-02"

    # Authority Owner reports
    ao_charter = client.get("/api/authority-owner/reports/charter-mandates", headers={"Authorization": f"Bearer {ao_token}"})
    assert ao_charter.status_code == 200
    assert ao_charter.json()["report_id"] == "RPT-AO-01"

    ao_flows = client.get("/api/authority-owner/reports/chain-flows", headers={"Authorization": f"Bearer {ao_token}"})
    assert ao_flows.status_code == 200
    assert ao_flows.json()["report_id"] == "RPT-AO-02"

    # Reviewer reports
    rev_reg = client.get("/api/reviewer/reports/regulatory-register", headers={"Authorization": f"Bearer {rev_token}"})
    assert rev_reg.status_code == 200
    assert rev_reg.json()["report_id"] == "RPT-REV-01"

    rev_diff = client.get("/api/reviewer/reports/technical-diffs", headers={"Authorization": f"Bearer {rev_token}"})
    assert rev_diff.status_code == 200
    assert rev_diff.json()["report_id"] == "RPT-REV-02"

    # Approver reports
    app_port = client.get("/api/approver/reports/executive-portfolio", headers={"Authorization": f"Bearer {app_token}"})
    assert app_port.status_code == 200
    assert app_port.json()["report_id"] == "RPT-APP-01"

    app_dec = client.get("/api/approver/reports/binding-decisions", headers={"Authorization": f"Bearer {app_token}"})
    assert app_dec.status_code == 200
    assert app_dec.json()["report_id"] == "RPT-APP-02"

    # Audit Read-Only reports
    aud_dos = client.get("/api/audit-readonly/reports/version-dossier", headers={"Authorization": f"Bearer {aud_token}"})
    assert aud_dos.status_code == 200
    assert aud_dos.json()["report_id"] == "RPT-AUD-01"

    aud_ledg = client.get("/api/audit-readonly/reports/immutable-ledger", headers={"Authorization": f"Bearer {aud_token}"})
    assert aud_ledg.status_code == 200
    assert aud_ledg.json()["report_id"] == "RPT-AUD-02"

    aud_sod = client.get("/api/audit-readonly/reports/sod-matrix", headers={"Authorization": f"Bearer {aud_token}"})
    assert aud_sod.status_code == 200
    assert aud_sod.json()["report_id"] == "RPT-AUD-03"

