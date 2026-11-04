import json
import pytest
from app.database.models import User, DOARecord, DOAVersion
from app.core.security import get_password_hash
from app.services.version_service import record_to_dict


@pytest.fixture
def rbac_matrix_env(client, setup_db):
    """
    Create a comprehensive multi-role, multi-domain, multi-entity test environment
    covering all seeded personas, enterprise roles, Finance vs Risk DOAs, and Bahrain vs KSA entities.
    """
    from tests.conftest import TestingSessionLocal
    from app.seed_supplementary import seed_supplementary_data

    db = TestingSessionLocal()

    test_users = [
        # 1. Finance Requestor (Bahrain)
        {
            "email": "rbac.fin.req@doa.local",
            "role": "NORMAL_USER",
            "persona_type": "FRONTEND_USER",
            "full_name": "Finance Analyst BH",
            "department": "Commercial Operations",
            "entity_id": "ENT-BH-01",
            "allowed_domains": "Finance",
        },
        # 2. Second Finance Requestor (to test CR isolation between requestors)
        {
            "email": "rbac.fin.req2@doa.local",
            "role": "NORMAL_USER",
            "persona_type": "FRONTEND_USER",
            "full_name": "Second Finance Analyst BH",
            "department": "Finance",
            "entity_id": "ENT-BH-01",
            "allowed_domains": "Finance",
        },
        # 3. Finance Dept Owner (Bahrain)
        {
            "email": "rbac.fin.dept@doa.local",
            "role": "NORMAL_USER",
            "persona_type": "DEPT_OWNER",
            "full_name": "Finance Dept Head BH",
            "department": "Finance",
            "entity_id": "ENT-BH-01",
            "allowed_domains": "Finance",
        },
        # 4. Risk Dept Owner (Bahrain)
        {
            "email": "rbac.risk.dept@doa.local",
            "role": "NORMAL_USER",
            "persona_type": "DEPT_OWNER",
            "full_name": "Risk Dept Head BH",
            "department": "Risk Management",
            "entity_id": "ENT-BH-01",
            "allowed_domains": "Risk",
        },
        # 5. KSA Finance Dept Owner (KSA Subsidiary)
        {
            "email": "rbac.ksa.dept@doa.local",
            "role": "NORMAL_USER",
            "persona_type": "DEPT_OWNER",
            "full_name": "Finance Dept Head KSA",
            "department": "Finance (KSA)",
            "entity_id": "ENT-KSA-01",
            "allowed_domains": "Finance",
        },
        # 6. Process Owner (Finance / P2P - Bahrain)
        {
            "email": "rbac.proc.owner@doa.local",
            "role": "NORMAL_USER",
            "persona_type": "PROCESS_OWNER",
            "full_name": "Process Owner BH",
            "department": "Supply Chain & Operations",
            "entity_id": "ENT-BH-01",
            "allowed_domains": "Finance",
        },
        # 7. Authority Owner (Cross-Domain Charter Custodian)
        {
            "email": "rbac.auth.owner@doa.local",
            "role": "NORMAL_USER",
            "persona_type": "AUTHORITY_OWNER",
            "full_name": "Authority Owner",
            "department": "Legal & Corporate Governance",
            "entity_id": "ALL",
            "allowed_domains": "ALL",
        },
        # 8. 2LoD Reviewer (Non-Proposer)
        {
            "email": "rbac.reviewer@doa.local",
            "role": "NORMAL_USER",
            "persona_type": "REVIEWER",
            "full_name": "2LoD Reviewer",
            "department": "Enterprise Risk Management",
            "entity_id": "ALL",
            "allowed_domains": "ALL",
        },
        # 9. Executive Approver (Non-Proposer)
        {
            "email": "rbac.approver@doa.local",
            "role": "NORMAL_USER",
            "persona_type": "APPROVER",
            "full_name": "Executive Approver",
            "department": "Executive Management",
            "entity_id": "ALL",
            "allowed_domains": "ALL",
        },
        # 10. Internal Audit Read-Only
        {
            "email": "rbac.audit@doa.local",
            "role": "NORMAL_USER",
            "persona_type": "AUDIT_READONLY",
            "full_name": "Internal Auditor",
            "department": "Internal Audit & Assurance",
            "entity_id": "ALL",
            "allowed_domains": "ALL",
        },
        # 11. Governance Team Officer
        {
            "email": "rbac.gov@doa.local",
            "role": "GOVERNANCE_TEAM",
            "persona_type": "REVIEWER",
            "full_name": "Governance Team Officer",
            "department": "Enterprise Governance",
            "entity_id": "ALL",
            "allowed_domains": "ALL",
        },
        # 12. DOA Administrator
        {
            "email": "rbac.doaadmin@doa.local",
            "role": "DOA_ADMINISTRATOR",
            "persona_type": "APPROVER",
            "full_name": "DOA Administrator",
            "department": "DOA Governance",
            "entity_id": "ALL",
            "allowed_domains": "ALL",
        },
        # 13. Second DOA Administrator (for independent SoD approval/publication)
        {
            "email": "rbac.doaadmin2@doa.local",
            "role": "DOA_ADMINISTRATOR",
            "persona_type": "APPROVER",
            "full_name": "Second DOA Administrator",
            "department": "DOA Governance",
            "entity_id": "ALL",
            "allowed_domains": "ALL",
        },
        # 14. IT System Administrator (No DOA business mutation rights)
        {
            "email": "rbac.sysadmin@doa.local",
            "role": "SYSTEM_ADMINISTRATOR",
            "persona_type": "AUDIT_READONLY",
            "full_name": "IT System Admin",
            "department": "Information Technology",
            "entity_id": "ALL",
            "allowed_domains": "ALL",
        },
    ]

    for u in test_users:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if not existing:
            db.add(
                User(
                    email=u["email"],
                    hashed_password=get_password_hash("Pass@123"),
                    full_name=u["full_name"],
                    role=u["role"],
                    persona_type=u["persona_type"],
                    department=u["department"],
                    entity_id=u["entity_id"],
                    allowed_domains=u["allowed_domains"],
                    is_active=True,
                )
            )

    # Seed explicit Finance (BH), Risk (BH), and Finance (KSA) DOA records
    seed_doas = [
        {
            "id": "RBAC-FIN-BH-01",
            "parent_function": "Finance",
            "function": "Finance",
            "business_line": "Treasury",
            "category": "Treasury",
            "decision_area": "Bahrain Treasury Liquidity Cap",
            "entity_id": "ENT-BH-01",
            "composite_authority": "BoD (A) -> GCFO (R)",
            "regulatory": "Y",
        },
        {
            "id": "RBAC-RISK-BH-01",
            "parent_function": "Risk",
            "function": "Risk",
            "business_line": "Credit Risk",
            "category": "Credit Risk",
            "decision_area": "Bahrain Single Obligor Credit Limit",
            "entity_id": "ENT-BH-01",
            "composite_authority": "BoD (A) -> BRC (E) -> GCRO (R)",
            "regulatory": "Y",
        },
        {
            "id": "RBAC-FIN-KSA-01",
            "parent_function": "Finance",
            "function": "Finance",
            "business_line": "Capital Expenditure",
            "category": "Capital Expenditure",
            "decision_area": "KSA Subsidiary Local Capex Approval",
            "entity_id": "ENT-KSA-01",
            "composite_authority": "Subsidiary Board (A) -> KSA CEO (E)",
            "regulatory": "Y",
        },
    ]

    for d in seed_doas:
        if not db.query(DOARecord).filter(DOARecord.id == d["id"]).first():
            rec = DOARecord(
                id=d["id"],
                parent_function=d["parent_function"],
                function=d["function"],
                business_line=d["business_line"],
                category=d["category"],
                decision_area=d["decision_area"],
                entity_id=d["entity_id"],
                composite_authority=d["composite_authority"],
                regulatory=d["regulatory"],
                key_non_key="Key",
                status="PUBLISHED",
                current_version=1,
            )
            db.add(rec)
            db.flush()
            db.add(
                DOAVersion(
                    doa_id=rec.id,
                    version_number=1,
                    status="PUBLISHED",
                    snapshot=json.dumps(record_to_dict(rec)),
                    created_by="seed@doa.local",
                )
            )

    db.commit()
    seed_supplementary_data(db_session=db)
    db.close()

    headers = {}
    for u in test_users:
        res = client.post("/api/auth/login", json={"email": u["email"], "password": "Pass@123"})
        assert res.status_code == 200
        headers[u["email"]] = {"Authorization": f"Bearer {res.json()['access_token']}"}

    return headers


