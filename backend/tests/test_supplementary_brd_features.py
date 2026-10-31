import pytest
from app.database.models import User
from app.core.security import get_password_hash

@pytest.fixture
def supplementary_tokens(client, setup_db):
    from tests.conftest import TestingSessionLocal
    db = TestingSessionLocal()
    
    # Ensure seed users
    users = [
        {"email": "req.user@doa.local", "role": "NORMAL_USER", "persona_type": "FRONTEND_USER", "full_name": "Req User"},
        {"email": "mgr.user@doa.local", "role": "NORMAL_USER", "persona_type": "DEPT_OWNER", "full_name": "Mgr User"},
        {"email": "div.head@doa.local", "role": "NORMAL_USER", "persona_type": "APPROVER", "full_name": "Div Head"},
        {"email": "gov.user@doa.local", "role": "GOVERNANCE_TEAM", "persona_type": "REVIEWER", "full_name": "Gov Reviewer"},
        {"email": "admin.user@doa.local", "role": "DOA_ADMINISTRATOR", "persona_type": "ADMIN", "full_name": "DOA Admin"},
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
                is_active=True
            ))
    db.commit()
    db.close()

    # Seed supplementary data in test db
    from app.seed_supplementary import seed_supplementary_data
    test_db = TestingSessionLocal()
    seed_supplementary_data(db_session=test_db)
    test_db.close()

    toks = {}
    for u in users:
        res = client.post("/api/auth/login", json={"email": u["email"], "password": "Pass@123"})
        assert res.status_code == 200
        toks[u["email"]] = res.json()["access_token"]
    return toks

