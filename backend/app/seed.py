import os
import json
from pathlib import Path
from sqlalchemy.orm import Session
from app.database.database import engine, Base, SessionLocal
from app.database.models import User, DOARecord, DOAVersion, AuditLog
from app.core.security import get_password_hash
from app.services.version_service import create_published_version_snapshot

def seed_database():
    print("Initializing SQLite Database tables...")
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    try:
        # 1. Seed Users
        # 1. Seed Users - 7 Normal User Personas + Core Admins
        seed_users_data = [
            # 1. Department / Function Owner
            {
                "email": "dept.owner@doa.local",
                "password": "User@123",
                "full_name": "Marcus Vance",
                "role": "NORMAL_USER",
                "persona_type": "DEPT_OWNER",
                "designation": "Head of Finance & Treasury",
                "department": "Finance",
                "reports_to": "Chief Financial Officer"
            },
            # 2. Process Owner
            {
                "email": "process.owner@doa.local",
                "password": "User@123",
                "full_name": "Elena Rostova",
                "role": "NORMAL_USER",
                "persona_type": "PROCESS_OWNER",
                "designation": "P2P & Procurement Process Lead",
                "department": "Supply Chain & Operations",
                "reports_to": "Head of Operations"
            },
            # 3. Authority Owner
            {
                "email": "authority.owner@doa.local",
                "password": "User@123",
                "full_name": "David Sterling",
                "role": "NORMAL_USER",
                "persona_type": "AUTHORITY_OWNER",
                "designation": "Board Secretariat / Governance Counsel",
                "department": "Legal & Corporate Governance",
                "reports_to": "Company Secretary"
            },
            # 4. Reviewer
            {
                "email": "reviewer@doa.local",
                "password": "User@123",
                "full_name": "Sophia Zhang",
                "role": "NORMAL_USER",
                "persona_type": "REVIEWER",
                "designation": "Senior Risk & Governance Reviewer",
                "department": "Enterprise Risk Management",
                "reports_to": "Chief Risk Officer"
            },
            # 5. Approver
            {
                "email": "approver@doa.local",
                "password": "User@123",
                "full_name": "Julian Hayes",
                "role": "NORMAL_USER",
                "persona_type": "APPROVER",
                "designation": "Executive Committee Approver (VP Finance)",
                "department": "Executive Management",
                "reports_to": "GCEO"
            },
            # 6. Front-End User
            {
                "email": "user@doa.local",
                "password": "User@123",
                "full_name": "Aiden Cole",
                "role": "NORMAL_USER",
                "persona_type": "FRONTEND_USER",
                "designation": "Business Line Analyst",
                "department": "Commercial Operations",
                "reports_to": "Marcus Vance"
            },
            # 7. Internal Audit / Compliance Read-Only User
            {
                "email": "audit.readonly@doa.local",
                "password": "User@123",
                "full_name": "Claire Montgomery",
                "role": "NORMAL_USER",
                "persona_type": "AUDIT_READONLY",
                "designation": "Senior Internal Auditor",
                "department": "Internal Audit & Assurance",
                "reports_to": "Audit Committee Chair"
            },
            # Enterprise Roles
            {
                "email": "governance@doa.local",
                "password": "GovTeam@123",
                "full_name": "Risk & Governance Reviewer",
                "role": "GOVERNANCE_TEAM",
                "persona_type": "REVIEWER",
                "designation": "2LoD Governance Officer",
                "department": "Enterprise Governance & Compliance",
                "reports_to": "Chief Compliance Officer"
            },
            {
                "email": "doaadmin@doa.local",
                "password": "DoaAdmin@123",
                "full_name": "Chief Delegation Officer (DOA Admin)",
                "role": "DOA_ADMINISTRATOR",
                "persona_type": "APPROVER",
                "designation": "DOA Governance Lead",
                "department": "Executive Office / DOA Governance",
                "reports_to": "GCEO"
            },
            {
                "email": "admin@doa.local",
                "password": "Admin@123",
                "full_name": "Global Governance Administrator",
                "role": "DOA_ADMINISTRATOR",
                "persona_type": "APPROVER",
                "designation": "Global Admin",
                "department": "Executive Office",
                "reports_to": "BoD"
            },
            {
                "email": "sysadmin@doa.local",
                "password": "SysAdmin@123",
                "full_name": "IT & System Administrator",
                "role": "SYSTEM_ADMINISTRATOR",
                "persona_type": "AUDIT_READONLY",
                "designation": "Platform Architect",
                "department": "Information Technology / Systems",
                "reports_to": "CIO"
            }
        ]

        for u in seed_users_data:
            existing_user = db.query(User).filter(User.email == u["email"]).first()
            if not existing_user:
                db_user = User(
                    email=u["email"],
                    hashed_password=get_password_hash(u["password"]),
                    full_name=u["full_name"],
                    role=u["role"],
                    persona_type=u.get("persona_type", "FRONTEND_USER"),
                    designation=u.get("designation", ""),
                    department=u.get("department", ""),
                    reports_to=u.get("reports_to", ""),
                    is_active=True
                )
                db.add(db_user)
                print(f"[+] Created user: {u['email']} ({u.get('persona_type')})")
            else:
                existing_user.role = u["role"]
                existing_user.full_name = u["full_name"]
                existing_user.persona_type = u.get("persona_type", "FRONTEND_USER")
                existing_user.designation = u.get("designation", "")
                existing_user.department = u.get("department", "")
                existing_user.reports_to = u.get("reports_to", "")

        db.commit()


        # 2. Seed Master DOA Records from seed_doa_data.json
        json_path = Path(__file__).parent / "seed_doa_data.json"
        if json_path.exists():
            with open(json_path, "r", encoding="utf-8") as f:
                doa_list = json.load(f)

            count = 0
            for item in doa_list:
                item_id = str(item.get("id"))
                existing = db.query(DOARecord).filter(DOARecord.id == item_id).first()
                if not existing:
                    rec = DOARecord(
                        id=item_id,
                        parent_function=item.get("parentFunction") or item.get("function") or "Finance",
                        function=item.get("function") or item.get("parentFunction") or "Finance",
                        business_line=item.get("businessLine") or item.get("category") or "",
                        category=item.get("category") or item.get("businessLine") or "",
                        key_non_key=item.get("keyNonKey", "Key"),
                        decision_area=item.get("decisionArea", ""),
                        shareholders=item.get("shareholders", ""),
                        board_of_directors=item.get("boardOfDirectors", ""),
                        subsidiary_board=item.get("subsidiaryBoard", ""),
                        chairman=item.get("chairman", ""),
                        board_committees=item.get("boardCommittees", ""),
                        board_committees_op=item.get("boardCommitteesOp", ""),
                        board_committees2=item.get("boardCommittees2", ""),
                        board_committees2_op=item.get("boardCommittees2Op", ""),
                        gceo=item.get("gceo", ""),
                        ceo=item.get("ceo", ""),
                        mgmt_committees=item.get("mgmtCommittees", ""),
                        mgmt_committees_op=item.get("mgmtCommitteesOp", ""),
                        mgmt_committees2=item.get("mgmtCommittees2", ""),
                        mgmt_committees2_op=item.get("mgmtCommittees2Op", ""),
                        c_level1=item.get("cLevel1", ""),
                        c_level1_op=item.get("cLevel1Op", ""),
                        c_level2=item.get("cLevel2", ""),
                        c_level2_op=item.get("cLevel2Op", ""),
                        comments=item.get("comments", ""),
                        regulatory=item.get("regulatory", "N"),
                        composite_authority=item.get("compositeAuthority", "BoD (A)"),
                        rationale=item.get("comments", ""),
                        policy_reference=f"Internal Financial Policy §{int(item_id)%12 + 1}.4 (Delegated Caps)",
                        charter_section=f"Governance Charter Schedule B, Article {int(item_id)%8 + 1}",
                        regulatory_requirement="Central Bank Regulatory Framework (CBR-Gov §44)" if item.get("regulatory") == "Y" else "Internal Corporate Mandate",
                        process_name="Capital Expenditures & Treasury" if "Finance" in (item.get("parentFunction") or "") else "Enterprise Risk & Credit Underwriting",
                        attachments=json.dumps([
                            {
                                "name": f"Policy_Extract_Ref_{item_id}.pdf",
                                "size": "420 KB",
                                "uploaded_at": "2026-01-15",
                                "type": "Policy Document"
                            }
                        ]),
                        current_version=1,
                        status="PUBLISHED",
                        effective_date="2026-01-01",
                        review_date="2027-01-01",
                        created_by="admin@doa.local"
                    )
                    db.add(rec)
                    db.flush()
                    # Create corresponding initial Version 1 snapshot
                    create_published_version_snapshot(db, rec, "admin@doa.local")
                    count += 1

            db.commit()
            print(f"[+] Successfully seeded {count} published DOA master records with v1 snapshots.")
        else:
            print(f"Warning: seed_doa_data.json not found at {json_path}")

        # 3. Seed HR Positions & Acting Delegations (Functionality 9)
        from app.database.models import HREmployee
        hr_data = [
            {
                "emp_code": "HR-1001",
                "full_name": "Marcus Vance",
                "email": "dept.owner@doa.local",
                "designation": "Head of Finance & Treasury",
                "doa_designation_key": "c_level1",
                "department": "Finance",
                "reporting_to_name": "Arthur Pendelton (CFO)",
                "reporting_to_email": "cfo@doa.local",
                "is_vacant": False,
                "acting_authority_name": None,
                "acting_authority_email": None,
                "acting_valid_until": None
            },
            {
                "emp_code": "HR-1002",
                "full_name": "Elena Rostova",
                "email": "process.owner@doa.local",
                "designation": "P2P Process Owner",
                "doa_designation_key": "mgmt_committees",
                "department": "Supply Chain & Procurement",
                "reporting_to_name": "Marcus Vance",
                "reporting_to_email": "dept.owner@doa.local",
                "is_vacant": False,
                "acting_authority_name": None,
                "acting_authority_email": None,
                "acting_valid_until": None
            },
            {
                "emp_code": "HR-1003",
                "full_name": "Arthur Pendelton",
                "email": "cfo@doa.local",
                "designation": "Chief Financial Officer",
                "doa_designation_key": "c_level1",
                "department": "Finance & Accounts",
                "reporting_to_name": "Sir Robert Kingsman (GCEO)",
                "reporting_to_email": "gceo@doa.local",
                "is_vacant": False,
                "acting_authority_name": "Marcus Vance (Acting CFO)",
                "acting_authority_email": "dept.owner@doa.local",
                "acting_valid_until": "2026-10-31"
            },
            {
                "emp_code": "HR-1004",
                "full_name": "Sir Robert Kingsman",
                "email": "gceo@doa.local",
                "designation": "Group Chief Executive Officer (GCEO)",
                "doa_designation_key": "gceo",
                "department": "Executive Leadership",
                "reporting_to_name": "Board of Directors",
                "reporting_to_email": "bod@doa.local",
                "is_vacant": False,
                "acting_authority_name": None,
                "acting_authority_email": None,
                "acting_valid_until": None
            },
            {
                "emp_code": "HR-1005",
                "full_name": "[Position Vacant - Head of Credit Risk]",
                "email": "credit.head.vacant@doa.local",
                "designation": "Head of Enterprise Credit Risk",
                "doa_designation_key": "c_level2",
                "department": "Risk Management",
                "reporting_to_name": "Sophia Zhang (Acting Head)",
                "reporting_to_email": "reviewer@doa.local",
                "is_vacant": True,
                "acting_authority_name": "Sophia Zhang (Senior Risk Reviewer)",
                "acting_authority_email": "reviewer@doa.local",
                "acting_valid_until": "2026-12-31"
            }
        ]

        for item in hr_data:
            existing_emp = db.query(HREmployee).filter(HREmployee.emp_code == item["emp_code"]).first()
            if not existing_emp:
                new_emp = HREmployee(**item)
                db.add(new_emp)
            else:
                for k, v in item.items():
                    setattr(existing_emp, k, v)

        # 4. Seed Realistic Enterprise Change Requests for Stakeholder Demonstration
        from app.database.models import ChangeRequest
        seed_crs = [
            {
                "id": "CR-2026-001",
                "request_type": "MODIFY",
                "doa_id": "225",
                "requester_id": 6,
                "requester_email": "dept.owner@doa.local",
                "department": "Finance",
                "process": "Capital Expenditures & Treasury Operations",
                "rationale": "Department Owner proposal: Aligning Capex expenditure thresholds with updated FY2026 Board Budgetary Delegation and escalating inflation index. Requires Executive Committee sign-off prior to master publication.",
                "base_version": 1,
                "current_value": json.dumps({
                    "id": "225",
                    "parent_function": "Finance",
                    "function": "Finance",
                    "business_line": "Bank Capital and Capital Management",
                    "category": "Bank Capital and Capital Management",
                    "key_non_key": "Key",
                    "decision_area": "Approve annual capital allocation budget and sub-allocation thresholds for core business units",
                    "composite_authority": "BoD (A) ➔ BRPC (E1) ➔ GCFO (R)",
                    "comments": "Subject to annual regulatory capital buffer compliance."
                }),
                "proposed_value": json.dumps({
                    "id": "225",
                    "parent_function": "Finance",
                    "function": "Finance",
                    "business_line": "Bank Capital and Capital Management",
                    "category": "Bank Capital and Capital Management",
                    "key_non_key": "Key",
                    "decision_area": "Approve annual capital allocation budget and revised sub-allocation thresholds up to $50M for tier-1 business units",
                    "composite_authority": "BoD (A) ➔ BRPC (E) ➔ GCEO (E1) ➔ GCFO (R)",
                    "comments": "Expanded sub-allocation limits per Revised Board Risk & Governance Mandate §4.2."
                }),
                "status": "SUBMITTED",
                "operational_impact": "Accelerates business unit procurement SLAs from 14 business days to 5 days without compromising dual-signoff ERP segregation of duties controls in SAP S/4HANA.",
                "attachments": json.dumps([
                    {
                        "name": "Capex_Delegation_Revisions_FY2026.pdf",
                        "size": "1.2 MB",
                        "uploaded_at": "2026-02-10",
                        "type": "Board Resolution Extract"
                    },
                    {
                        "name": "P2P_Operational_Impact_Study.pdf",
                        "size": "680 KB",
                        "uploaded_at": "2026-02-12",
                        "type": "Process Impact Document"
                    }
                ])
            },
            {
                "id": "CR-2026-002",
                "request_type": "MODIFY",
                "doa_id": "233",
                "requester_id": 7,
                "requester_email": "process.owner@doa.local",
                "department": "Supply Chain & Operations",
                "process": "Procure-to-Pay (P2P) & Operational Procurement",
                "rationale": "Process Owner proposal: Modifying vendor engagement threshold matrix in P2P workflow to eradicate SLA processing bottlenecks in Oracle ERP while maintaining segregation of duties.",
                "base_version": 1,
                "current_value": json.dumps({
                    "id": "233",
                    "parent_function": "Risk",
                    "function": "Risk",
                    "business_line": "Credit Risk Management",
                    "category": "Credit Risk Management",
                    "key_non_key": "Key",
                    "decision_area": "Approve single obligor underwriting limit extensions exceeding 15% of regulatory capital",
                    "composite_authority": "BoD (A) ➔ BRC (E) ➔ GCRO (R1)",
                    "comments": "Mandatory Central Bank notification required within 48 hours."
                }),
                "proposed_value": json.dumps({
                    "id": "233",
                    "parent_function": "Risk",
                    "function": "Risk",
                    "business_line": "Credit Risk Management",
                    "category": "Credit Risk Management",
                    "key_non_key": "Key",
                    "decision_area": "Approve single obligor underwriting limit extensions between 15% and 25% of regulatory capital base",
                    "composite_authority": "BoD (A) ➔ BRC (E) ➔ GCRC (E1) ➔ GCRO (R)",
                    "comments": "Includes mandatory Group Credit Risk Committee endorsement per CBR §12."
                }),
                "status": "SUBMITTED",
                "operational_impact": "Procurement cycle streamlined by 4.5 days. 3-way matching automated in SAP Ariba with dual buyer sign-off intact.",
                "attachments": json.dumps([
                    {
                        "name": "P2P_Operational_Bottleneck_Analysis.pdf",
                        "size": "850 KB",
                        "uploaded_at": "2026-02-14",
                        "type": "Process Flow Diagram"
                    }
                ])
            },
            {
                "id": "CR-2026-003",
                "request_type": "ADD",
                "doa_id": None,
                "requester_id": 8,
                "requester_email": "authority.owner@doa.local",
                "department": "Legal & Corporate Governance",
                "process": "Board Governance & Committee Mandates",
                "rationale": "Authority Owner proposal: Formally instituting a new Board Risk & Compliance Committee (BRPC) fast-track delegated authority mandate for emergency risk responses.",
                "base_version": 1,
                "current_value": None,
                "proposed_value": json.dumps({
                    "parent_function": "Risk",
                    "function": "Risk",
                    "business_line": "Enterprise Risk Governance",
                    "category": "Enterprise Risk Governance",
                    "key_non_key": "Key",
                    "decision_area": "Authorize immediate binding remediation actions during systemic market disruption or external cyber emergencies",
                    "composite_authority": "BoD (A) ➔ BRPC (E1) ➔ GCRO (R)",
                    "comments": "Must be reported to Full Board within 7 calendar days."
                }),
                "status": "SUBMITTED",
                "operational_impact": "Permits 2-hour emergency risk mitigation response without convened physical board quorum.",
                "attachments": json.dumps([
                    {
                        "name": "BRPC_Emergency_Powers_Charter.pdf",
                        "size": "1.4 MB",
                        "uploaded_at": "2026-02-18",
                        "type": "Governance Charter Provision"
                    }
                ])
            },
            {
                "id": "CR-2026-004",
                "request_type": "MODIFY",
                "doa_id": "240",
                "requester_id": 9,
                "requester_email": "reviewer@doa.local",
                "department": "Enterprise Risk Management",
                "process": "Regulatory Capital & Credit Review",
                "rationale": "Reviewer Technical Assessment: Reviewed and recommended threshold adjustments for Tier-1 credit facility covenants under Basel IV requirements.",
                "base_version": 1,
                "current_value": json.dumps({
                    "id": "240",
                    "parent_function": "Finance",
                    "function": "Finance",
                    "business_line": "Taxation and Statutory Accounting",
                    "composite_authority": "BoD (A) ➔ GCFO (R)",
                    "comments": "Requires annual external audit certification."
                }),
                "proposed_value": json.dumps({
                    "id": "240",
                    "parent_function": "Finance",
                    "function": "Finance",
                    "business_line": "Taxation and Statutory Accounting",
                    "composite_authority": "GCFO (A) ➔ Head of Tax (R)",
                    "comments": "Board sub-delegated to GCFO for statutory assessments under $25k."
                }),
                "status": "APPROVED",
                "reviewer_id": 10,
                "reviewer_email": "approver@doa.local",
                "decision_comment": "Approved in Executive Committee Session #04/2026. Meets statutory threshold guidelines and 4-eye criteria.",
                "operational_impact": "Reduces minor dispute resolution cycle from 6 weeks to 3 business days.",
                "attachments": json.dumps([])
            },
            {
                "id": "CR-2026-005",
                "request_type": "MODIFY",
                "doa_id": "248",
                "requester_id": 4,
                "requester_email": "user@doa.local",
                "department": "Commercial Operations",
                "process": "Commercial Line Operations",
                "rationale": "Front-End User request: Adjust commercial operational discount cap for corporate account executives from 5% to 8% to match regional benchmark.",
                "base_version": 1,
                "current_value": json.dumps({
                    "id": "248",
                    "parent_function": "Finance",
                    "function": "Finance",
                    "business_line": "Financial Control and Reporting",
                    "category": "Financial Control and Reporting",
                    "key_non_key": "Non-Key",
                    "decision_area": "Approve standard commercial volume discount schedules up to 5%",
                    "composite_authority": "GCFO (A) ➔ Commercial Director (R)",
                    "comments": "Standard annual pricing policy limit."
                }),
                "proposed_value": json.dumps({
                    "id": "248",
                    "parent_function": "Finance",
                    "function": "Finance",
                    "business_line": "Financial Control and Reporting",
                    "category": "Financial Control and Reporting",
                    "key_non_key": "Non-Key",
                    "decision_area": "Approve standard commercial volume discount schedules up to 8% for strategic corporate clients",
                    "composite_authority": "GCFO (A) ➔ Commercial Director (E) ➔ Sales VP (R)",
                    "comments": "Tiered volume discounts aligned with Q3 corporate market push."
                }),
                "status": "SUBMITTED",
                "operational_impact": "Accelerates commercial account onboarding without escalating individual exceptions to the CFO.",
                "attachments": json.dumps([
                    {
                        "name": "Commercial_Pricing_Survey_Q3.pdf",
                        "size": "520 KB",
                        "uploaded_at": "2026-02-20",
                        "type": "Market Analysis Document"
                    }
                ])
            }
        ]

        cr_count = 0
        for cr_data in seed_crs:
            existing_cr = db.query(ChangeRequest).filter(ChangeRequest.id == cr_data["id"]).first()
            if not existing_cr:
                cr_obj = ChangeRequest(**cr_data)
                db.add(cr_obj)
                cr_count += 1
            else:
                for k, v in cr_data.items():
                    setattr(existing_cr, k, v)
        db.commit()
        print(f"[+] Successfully seeded {len(seed_crs)} realistic enterprise Change Requests ({cr_count} new).")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