def test_domain_visibility_scoping_finance_vs_risk(client, rbac_matrix_env):
    """
    Verify departmental / operational users can ONLY view DOA records in their authorized functional domain,
    while cross-domain oversight personas (Audit, Reviewer, Approver, Governance, Admin) see both domains.
    """
    fin_req = rbac_matrix_env["rbac.fin.req@doa.local"]
    fin_dept = rbac_matrix_env["rbac.fin.dept@doa.local"]
    risk_dept = rbac_matrix_env["rbac.risk.dept@doa.local"]
    audit_usr = rbac_matrix_env["rbac.audit@doa.local"]

    # 1. Finance Analyst only receives Finance DOAs on /api/doa and /api/user/doa
    fin_list = client.get("/api/doa", headers=fin_req).json()
    fin_ids = {r["id"] for r in fin_list}
    assert "RBAC-FIN-BH-01" in fin_ids
    assert "RBAC-RISK-BH-01" not in fin_ids

    # Direct GET by ID on Risk DOA returns 403 Forbidden for Finance user
    assert client.get("/api/doa/RBAC-RISK-BH-01", headers=fin_req).status_code == 403
    assert client.get("/api/doa/RBAC-RISK-BH-01/versions", headers=fin_req).status_code == 403

    # 2. Risk Dept Head only receives Risk DOAs and gets 403 on Finance DOAs
    risk_list = client.get("/api/doa", headers=risk_dept).json()
    risk_ids = {r["id"] for r in risk_list}
    assert "RBAC-RISK-BH-01" in risk_ids
    assert "RBAC-FIN-BH-01" not in risk_ids
    assert client.get("/api/doa/RBAC-FIN-BH-01", headers=risk_dept).status_code == 403

    # Dept Owner department-doas & signing-limits report strictly scoped to Risk for Risk Dept Head
    risk_dept_doas = client.get("/api/dept-owner/department-doas", headers=risk_dept).json()
    assert all("Risk" in (r["parent_function"] or "") for r in risk_dept_doas)

    fin_dept_doas = client.get("/api/dept-owner/department-doas", headers=fin_dept).json()
    assert all("Finance" in (r["parent_function"] or "") for r in fin_dept_doas)

    # 3. Internal Audit sees both Finance and Risk DOAs
    aud_list = client.get("/api/doa", headers=audit_usr).json()
    aud_ids = {r["id"] for r in aud_list}
    assert "RBAC-FIN-BH-01" in aud_ids
    assert "RBAC-RISK-BH-01" in aud_ids


