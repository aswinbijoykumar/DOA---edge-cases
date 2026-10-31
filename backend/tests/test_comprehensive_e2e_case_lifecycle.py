import pytest
import json
from app.database.models import User, DOARecord, ChangeRequest, AuditLog
from app.core.security import get_password_hash

"""
Comprehensive End-to-End Automated Testing of the DOA Case Lifecycle:
1. Setup & Multi-Persona RBAC Credential Verification
2. Case Creation & Pre-Submission Validation Hard-Stop Checks
3. Formal Case Submission
4. Review, Clarification, Notifications & Tagging
5. Rejection & Status Transition Verification
6. Recheck, Diff Inspection & Resubmission
7. Multi-Tier Endorsements (Process Owner -> Dept Owner -> Reviewer -> Approver)
8. Binding Approval & RBAC Segregation Enforcement
9. Final Publication (Version Bump from v(n) to v(n+1) and Archival)
10. Immutable Audit Trail Ledger & Final Status Verification
"""

@pytest.fixture
def lifecycle_setup(client, setup_db):
    from tests.conftest import TestingSessionLocal
    db = TestingSessionLocal()
    
    users = [
        {"email": "e2e.requestor@doa.local", "role": "NORMAL_USER", "persona_type": "FRONTEND_USER", "full_name": "E2E Requestor", "department": "Finance"},
        {"email": "e2e.process_owner@doa.local", "role": "NORMAL_USER", "persona_type": "PROCESS_OWNER", "full_name": "E2E Process Lead", "department": "Operations"},
        {"email": "e2e.dept_owner@doa.local", "role": "NORMAL_USER", "persona_type": "DEPT_OWNER", "full_name": "E2E Finance Head", "department": "Finance"},
        {"email": "e2e.reviewer@doa.local", "role": "NORMAL_USER", "persona_type": "REVIEWER", "full_name": "E2E Risk Reviewer", "department": "Risk"},
        {"email": "e2e.approver@doa.local", "role": "NORMAL_USER", "persona_type": "APPROVER", "full_name": "E2E VP Approver", "department": "Executive Management"},
        {"email": "e2e.governance@doa.local", "role": "GOVERNANCE_TEAM", "persona_type": "REVIEWER", "full_name": "E2E Governance Officer", "department": "Governance"},
        {"email": "e2e.admin@doa.local", "role": "DOA_ADMINISTRATOR", "persona_type": "ADMIN", "full_name": "E2E Delegation Admin", "department": "DOA Governance"},
        {"email": "e2e.audit@doa.local", "role": "NORMAL_USER", "persona_type": "AUDIT_READONLY", "full_name": "E2E Internal Auditor", "department": "Internal Audit"},
    ]
    
    for u in users:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if not existing:
            db.add(User(
                email=u["email"],
                hashed_password=get_password_hash("Pass@123"),
                full_name=u["full_name"],
                role=u["role"],
                persona_type=u["persona_type"],
                department=u["department"],
                is_active=True
            ))
            
    # Seed a baseline DOA Record for testing modification & versioning
    test_doa = db.query(DOARecord).filter(DOARecord.id == "DOA-ZZZ-999").first()
    if not test_doa:
        rec = DOARecord(
            id="DOA-ZZZ-999",
            parent_function="Finance",
            function="Finance",
            business_line="Treasury",
            category="Liquidity Management",
            decision_area="Short-Term Commercial Paper Issuance",
            key_non_key="Key",
            status="PUBLISHED",
            current_version=1,
            shareholders="R",
            board_of_directors="A",
            gceo="E",
            c_level1="P",
            composite_authority="Board of Directors (A)",
            regulatory="Y"
        )
        db.add(rec)
        db.flush()
        from app.database.models import DOAVersion
        from app.services.version_service import record_to_dict
        db.add(DOAVersion(
            doa_id="DOA-ZZZ-999",
            version_number=1,
            status="PUBLISHED",
            snapshot=json.dumps(record_to_dict(rec)),
            created_by="initial.seed@doa.local"
        ))
    db.commit()
    db.close()

    # Authenticate and obtain JWT tokens for all personas
    tokens = {}
    for u in users:
        res = client.post("/api/auth/login", json={"email": u["email"], "password": "Pass@123"})
        assert res.status_code == 200, f"Login failed for {u['email']}"
        tokens[u["persona_type"] if u["role"] == "NORMAL_USER" else u["role"]] = res.json()["access_token"]
        
    return tokens


