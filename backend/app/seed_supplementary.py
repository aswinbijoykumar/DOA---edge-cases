from sqlalchemy.orm import Session
from app.database.database import engine, Base, SessionLocal
from app.database.models import DOARecord
from app.database.supplementary_models import (
    AuthoritativeSource,
    ControlledExpenditureLimit,
    LegalEntity,
    CrossGeographyMapping,
    PeriodicCertification,
    GovernanceFinding,
    TemporaryDelegation,
    DecisionAreaSourceLink
)


def seed_supplementary_data(db_session: Session = None):
    """
    Bootstrap initial master data for BRD supplementary requirements:
    1. Authoritative Sources (VAL-01)
    2. Controlled Expenditure Limits (VAL-11)
    3. Legal Entities & Cross-Geography Mappings (Bahrain vs KSA alignment)
    4. Periodic Certifications
    5. Governance Findings
    6. Temporary Delegations
    """
    print("Seeding supplementary BRD data...")
    should_close = False
    if db_session is not None:
        db = db_session
    else:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        should_close = True

    try:
        # 1. Authoritative Sources (VAL-01)
        sources = [
            {
                "id": "SRC-POL-001",
                "name": "Group Treasury & Capital Management Policy",
                "source_type": "Policy",
                "source_owner": "Chief Financial Officer",
                "reference": "POL-TREAS-2026-V2",
                "version": "2.1",
                "effective_date": "2026-01-01",
                "expiry_review_date": "2027-01-01",
                "relevant_clause": "Clause 4.1: Capital Injections & SPV Allocations",
                "jurisdiction": "All"
            },
            {
                "id": "SRC-CHR-001",
                "name": "Board Audit Committee Terms of Reference & Charter",
                "source_type": "Committee Charter",
                "source_owner": "Audit Committee Chairperson",
                "reference": "BAC-CHARTER-2025",
                "version": "3.0",
                "effective_date": "2025-06-01",
                "expiry_review_date": "2027-06-01",
                "relevant_clause": "Section 3.2: Oversight of Statutory Governance & External Audit",
                "jurisdiction": "Bahrain"
            },
            {
                "id": "SRC-REG-001",
                "name": "Central Bank Prudential Governance Code (CBB HC Module)",
                "source_type": "Regulatory Requirement",
                "source_owner": "Head of Compliance",
                "reference": "CBB-HC-MOD-2024",
                "version": "4.2",
                "effective_date": "2024-01-01",
                "expiry_review_date": "2028-01-01",
                "relevant_clause": "HC-1.2.4: Board and Shareholder Reservation of Authority",
                "jurisdiction": "Bahrain"
            },
            {
                "id": "SRC-REG-002",
                "name": "Saudi Central Bank (SAMA) Key Governance Principles",
                "source_type": "Regulatory Requirement",
                "source_owner": "KSA Compliance Officer",
                "reference": "SAMA-GOV-2023",
                "version": "2.0",
                "effective_date": "2023-09-01",
                "expiry_review_date": "2027-09-01",
                "relevant_clause": "Principle 5: Internal Controls and Credit Authority Limits",
                "jurisdiction": "KSA"
            }
        ]

        for s in sources:
            if not db.query(AuthoritativeSource).filter(AuthoritativeSource.id == s["id"]).first():
                db.add(AuthoritativeSource(**s))

        # 2. Controlled Expenditure Limits (VAL-11)
        limits = [
            {
                "id": "LIM-FIN-01",
                "code": "CAPEX_LEVEL_1",
                "name": "Operational Capex Tier 1 (Department Head)",
                "currency": "BHD",
                "amount": 50000.0,
                "category": "Capex",
                "source_reference": "SRC-POL-001 §3.1"
            },
            {
                "id": "LIM-FIN-02",
                "code": "CAPEX_LEVEL_2",
                "name": "Strategic Capex Tier 2 (CFO / GCEO)",
                "currency": "BHD",
                "amount": 250000.0,
                "category": "Capex",
                "source_reference": "SRC-POL-001 §3.2"
            },
            {
                "id": "LIM-FIN-03",
                "code": "OPEX_PROCUREMENT_CEILING",
                "name": "Operational Procurement Tier (VP Operations)",
                "currency": "BHD",
                "amount": 100000.0,
                "category": "Procurement",
                "source_reference": "SRC-POL-001 §4.5"
            },
            {
                "id": "LIM-KSA-01",
                "code": "KSA_CAPEX_TIER_1",
                "name": "KSA Subsidiary Capex Threshold",
                "currency": "SAR",
                "amount": 500000.0,
                "category": "Capex",
                "source_reference": "SRC-REG-002 §2.1"
            }
        ]

        for lim in limits:
            if not db.query(ControlledExpenditureLimit).filter(ControlledExpenditureLimit.id == lim["id"]).first():
                db.add(ControlledExpenditureLimit(**lim))

        # 3. Legal Entities
        entities = [
            {
                "id": "ENT-BH-01",
                "code": "BAHRAIN_HQ",
                "name": "Protiviti Financial Holdings B.S.C. (c)",
                "geography": "Bahrain",
                "currency": "BHD"
            },
            {
                "id": "ENT-KSA-01",
                "code": "KSA_SUBSIDIARY",
                "name": "Protiviti Arabia Financial Co. (KSA)",
                "geography": "KSA",
                "currency": "SAR"
            },
            {
                "id": "ENT-UAE-01",
                "code": "UAE_BRANCH",
                "name": "Protiviti DIFC Branch (UAE)",
                "geography": "UAE",
                "currency": "USD"
            }
        ]

        for ent in entities:
            if not db.query(LegalEntity).filter(LegalEntity.id == ent["id"]).first():
                db.add(LegalEntity(**ent))

        db.flush()

        # Seed a dedicated KSA Subsidiary DOA Record so Bahrain vs KSA entity ownership is demonstrable
        ksa_doa_id = "KSA-225"
        ksa_doa = db.query(DOARecord).filter(DOARecord.id == ksa_doa_id).first()
        if not ksa_doa:
            ksa_doa = DOARecord(
                id=ksa_doa_id,
                parent_function="Finance",
                function="Finance",
                business_line="Bank Capital and Capital Management",
                category="Bank Capital and Capital Management",
                key_non_key="Key",
                decision_area="KSA Subsidiary: Approve local capital expenditure & branch procurement up to SAR 500,000",
                subsidiary_board="A",
                ceo="E",
                c_level1="R",
                composite_authority="Subsidiary Board (A) ➔ KSA CEO (E) ➔ KSA Finance Head (R)",
                regulatory="Y",
                policy_reference="SAMA Governance Principles §2.1",
                charter_section="KSA Subsidiary Charter Article 4",
                regulatory_requirement="SAMA-GOV-2023 Principle 5",
                process_name="KSA Capital Expenditures",
                entity_id="ENT-KSA-01",
                classification="Board-level DOA",
                current_version=1,
                status="PUBLISHED",
                effective_date="2026-01-01",
                review_date="2027-01-01",
                created_by="admin@doa.local"
            )
            db.add(ksa_doa)
            db.flush()

        # 4. Cross-Geography Alignment Mappings (Bahrain vs KSA Acceptance Criteria)
        first_doa = db.query(DOARecord).filter(DOARecord.id != ksa_doa_id).first()
        first_id = first_doa.id if first_doa else "225"

        second_doa = db.query(DOARecord).filter(DOARecord.id != ksa_doa_id).offset(1).first()
        second_id = second_doa.id if second_doa else "226"

        third_doa = db.query(DOARecord).filter(DOARecord.id != ksa_doa_id).offset(2).first()
        third_id = third_doa.id if third_doa else "227"

        mappings = [
            {
                "decision_area_code": "BANK_CAPITAL_ALLOC",
                "source_entity_id": "ENT-BH-01",
                "source_doa_id": first_id,
                "target_entity_id": "ENT-KSA-01",
                "target_doa_id": first_id,
                "match_status": "COMPLETE_MATCH",
                "mismatch_reasons": "[]",
                "required_alignment_outcome": "Complete alignment across Bahrain and KSA entities."
            },
            {
                "decision_area_code": "CAPEX_PROCUREMENT_APPROVAL",
                "source_entity_id": "ENT-BH-01",
                "source_doa_id": second_id,
                "target_entity_id": "ENT-KSA-01",
                "target_doa_id": ksa_doa_id,
                "match_status": "MISMATCH",
                "mismatch_reasons": '["AUTHORITY_TIER_DIFF", "THRESHOLD_DIFF"]',
                "required_alignment_outcome": "Harmonize threshold: Bahrain uses BHD 50k (BoD), KSA requires SAR 500k with local Subsidiary Board signoff."
            },
            {
                "decision_area_code": "SPECIAL_ASSETS_RECOVERY",
                "source_entity_id": "ENT-BH-01",
                "source_doa_id": third_id,
                "target_entity_id": "ENT-KSA-01",
                "target_doa_id": None,
                "match_status": "NOT_MAPPED",
                "mismatch_reasons": '["MISSING_IN_TARGET_GEOGRAPHY"]',
                "required_alignment_outcome": "Formally create matching Special Assets rule in KSA subsidiary matrix."
            }
        ]

        for m in mappings:
            existing_m = db.query(CrossGeographyMapping).filter(
                CrossGeographyMapping.decision_area_code == m["decision_area_code"],
                CrossGeographyMapping.source_entity_id == m["source_entity_id"],
                CrossGeographyMapping.target_entity_id == m["target_entity_id"]
            ).first()
            if not existing_m:
                db.add(CrossGeographyMapping(**m))
            else:
                existing_m.target_doa_id = m["target_doa_id"]
                existing_m.match_status = m["match_status"]
                existing_m.mismatch_reasons = m["mismatch_reasons"]
                existing_m.required_alignment_outcome = m["required_alignment_outcome"]

        # 5. Link Source to First DOA
        if first_doa:
            if not db.query(DecisionAreaSourceLink).filter(DecisionAreaSourceLink.doa_id == first_doa.id).first():
                db.add(DecisionAreaSourceLink(
                    doa_id=first_doa.id,
                    source_id="SRC-POL-001",
                    source_owner="Chief Financial Officer",
                    reference="POL-TREAS-2026-V2",
                    version="2.1",
                    effective_date="2026-01-01",
                    relevant_clause="Clause 4.1"
                ))

        # 6. Periodic Certifications (Section 5)
        if first_doa:
            if not db.query(PeriodicCertification).filter(PeriodicCertification.doa_id == first_doa.id).first():
                db.add(PeriodicCertification(
                    doa_id=first_doa.id,
                    cycle_year=2026,
                    cycle_quarter="Q1",
                    designated_owner_email="dept.owner@doa.local",
                    status="PENDING_OWNER",
                    due_date="2026-03-31"
                ))

        # 7. Temporary Delegation (Section 4.4)
        if not db.query(TemporaryDelegation).first():
            db.add(TemporaryDelegation(
                id="DEL-0001",
                delegator_email="dept.owner@doa.local",
                delegator_designation="Head of Finance",
                recipient_email="user@doa.local",
                recipient_designation="Senior Finance Analyst",
                start_date="2026-03-01",
                end_date="2026-03-15",
                scope="Approve routine operational disbursements up to BHD 10,000 during annual leave.",
                authority_ceiling="BHD 10,000",
                reason="Annual Leave Coverage",
                approved_by_email="admin@doa.local",
                approval_record="Approved by Chief Delegation Officer on 2026-02-28",
                is_active=True
            ))

        db.commit()
        print("[+] Supplementary BRD master data seeded successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding supplementary data: {e}")
        raise e
    finally:
        if should_close:
            db.close()


if __name__ == "__main__":
    seed_supplementary_data()