def test_crud_proposal_restrictions_by_role_and_persona(client, rbac_matrix_env):
    """
    Verify read-only and non-proposer roles (AUDIT_READONLY, SYSTEM_ADMINISTRATOR, GOVERNANCE_TEAM,
    REVIEWER, APPROVER) are strictly blocked (403) from creating/modifying/deleting DOA proposals.
    """
    blocked_actors = [
        "rbac.audit@doa.local",
        "rbac.sysadmin@doa.local",
        "rbac.gov@doa.local",
        "rbac.reviewer@doa.local",
        "rbac.approver@doa.local",
    ]
    sample_proposal = {
        "request_type": "MODIFY",
        "doa_id": "RBAC-FIN-BH-01",
        "department": "Finance",
        "rationale": "Unauthorized CRUD attempt",
        "base_version": 1,
        "proposed_value": {"decision_area": "Tampered Decision Area"},
    }

    for email in blocked_actors:
        res_cr = client.post("/api/change-requests", json=sample_proposal, headers=rbac_matrix_env[email])
        assert res_cr.status_code == 403, f"Expected 403 for {email} on /api/change-requests, got {res_cr.status_code}"

        res_usr = client.post("/api/user/proposals", json=sample_proposal, headers=rbac_matrix_env[email])
        assert res_usr.status_code == 403, f"Expected 403 for {email} on /api/user/proposals, got {res_usr.status_code}"

        # Also blocked from direct master DOA creation & archival
        res_direct = client.post(
            "/api/doa",
            json={"id": "UNAUTH-999", "parent_function": "Finance", "decision_area": "Direct Write"},
            headers=rbac_matrix_env[email],
        )
        assert res_direct.status_code == 403