def test_full_comprehensive_doa_case_lifecycle(client, lifecycle_setup):
    """
    Executes the entire DOA case lifecycle from initiation to archival:
    1. Creation & Pre-submission Validation (VAL-01..12)
    2. Case Submission
    3. Review & Governance Clarification / Return with Comments
    4. First-Stage Rejection
    5. Recheck & Resubmission
    6. Multi-hop Endorsements (Process Owner -> Dept Owner -> Reviewer)
    7. Executive Approver Sign-off
    8. RBAC & Conflict Validation (Self-approval prevention)
    9. Final Controlled Publication ($v1 \rightarrow v2$ version bump)
    10. Audit Trail Verification & Notifications
    """
    toks = lifecycle_setup
    req_token = toks["FRONTEND_USER"]
    proc_token = toks["PROCESS_OWNER"]
    dept_token = toks["DEPT_OWNER"]
    rev_token = toks["REVIEWER"]
    appr_token = toks["APPROVER"]
    gov_token = toks["GOVERNANCE_TEAM"]
    admin_token = toks["DOA_ADMINISTRATOR"]
    audit_token = toks["AUDIT_READONLY"]

    headers_req = {"Authorization": f"Bearer {req_token}"}
    headers_gov = {"Authorization": f"Bearer {gov_token}"}
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    headers_appr = {"Authorization": f"Bearer {appr_token}"}
    headers_rev = {"Authorization": f"Bearer {rev_token}"}
    headers_dept = {"Authorization": f"Bearer {dept_token}"}
    headers_proc = {"Authorization": f"Bearer {proc_token}"}
    headers_audit = {"Authorization": f"Bearer {audit_token}"}

    # -------------------------------------------------------------------------
    # STEP 1: Pre-Submission Validation (VAL-01..VAL-12 checks)
    # -------------------------------------------------------------------------
    val_res = client.post(
        "/api/supplementary/validate-proposal",
        headers=headers_req,
        json={
            "decision_area": "Short-Term Commercial Paper Issuance",
            "parent_function": "Finance",
            "business_line": "Treasury",
            "proposer": "Treasury Lead",
            "reviewer": "Head of Finance",
            "final_approver": "Board of Directors",
            "rationale": "Updating borrowing ceiling from 10M to 25M BHD",
            "supporting_documentation": [{"name": "Board_Resolution_2026.pdf", "clause": "Clause 2"}],
            "entity_or_geography": "Bahrain",
            "proposed_effective_date": "2026-03-01",
            "is_financial": True,
            "monetary_amount": 25000000,
            "currency": "BHD",
            "governance_pathway": [
                {"role": "Proposer", "participant": "Treasury Lead"},
                {"role": "Reviewer", "participant": "Head of Finance"},
                {"role": "Endorser", "participant": "Audit Committee"},
                {"role": "Approver", "participant": "Board of Directors"}
            ],
            "board_committees_involved": ["Audit Committee"],
            "has_approved_exception": False
        }
    )
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["is_valid"] is True
    assert val_data["classification"] == "Board-level DOA"

    # -------------------------------------------------------------------------
    # STEP 2: Case Creation and Submission (Requestor submits MODIFY proposal)
    # -------------------------------------------------------------------------
    create_payload = {
        "request_type": "MODIFY",
        "doa_id": "DOA-ZZZ-999",
        "department": "Finance",
        "process": "Treasury Liquidity",
        "rationale": "Increase short term commercial paper borrowing ceiling to 25M BHD",
        "base_version": 1,
        "proposed_value": {
            "decision_area": "Short-Term Commercial Paper Issuance (Updated)",
            "composite_authority": "Board of Directors (A)",
            "comments": "Ceiling elevated to 25M BHD per Board Charter Resolution",
            "c_level1": "R",
            "gceo": "E",
            "board_of_directors": "A",
            "regulatory": "Y"
        }
    }
    sub_res = client.post("/api/change-requests", headers=headers_req, json=create_payload)
    assert sub_res.status_code == 200
    cr_data = sub_res.json()
    cr_id = cr_data["id"]
    assert cr_id is not None
    assert cr_data["status"] == "SUBMITTED"
    assert cr_data["request_type"] == "MODIFY"

    # -------------------------------------------------------------------------
    # STEP 3: Review, Governance Comment & Clarification Request
    # -------------------------------------------------------------------------
    # 3.1 Governance team inspects diff
    diff_res = client.get(f"/api/change-requests/{cr_id}/diff", headers=headers_gov)
    assert diff_res.status_code == 200
    diff_body = diff_res.json()
    assert diff_body["change_request_id"] == cr_id
    assert diff_body["is_stale"] is False
    assert len(diff_body["diffs"]) > 0

    # 3.2 Governance officer logs a review comment
    comm_res = client.post(
        f"/api/governance/requests/{cr_id}/comment",
        headers=headers_gov,
        json={"comment": "Please confirm if Audit Committee pre-clearance has been sought."}
    )
    assert comm_res.status_code == 200
    assert "Audit Committee pre-clearance" in comm_res.json()["decision_comment"]

    # 3.3 Governance officer tags key stakeholders (Notifications)
    tag_res = client.post(
        f"/api/governance/requests/{cr_id}/tag",
        headers=headers_gov,
        json={"stakeholders": ["Board Audit Committee", "Chief Risk Officer"]}
    )
    assert tag_res.status_code == 200
    assert "Board Audit Committee" in tag_res.json()["decision_comment"]

    # 3.4 Governance requests clarification (moves to CLARIFICATION_REQUIRED)
    clar_res = client.post(
        f"/api/governance/requests/{cr_id}/clarification",
        headers=headers_gov,
        json={"comment": "Mandatory attachment: missing signed Board Audit Committee endorsement minutes."}
    )
    assert clar_res.status_code == 200
    assert clar_res.json()["status"] == "CLARIFICATION_REQUIRED"

    # -------------------------------------------------------------------------
    # STEP 4: Reviewer/Approver Rejection
    # -------------------------------------------------------------------------
    # Reject request due to unaddressed policy gaps
    rej_res = client.post(
        f"/api/change-requests/{cr_id}/reject",
        headers=headers_appr,
        json={"comment": "Rejected pending full documentation package."}
    )
    assert rej_res.status_code == 200
    assert rej_res.json()["status"] == "REJECTED"

    # Verify that rejected request cannot be published
    pub_blocked = client.post(f"/api/change-requests/{cr_id}/publish", headers=headers_admin)
    assert pub_blocked.status_code == 400
    assert "Only APPROVED change requests can be published" in pub_blocked.json()["detail"]

    # -------------------------------------------------------------------------
    # STEP 5: Recheck, Amendment & Resubmission
    # -------------------------------------------------------------------------
    # Requester re-submits with complete documentation and revised rationale
    resubmit_payload = {
        "request_type": "MODIFY",
        "doa_id": "DOA-ZZZ-999",
        "department": "Finance",
        "process": "Treasury Liquidity",
        "rationale": "Resubmitted with signed Board Audit Committee Resolution #BAC-2026-09 attached",
        "base_version": 1,
        "proposed_value": {
            "decision_area": "Short-Term Commercial Paper Issuance (Approved Ceiling)",
            "composite_authority": "Board of Directors (A)",
            "comments": "Ceiling updated to 25M BHD with BAC pre-endorsement",
            "c_level1": "R",
            "gceo": "E",
            "board_committees": "E",
            "board_of_directors": "A",
            "regulatory": "Y"
        }
    }
    resub_res = client.post("/api/requestor/proposals", headers=headers_req, json=resubmit_payload)
    assert resub_res.status_code == 200
    active_cr_id = resub_res.json()["id"]
    assert active_cr_id != cr_id
    assert resub_res.json()["status"] == "SUBMITTED"

    # -------------------------------------------------------------------------
    # STEP 6: Multi-Tier Workflow Progression & Endorsements
    # -------------------------------------------------------------------------
    # 6.1 Process Owner endorses operational impact
    proc_endorse = client.post(
        f"/api/process-owner/requests/{active_cr_id}/endorse",
        headers=headers_proc,
        json={"operational_impact": "Operational liquidity infrastructure verified and stress-tested."}
    )
    assert proc_endorse.status_code == 200
    assert proc_endorse.json()["status"] == "PENDING_DEPT_OWNER"

    # 6.2 Department Owner provides departmental sign-off
    dept_signoff = client.post(
        f"/api/dept-owner/requests/{active_cr_id}/signoff",
        headers=headers_dept,
        json={"comment": "Departmental signoff granted per FY26 treasury plan."}
    )
    assert dept_signoff.status_code == 200
    assert dept_signoff.json()["status"] == "PENDING_2LOD_REVIEW"

    # 6.3 2LoD Reviewer performs technical review & recommends approval
    rev_rec = client.post(
        f"/api/reviewer/requests/{active_cr_id}/recommend",
        headers=headers_rev,
        json={"comment": "2LoD Risk Assessment complete: within single-counterparty exposure limits."}
    )
    assert rev_rec.status_code == 200
    assert rev_rec.json()["status"] == "UNDER_REVIEW"

    # -------------------------------------------------------------------------
    # STEP 7: RBAC Enforcement & Segregation of Duties Check
    # -------------------------------------------------------------------------
    # Normal user/Requestor cannot approve the request
    unauthorized_appr = client.post(
        f"/api/change-requests/{active_cr_id}/approve",
        headers=headers_req,
        json={"comment": "Attempted self-approval"}
    )
    assert unauthorized_appr.status_code == 403

    # -------------------------------------------------------------------------
    # STEP 8: Binding Approval by Executive Approver
    # -------------------------------------------------------------------------
    exec_appr = client.post(
        f"/api/approver/requests/{active_cr_id}/decision?action=APPROVE",
        headers=headers_appr,
        json={"comment": "Executive approval confirmed on behalf of Board Executive Committee."}
    )
    assert exec_appr.status_code == 200
    assert exec_appr.json()["status"] == "APPROVED"

    # -------------------------------------------------------------------------
    # STEP 9: Controlled Publication & Version Bump
    # -------------------------------------------------------------------------
    # DOA Administrator publishes the approved change request
    pub_res = client.post(f"/api/change-requests/{active_cr_id}/publish", headers=headers_admin)
    assert pub_res.status_code == 200
    pub_data = pub_res.json()
    assert pub_data["status"] == "PUBLISHED"

    # Verify that target DOA record was updated and version incremented from 1 to 2
    updated_doa = client.get("/api/doa/DOA-ZZZ-999", headers=headers_req)
    assert updated_doa.status_code == 200
    doa_json = updated_doa.json()
    assert doa_json["current_version"] == 2
    assert doa_json["decision_area"] == "Short-Term Commercial Paper Issuance (Approved Ceiling)"
    assert doa_json["status"] == "PUBLISHED"

    # Verify historical version archive has recorded both version 2 and version 1
    versions_res = client.get("/api/doa/DOA-ZZZ-999/versions", headers=headers_audit)
    assert versions_res.status_code == 200
    vers = versions_res.json()
    assert len(vers) >= 2
    ver_numbers = [v["version_number"] for v in vers]
    assert 1 in ver_numbers
    assert 2 in ver_numbers
    
    # Verify version 1 is marked as HISTORICAL and version 2 is CURRENT/PUBLISHED
    v1_entry = next(v for v in vers if v["version_number"] == 1)
    assert v1_entry["status"] == "HISTORICAL"

    # -------------------------------------------------------------------------
    # STEP 10: Immutable Audit Trail & Final Status Verification
    # -------------------------------------------------------------------------
    # Audit log inspection by Internal Audit
    audit_res = client.get("/api/audit-readonly/ledger?skip=0&limit=50", headers=headers_audit)
    assert audit_res.status_code == 200
    ledger = audit_res.json()
    assert len(ledger) > 0

    # Ensure actions are captured in immutable audit ledger
    actions_logged = [log["action"] for log in ledger]
    assert "PUBLISH_CHANGE" in actions_logged
    assert "APPROVE_CHANGE" in actions_logged
    assert "REJECT_CHANGE" in actions_logged

    # Final status check of both change requests
    # Request 1: REJECTED
    cr1 = client.get(f"/api/change-requests/{cr_id}", headers=headers_req).json()
    assert cr1["status"] == "REJECTED"

    # Request 2: PUBLISHED
    cr2 = client.get(f"/api/change-requests/{active_cr_id}", headers=headers_req).json()
    assert cr2["status"] == "PUBLISHED"
    assert cr2["reviewed_at"] is not None