# -----------------------------------------------------------------------------
# 1. VAL-01 to VAL-12: Decision Area Validation Engine Tests
# -----------------------------------------------------------------------------
def test_val_01_evidence_hard_stop(client, supplementary_tokens):
    """VAL-01: Proposing new decision area without evidence or exception fails hard stop."""
    token = supplementary_tokens["req.user@doa.local"]
    payload = {
        "decision_area": "New Treasury Borrowing Facility",
        "parent_function": "Finance",
        "business_line": "Treasury & Funding Operations",
        "proposer": "Treasury Analyst",
        "reviewer": "Head of Treasury",
        "final_approver": "Board of Directors",
        "rationale": "Liquidity management facility",
        "supporting_documentation": [], # Empty evidence
        "authoritative_source_ids": [],
        "has_approved_exception": False
    }
    res = client.post("/api/supplementary/validate-proposal", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert data["can_submit"] is False
    assert any("VAL-01" in err for err in data["hard_stop_errors"])
    assert data["classification"] == "Board-level DOA" # VAL-04/05

def test_val_03_audit_committee_sequencing(client, supplementary_tokens):
    """VAL-03: Audit Committee must be the last Board Committee in sequence."""
    token = supplementary_tokens["req.user@doa.local"]
    payload = {
        "decision_area": "Internal Controls & Risk Policy Review",
        "parent_function": "Risk",
        "business_line": "Enterprise Risk Management (ERM)",
        "proposer": "Risk Analyst",
        "reviewer": "Chief Risk Officer",
        "final_approver": "Board of Directors",
        "rationale": "Periodic risk refresh",
        "supporting_documentation": [{"name": "evidence.pdf"}],
        "board_committees_involved": ["Audit Committee", "Risk Management Committee"], # Audit Committee is NOT last
        "has_approved_exception": False
    }
    res = client.post("/api/supplementary/validate-proposal", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert any("VAL-03" in err for err in data["hard_stop_errors"])

def test_val_06_sod_proposer_and_approver_same(client, supplementary_tokens):
    """VAL-06: Same user cannot act as both proposer and final approver."""
    token = supplementary_tokens["req.user@doa.local"]
    payload = {
        "decision_area": "Procurement Signoff",
        "parent_function": "Finance",
        "business_line": "Other Finance Processes",
        "proposer": "John Doe",
        "reviewer": "Jane Smith",
        "final_approver": "John Doe", # Conflict!
        "rationale": "Conflict test",
        "supporting_documentation": [{"name": "evidence.pdf"}],
        "has_approved_exception": False
    }
    res = client.post("/api/supplementary/validate-proposal", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert any("VAL-06" in err for err in data["hard_stop_errors"])

def test_val_08_prea_sequence_validation(client, supplementary_tokens):
    """VAL-08: Sequence must follow P -> R -> E -> A."""
    token = supplementary_tokens["req.user@doa.local"]
    payload = {
        "decision_area": "Capital Project Allocation",
        "parent_function": "Finance",
        "business_line": "Bank Capital and Capital Management",
        "proposer": "Analyst",
        "reviewer": "Manager",
        "final_approver": "Board of Directors",
        "rationale": "Sequence test",
        "supporting_documentation": [{"name": "evidence.pdf"}],
        "board_committees_involved": ["Audit Committee"],
        "governance_pathway": [
            {"role": "Proposer", "participant": "Analyst"},
            {"role": "Approver", "participant": "Manager"}, # Approver before Endorser/Reviewer
            {"role": "Reviewer", "participant": "VP"}
        ],
        "has_approved_exception": False
    }
    res = client.post("/api/supplementary/validate-proposal", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert any("VAL-08" in err for err in data["hard_stop_errors"])

def test_val_11_financial_limits_validation(client, supplementary_tokens):
    """VAL-11: Financial decision area requires explicit amount/currency or controlled limit."""
    token = supplementary_tokens["req.user@doa.local"]
    payload = {
        "decision_area": "High Value Equipment Purchase",
        "parent_function": "Finance",
        "business_line": "Other Finance Processes",
        "proposer": "Procurement Lead",
        "reviewer": "Finance Director",
        "final_approver": "GCEO",
        "rationale": "Capex purchase",
        "supporting_documentation": [{"name": "evidence.pdf"}],
        "is_financial": True,
        "monetary_amount": None, # Missing amount and limit!
        "linked_expenditure_limit_id": None,
        "has_approved_exception": False
    }
    res = client.post("/api/supplementary/validate-proposal", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert any("VAL-11" in err for err in data["hard_stop_errors"])

# -----------------------------------------------------------------------------
# 2. Section 4.3: Exception Workflow End-to-End Route
# -----------------------------------------------------------------------------
def test_exception_workflow_full_lifecycle(client, supplementary_tokens):
    """
    Test Section 4.3 Exception Workflow:
    Requester submits -> Reporting Manager approves -> Division Head approves -> Governance Senior Reviewer approves
    """
    req_tok = supplementary_tokens["req.user@doa.local"]
    mgr_tok = supplementary_tokens["mgr.user@doa.local"]
    div_tok = supplementary_tokens["div.head@doa.local"]
    gov_tok = supplementary_tokens["gov.user@doa.local"]

    # 1. Requester raises exception request
    create_res = client.post(
        "/api/supplementary/exceptions",
        json={
            "exception_type": "EVIDENCE_EXCEPTION",
            "deviated_principles": ["VAL-01"],
            "rationale": "Pending urgent Board charter ratification next month; provisional approval requested.",
            "supporting_documents": [{"name": "Draft_Minutes.pdf"}]
        },
        headers={"Authorization": f"Bearer {req_tok}"}
    )
    assert create_res.status_code == 200
    exc_data = create_res.json()
    exc_id = exc_data["id"]
    assert exc_data["current_stage"] == "PENDING_REPORTING_MGR"
    assert exc_data["status"] == "SUBMITTED"

    # 2. Reporting Manager approves exception
    act_1 = client.post(
        f"/api/supplementary/exceptions/{exc_id}/action",
        json={"action": "APPROVE", "comment": "Business justification verified and supported."},
        headers={"Authorization": f"Bearer {mgr_tok}"}
    )
    assert act_1.status_code == 200
    assert act_1.json()["current_stage"] == "PENDING_DIVISION_HEAD"
    assert act_1.json()["reporting_mgr_decision"] == "APPROVE"

    # 3. Division Head approves exception
    act_2 = client.post(
        f"/api/supplementary/exceptions/{exc_id}/action",
        json={"action": "APPROVE", "comment": "Division risk appetite verified. Escalating to Governance Team."},
        headers={"Authorization": f"Bearer {div_tok}"}
    )
    assert act_2.status_code == 200
    assert act_2.json()["current_stage"] == "PENDING_GOVERNANCE"
    assert act_2.json()["division_head_decision"] == "APPROVE"

    # 4. Governance Team Senior Reviewer approves exception
    act_3 = client.post(
        f"/api/supplementary/exceptions/{exc_id}/action",
        json={"action": "APPROVE", "comment": "Senior governance review completed. Approved as Exceptional Decision Area with 12-month review."},
        headers={"Authorization": f"Bearer {gov_tok}"}
    )
    assert act_3.status_code == 200
    assert act_3.json()["current_stage"] == "APPROVED"
    assert act_3.json()["status"] == "APPROVED"
    assert act_3.json()["governance_decision"] == "APPROVE"

# -----------------------------------------------------------------------------
# 3. VAL-01 Authoritative Sources & Impact Assessment Test
# -----------------------------------------------------------------------------
def test_authoritative_source_impact_assessment(client, supplementary_tokens):
    """VAL-01: Updating a source flags linked decision areas for impact review."""
    admin_tok = supplementary_tokens["admin.user@doa.local"]
    sources_res = client.get("/api/supplementary/authoritative-sources", headers={"Authorization": f"Bearer {admin_tok}"})
    assert sources_res.status_code == 200
    sources = sources_res.json()
    assert len(sources) > 0

    first_src_id = sources[0]["id"]
    impact_res = client.post(
        f"/api/supplementary/authoritative-sources/{first_src_id}/trigger-impact",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    assert impact_res.status_code == 200
    impact_data = impact_res.json()
    assert impact_data["source_id"] == first_src_id
    assert "flagged_decision_areas_count" in impact_data

# -----------------------------------------------------------------------------
# 4. Acceptance Criteria: Bahrain–KSA Cross-Geography Comparison & Alignment
# -----------------------------------------------------------------------------
def test_cross_geography_comparison_and_alignment_report(client, supplementary_tokens):
    """Verify cross-geography single comparison result and reconciliation report."""
    gov_tok = supplementary_tokens["gov.user@doa.local"]
    
    # 1. Single Comparison
    comp_res = client.post(
        "/api/supplementary/cross-geography/compare",
        json={
            "decision_area_code": "CAPEX_PROCUREMENT_APPROVAL",
            "source_entity_id": "ENT-BH-01",
            "target_entity_id": "ENT-KSA-01"
        },
        headers={"Authorization": f"Bearer {gov_tok}"}
    )
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    assert comp_data["source_geography"] == "Bahrain"
    assert comp_data["target_geography"] == "KSA"
    assert comp_data["match_status"] in ["COMPLETE_MATCH", "MISMATCH", "NOT_MAPPED"]
    assert "required_alignment_outcome" in comp_data

    # 2. Comprehensive Bahrain-KSA Alignment Report
    rpt_res = client.get("/api/supplementary/reports/bahrain-ksa-alignment", headers={"Authorization": f"Bearer {gov_tok}"})
    assert rpt_res.status_code == 200
    rpt_data = rpt_res.json()
    assert rpt_data["total_decision_areas_mapped"] >= 3
    assert "alignment_records" in rpt_data

# -----------------------------------------------------------------------------
# 5. Section 5: Point-in-Time Reconstruction Test
# -----------------------------------------------------------------------------
def test_point_in_time_reconstruction(client, supplementary_tokens):
    """Section 5: Choose historical date and reconstruct active snapshot."""
    gov_tok = supplementary_tokens["gov.user@doa.local"]
    # Get any valid DOA ID
    doas = client.get("/api/doa", headers={"Authorization": f"Bearer {gov_tok}"}).json()
    target_id = doas[0]["id"] if doas else "225"

    res = client.post(
        "/api/supplementary/point-in-time/reconstruct",
        json={
            "doa_id": target_id,
            "target_date": "2026-01-01"
        },
        headers={"Authorization": f"Bearer {gov_tok}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["doa_id"] == target_id
    assert "record_snapshot" in data
    assert "linked_authoritative_sources" in data