def test_domain_and_entity_ownership_write_isolation(client, rbac_matrix_env):
    """
    BRD Section 4.4 & Section 6 Acceptance Criteria:
    - Finance user cannot propose changes to Risk DOAs (403).
    - Bahrain (ENT-BH-01) user can READ KSA Finance DOA, but gets 403 attempting to MODIFY/DELETE it.
    - KSA (ENT-KSA-01) user can MODIFY KSA Finance DOA, can READ Bahrain Finance DOA, but gets 403 modifying Bahrain DOA.
    """
    fin_bh = rbac_matrix_env["rbac.fin.dept@doa.local"]
    fin_ksa = rbac_matrix_env["rbac.ksa.dept@doa.local"]

    # 1. Finance BH Dept Head blocked from proposing on Risk DOA
    cross_domain_res = client.post(
        "/api/change-requests",
        headers=fin_bh,
        json={
            "request_type": "MODIFY",
            "doa_id": "RBAC-RISK-BH-01",
            "department": "Risk",
            "rationale": "Cross-domain mutation attempt",
            "base_version": 1,
            "proposed_value": {"decision_area": "Cross-domain edit"},
        },
    )
    assert cross_domain_res.status_code == 403

    # 2. Finance BH Dept Head CAN read KSA Finance DOA, but CANNOT mutate it (403 Entity Ownership Violation)
    read_ksa = client.get("/api/doa/RBAC-FIN-KSA-01", headers=fin_bh)
    assert read_ksa.status_code == 200

    mutate_ksa_by_bh = client.post(
        "/api/change-requests",
        headers=fin_bh,
        json={
            "request_type": "MODIFY",
            "doa_id": "RBAC-FIN-KSA-01",
            "department": "Finance",
            "rationale": "Cross-geography mutation from Bahrain to KSA",
            "base_version": 1,
            "proposed_value": {"decision_area": "Unauthorized KSA edit"},
        },
    )
    assert mutate_ksa_by_bh.status_code == 403
    assert "Entity Ownership Violation" in mutate_ksa_by_bh.json()["detail"]

    # 3. KSA Finance Dept Head CAN mutate KSA Finance DOA, but CANNOT mutate Bahrain Finance DOA
    mutate_ksa_ok = client.post(
        "/api/change-requests",
        headers=fin_ksa,
        json={
            "request_type": "MODIFY",
            "doa_id": "RBAC-FIN-KSA-01",
            "department": "Finance (KSA)",
            "entity_id": "ENT-KSA-01",
            "rationale": "Authorized local KSA threshold update",
            "base_version": 1,
            "proposed_value": {"decision_area": "Updated KSA Subsidiary Local Capex Approval"},
        },
    )
    assert mutate_ksa_ok.status_code == 200

    mutate_bh_by_ksa = client.post(
        "/api/change-requests",
        headers=fin_ksa,
        json={
            "request_type": "DELETE",
            "doa_id": "RBAC-FIN-BH-01",
            "department": "Finance",
            "rationale": "Cross-geography retirement attempt on Bahrain HQ rule",
            "base_version": 1,
        },
    )
    assert mutate_bh_by_ksa.status_code == 403


def test_change_request_visibility_isolation(client, rbac_matrix_env):
    """
    - FRONTEND_USER sees ONLY their own Change Requests; gets 403 on another requestor's CR ID or diff.
    - Risk DEPT_OWNER cannot view or sign off on a Finance Change Request (403).
    """
    req1 = rbac_matrix_env["rbac.fin.req@doa.local"]
    req2 = rbac_matrix_env["rbac.fin.req2@doa.local"]
    risk_dept = rbac_matrix_env["rbac.risk.dept@doa.local"]

    cr_res = client.post(
        "/api/change-requests",
        headers=req1,
        json={
            "request_type": "MODIFY",
            "doa_id": "RBAC-FIN-BH-01",
            "department": "Finance",
            "rationale": "Req1 private Finance proposal",
            "base_version": 1,
            "proposed_value": {"decision_area": "Req1 updated treasury rule"},
        },
    )
    assert cr_res.status_code == 200
    cr_id = cr_res.json()["id"]

    # Req2 cannot see Req1's CR in list, detail, or diff
    req2_list = client.get("/api/change-requests", headers=req2).json()
    assert all(c["id"] != cr_id for c in req2_list)
    assert client.get(f"/api/change-requests/{cr_id}", headers=req2).status_code == 403
    assert client.get(f"/api/change-requests/{cr_id}/diff", headers=req2).status_code == 403

    # Risk Dept Owner cannot view or sign off on Finance CR
    assert client.get(f"/api/change-requests/{cr_id}", headers=risk_dept).status_code == 403
    signoff_cross = client.post(
        f"/api/dept-owner/requests/{cr_id}/signoff",
        headers=risk_dept,
        json={"comment": "Cross-domain signoff attempt"},
    )
    assert signoff_cross.status_code == 403


def test_segregation_of_duties_val06_prevents_self_approval_and_self_publish(client, rbac_matrix_env):
    """
    BRD VAL-06: Unless an approved exception applies, the proposer cannot endorse, sign off,
    approve, reject, or publish their own Change Request — even if they hold DOA_ADMINISTRATOR!
    """
    admin1 = rbac_matrix_env["rbac.doaadmin@doa.local"]
    admin2 = rbac_matrix_env["rbac.doaadmin2@doa.local"]
    dept_fin = rbac_matrix_env["rbac.fin.dept@doa.local"]

    # 1. Dept Owner creates a CR and tries to sign off on their own CR -> 403 SoD violation
    dept_cr = client.post(
        "/api/change-requests",
        headers=dept_fin,
        json={
            "request_type": "MODIFY",
            "doa_id": "RBAC-FIN-BH-01",
            "department": "Finance",
            "rationale": "Dept head self-signoff test",
            "base_version": 1,
            "proposed_value": {"decision_area": "Self signoff test"},
        },
    ).json()
    self_signoff = client.post(
        f"/api/dept-owner/requests/{dept_cr['id']}/signoff",
        headers=dept_fin,
        json={"comment": "Attempting self signoff"},
    )
    assert self_signoff.status_code == 403
    assert "VAL-06" in self_signoff.json()["detail"]

    # 2. DOA Admin 1 creates a CR and tries to self-approve -> 403 SoD violation
    admin_cr = client.post(
        "/api/change-requests",
        headers=admin1,
        json={
            "request_type": "MODIFY",
            "doa_id": "RBAC-FIN-BH-01",
            "department": "Finance",
            "rationale": "Admin1 proposal requiring independent approval",
            "base_version": 1,
            "proposed_value": {"decision_area": "Admin1 proposed text"},
        },
    ).json()

    self_approve = client.post(
        f"/api/change-requests/{admin_cr['id']}/approve",
        headers=admin1,
        json={"comment": "Self-approving my own CR"},
    )
    assert self_approve.status_code == 403
    assert "VAL-06" in self_approve.json()["detail"]

    # Independent DOA Admin 2 CAN approve Admin 1's CR
    indep_approve = client.post(
        f"/api/change-requests/{admin_cr['id']}/approve",
        headers=admin2,
        json={"comment": "Independent approval by Admin 2"},
    )
    assert indep_approve.status_code == 200
    assert indep_approve.json()["status"] == "APPROVED"

    # Admin 1 (proposer) STILL cannot publish their own CR -> 403 SoD violation
    self_publish = client.post(f"/api/change-requests/{admin_cr['id']}/publish", headers=admin1)
    assert self_publish.status_code == 403
    assert "VAL-06" in self_publish.json()["detail"]


def test_exception_workflow_stage_authorization_and_sod(client, rbac_matrix_env):
    """
    BRD Section 4.3 Multi-Stage Exception Route:
    - Read-only / non-proposer roles cannot raise exceptions (403).
    - Requester cannot self-approve exception (403).
    - Stage 1 requires Reporting Manager / DEPT_OWNER (FRONTEND_USER or APPROVER blocked if not designated).
    - Stage 2 requires Division Head / APPROVER (DEPT_OWNER blocked).
    - Stage 3 requires Senior Governance (APPROVER / DEPT_OWNER blocked; GOVERNANCE_TEAM succeeds).
    """
    req = rbac_matrix_env["rbac.fin.req@doa.local"]
    mgr = rbac_matrix_env["rbac.fin.dept@doa.local"]
    div = rbac_matrix_env["rbac.approver@doa.local"]
    gov = rbac_matrix_env["rbac.gov@doa.local"]
    aud = rbac_matrix_env["rbac.audit@doa.local"]

    # Audit Read-Only cannot submit exception
    aud_exc = client.post(
        "/api/supplementary/exceptions",
        headers=aud,
        json={"exception_type": "EVIDENCE_EXCEPTION", "deviated_principles": ["VAL-01"], "rationale": "Blocked"},
    )
    assert aud_exc.status_code == 403

    # Requestor submits valid exception
    exc_res = client.post(
        "/api/supplementary/exceptions",
        headers=req,
        json={
            "doa_id": "RBAC-FIN-BH-01",
            "exception_type": "EVIDENCE_EXCEPTION",
            "deviated_validation_rules": ["VAL-01"],
            "regulatory_or_business_rationale": "Board minutes pending formal attestation.",
            "reporting_manager_email": "rbac.fin.dept@doa.local",
            "division_head_email": "rbac.approver@doa.local",
        },
    )
    assert exc_res.status_code == 200
    exc_id = exc_res.json()["id"]

    # Requester cannot approve Stage 1 (403 SoD)
    assert (
        client.post(
            f"/api/supplementary/exceptions/{exc_id}/action",
            headers=req,
            json={"action": "APPROVE", "comment": "Self approve"},
        ).status_code
        == 403
    )

    # Division Head cannot jump ahead at Stage 1 (403 Stage Authorization)
    assert (
        client.post(
            f"/api/supplementary/exceptions/{exc_id}/action",
            headers=div,
            json={"action": "APPROVE", "comment": "Wrong stage"},
        ).status_code
        == 403
    )

    # Stage 1: Reporting Manager (DEPT_OWNER) approves -> moves to PENDING_DIVISION_HEAD
    s1 = client.post(
        f"/api/supplementary/exceptions/{exc_id}/action",
        headers=mgr,
        json={"action": "APPROVE", "comment": "Manager verified rationale"},
    )
    assert s1.status_code == 200
    assert s1.json()["current_stage"] == "PENDING_DIVISION_HEAD"

    # Stage 2: Reporting Manager cannot also approve Stage 2 (403)
    assert (
        client.post(
            f"/api/supplementary/exceptions/{exc_id}/action",
            headers=mgr,
            json={"action": "APPROVE", "comment": "Trying stage 2 as manager"},
        ).status_code
        == 403
    )

    # Stage 2: Division Head (APPROVER) approves -> moves to PENDING_GOVERNANCE
    s2 = client.post(
        f"/api/supplementary/exceptions/{exc_id}/action",
        headers=div,
        json={"action": "APPROVE", "comment": "Division Head endorsed"},
    )
    assert s2.status_code == 200
    assert s2.json()["current_stage"] == "PENDING_GOVERNANCE"

    # Stage 3: Division Head cannot approve Stage 3 Senior Governance (403)
    assert (
        client.post(
            f"/api/supplementary/exceptions/{exc_id}/action",
            headers=div,
            json={"action": "APPROVE", "comment": "Trying stage 3 as div head"},
        ).status_code
        == 403
    )

    # Stage 3: Governance Team approves -> APPROVED
    s3 = client.post(
        f"/api/supplementary/exceptions/{exc_id}/action",
        headers=gov,
        json={"action": "APPROVE", "comment": "Senior DOA Governance final approval"},
    )
    assert s3.status_code == 200
    assert s3.json()["status"] == "APPROVED"


def test_audit_and_sysadmin_boundary_enforcement(client, rbac_matrix_env):
    """
    - AUDIT_READONLY can access /api/audit and /api/supplementary/findings, while FRONTEND_USER gets 403.
    - SYSTEM_ADMINISTRATOR can manage /api/admin/users and read /api/audit, but gets 403 on
      /api/doa-admin/*, /api/governance/*, and /api/supplementary/reports/bahrain-ksa-alignment.
    """
    aud = rbac_matrix_env["rbac.audit@doa.local"]
    req = rbac_matrix_env["rbac.fin.req@doa.local"]
    sysadmin = rbac_matrix_env["rbac.sysadmin@doa.local"]

    assert client.get("/api/audit", headers=aud).status_code == 200
    assert client.get("/api/supplementary/findings", headers=aud).status_code == 200
    assert client.get("/api/audit", headers=req).status_code == 403
    assert client.get("/api/supplementary/findings", headers=req).status_code == 403

    # System Admin allowed IT telemetry & audit logs, blocked from DOA business & governance hubs
    assert client.get("/api/system-admin/dashboard", headers=sysadmin).status_code == 200
    assert client.get("/api/system-admin/telemetry", headers=sysadmin).status_code == 200
    assert client.get("/api/audit", headers=sysadmin).status_code == 200
    assert client.get("/api/doa-admin/dashboard", headers=sysadmin).status_code == 403
    assert client.get("/api/governance/dashboard", headers=sysadmin).status_code == 403
    assert client.get("/api/supplementary/reports/bahrain-ksa-alignment", headers=sysadmin).status_code == 403
