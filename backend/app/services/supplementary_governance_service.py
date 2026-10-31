import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.database.models import DOARecord, User, DOAVersion
from app.database.supplementary_models import (
    AuthoritativeSource,
    DecisionAreaSourceLink,
    LegalEntity,
    CrossGeographyMapping,
    PeriodicCertification,
    GovernanceFinding,
    TemporaryDelegation
)
from app.schemas.supplementary_schemas import (
    CrossGeographyCompareResponse,
    BahrainKsaAlignmentReportResponse,
    PointInTimeReconstructResponse
)
from app.services.audit_service import log_audit

# -----------------------------------------------------------------------------
# 1. Authoritative Source Management & Change Impact Assessment (VAL-01)
# -----------------------------------------------------------------------------
def trigger_source_change_impact(
    db: Session,
    source_id: str,
    admin_user: User
) -> Dict[str, Any]:
    """
    VAL-01: A source change shall flag linked decision areas for impact review
    and shall identify any authority differing from the current source.
    """
    source = db.query(AuthoritativeSource).filter(AuthoritativeSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail=f"Authoritative Source {source_id} not found")

    links = db.query(DecisionAreaSourceLink).filter(DecisionAreaSourceLink.source_id == source_id).all()
    impacted_doas = []

    for l in links:
        l.impact_review_required = True
        doa = db.query(DOARecord).filter(DOARecord.id == l.doa_id).first()
        if doa:
            impacted_doas.append({
                "doa_id": doa.id,
                "decision_area": doa.decision_area,
                "current_composite_authority": doa.composite_authority,
                "parent_function": doa.parent_function,
                "linked_clause": l.relevant_clause or source.relevant_clause,
                "flagged_for_impact_review": True
            })

    db.flush()
    log_audit(
        db=db,
        user_id=admin_user.id,
        user_email=admin_user.email,
        role=admin_user.role,
        action="SOURCE_CHANGE_IMPACT_TRIGGERED",
        entity="AUTHORITATIVE_SOURCE",
        record_id=source.id,
        new_value={"impacted_count": len(impacted_doas)},
        comment=f"Source {source.id} changed. Flagged {len(impacted_doas)} linked decision areas for impact review."
    )
    db.commit()

    return {
        "source_id": source.id,
        "source_name": source.name,
        "flagged_decision_areas_count": len(impacted_doas),
        "impacted_decision_areas": impacted_doas
    }

# -----------------------------------------------------------------------------
# 2. Cross-Geography Comparison & Bahrain–KSA Alignment (Section 4.4 & Criteria)
# -----------------------------------------------------------------------------
def compare_cross_geography_decision_areas(
    db: Session,
    decision_area_code: str,
    source_entity_id: str,
    target_entity_id: str
) -> CrossGeographyCompareResponse:
    """
    Acceptance Criteria: Cross-geography comparison returns one clear result
    and preserves it in the request record.
    """
    src_entity = db.query(LegalEntity).filter(LegalEntity.id == source_entity_id).first()
    tgt_entity = db.query(LegalEntity).filter(LegalEntity.id == target_entity_id).first()

    src_geo = src_entity.geography if src_entity else "Bahrain"
    tgt_geo = tgt_entity.geography if tgt_entity else "KSA"

    mapping = db.query(CrossGeographyMapping).filter(
        CrossGeographyMapping.decision_area_code == decision_area_code,
        CrossGeographyMapping.source_entity_id == source_entity_id,
        CrossGeographyMapping.target_entity_id == target_entity_id
    ).first()

    src_doa = db.query(DOARecord).filter(DOARecord.id == mapping.source_doa_id).first() if mapping else None
    tgt_doa = db.query(DOARecord).filter(DOARecord.id == mapping.target_doa_id).first() if (mapping and mapping.target_doa_id) else None

    # Determine mismatch reasons
    mismatch_reasons = []
    match_status = "COMPLETE_MATCH"
    outcome = "Harmonized across regional jurisdictions."

    if not tgt_doa:
        match_status = "NOT_MAPPED"
        mismatch_reasons.append("MISSING_IN_TARGET_GEOGRAPHY")
        outcome = f"Requires creation of matching decision area in {tgt_geo} subsidiary."
    else:
        # Check authority tier differences
        if src_doa.composite_authority != tgt_doa.composite_authority:
            match_status = "MISMATCH"
            mismatch_reasons.append("AUTHORITY_TIER_DIFF")
            outcome = f"Harmonize authority tiers between {src_geo} ({src_doa.composite_authority}) and {tgt_geo} ({tgt_doa.composite_authority})."
        
        # Check regulatory mandates
        if src_doa.regulatory != tgt_doa.regulatory:
            match_status = "MISMATCH"
            mismatch_reasons.append("REGULATORY_DIFF")
            outcome += f" Accommodate statutory difference: {src_geo} regulatory flag is {src_doa.regulatory}, {tgt_geo} is {tgt_doa.regulatory}."

    return CrossGeographyCompareResponse(
        decision_area_code=decision_area_code,
        source_geography=src_geo,
        target_geography=tgt_geo,
        match_status=match_status,
        source_record={
            "id": src_doa.id,
            "decision_area": src_doa.decision_area,
            "composite_authority": src_doa.composite_authority,
            "regulatory": src_doa.regulatory
        } if src_doa else None,
        target_record={
            "id": tgt_doa.id,
            "decision_area": tgt_doa.decision_area,
            "composite_authority": tgt_doa.composite_authority,
            "regulatory": tgt_doa.regulatory
        } if tgt_doa else None,
        mismatch_reasons=mismatch_reasons,
        required_alignment_outcome=outcome,
        timestamp=datetime.now(timezone.utc).isoformat()
    )

def generate_bahrain_ksa_alignment_report(db: Session) -> BahrainKsaAlignmentReportResponse:
    """
    Acceptance Criteria:
    The Bahrain–KSA alignment report must reconcile to underlying mapped decision areas,
    separate complete matches from mismatches, identify every applicable mismatch reason,
    and record required alignment outcome for each mismatched item.
    """
    mappings = db.query(CrossGeographyMapping).all()
    records = []
    complete_matches = 0
    mismatches = 0
    not_mapped = 0

    for m in mappings:
        src_doa = db.query(DOARecord).filter(DOARecord.id == m.source_doa_id).first()
        tgt_doa = db.query(DOARecord).filter(DOARecord.id == m.target_doa_id).first() if m.target_doa_id else None

        reasons = json.loads(m.mismatch_reasons or "[]")
        if m.match_status == "COMPLETE_MATCH":
            complete_matches += 1
        elif m.match_status == "MISMATCH":
            mismatches += 1
        else:
            not_mapped += 1

        records.append({
            "mapping_id": m.id,
            "decision_area_code": m.decision_area_code,
            "decision_area_name": src_doa.decision_area if src_doa else "Unknown",
            "source_geography": "Bahrain",
            "source_authority": src_doa.composite_authority if src_doa else "-",
            "target_geography": "KSA",
            "target_authority": tgt_doa.composite_authority if tgt_doa else "MISSING IN KSA",
            "match_status": m.match_status,
            "mismatch_reasons": reasons,
            "required_alignment_outcome": m.required_alignment_outcome or "No action required",
            "last_compared_at": m.last_compared_at.isoformat() if m.last_compared_at else None
        })

    return BahrainKsaAlignmentReportResponse(
        report_title="Bahrain–KSA Cross-Geography Governance Alignment Report",
        total_decision_areas_mapped=len(mappings),
        complete_matches_count=complete_matches,
        mismatches_count=mismatches,
        not_mapped_count=not_mapped,
        alignment_records=records
    )

# -----------------------------------------------------------------------------
# 3. Point-in-Time Reconstruction (Section 5)
# -----------------------------------------------------------------------------
def reconstruct_point_in_time_doa(
    db: Session,
    doa_id: str,
    target_date: str
) -> PointInTimeReconstructResponse:
    """
    Section 5: Support point-in-time reconstruction of the DOA.
    Choose a historical date and view decision area, applicable authority holders,
    limits, conditions, entity, governance pathway, source documents, and version effective on that date.
    """
    doa = db.query(DOARecord).filter(DOARecord.id == doa_id).first()
    if not doa:
        raise HTTPException(status_code=404, detail=f"DOA Record {doa_id} not found")

    # Search in historical snapshots (doa_versions)
    versions = db.query(DOAVersion).filter(
        DOAVersion.doa_id == doa_id
    ).order_by(DOAVersion.version_number.desc()).all()

    effective_snap = None
    effective_ver = None
    status_at_date = "HISTORICAL"

    # Find snapshot effective on or immediately prior to target_date
    for v in versions:
        v_eff = v.effective_date or (v.created_at.strftime("%Y-%m-%d") if v.created_at else "2026-01-01")
        if v_eff <= target_date:
            effective_snap = json.loads(v.snapshot)
            effective_ver = v.version_number
            status_at_date = v.status
            break

    # If target date is current/future and current_version applies
    current_eff = doa.effective_date or "2026-01-01"
    if not effective_snap or target_date >= current_eff:
        effective_snap = {
            "id": doa.id,
            "decision_area": doa.decision_area,
            "parent_function": doa.parent_function,
            "business_line": doa.business_line,
            "composite_authority": doa.composite_authority,
            "key_non_key": doa.key_non_key,
            "regulatory": doa.regulatory,
            "policy_reference": doa.policy_reference,
            "charter_section": doa.charter_section,
            "current_version": doa.current_version
        }
        effective_ver = doa.current_version
        status_at_date = doa.status

    # Linked authoritative sources
    links = db.query(DecisionAreaSourceLink).filter(DecisionAreaSourceLink.doa_id == doa_id).all()
    source_info = []
    for l in links:
        s = db.query(AuthoritativeSource).filter(AuthoritativeSource.id == l.source_id).first()
        if s:
            source_info.append({
                "source_id": s.id,
                "name": s.name,
                "type": s.source_type,
                "owner": s.source_owner,
                "reference": s.reference,
                "version": s.version,
                "clause": l.relevant_clause or s.relevant_clause
            })

    return PointInTimeReconstructResponse(
        doa_id=doa_id,
        selected_date=target_date,
        effective_version=effective_ver,
        status_at_date=status_at_date,
        record_snapshot=effective_snap,
        active_governance_pathway=effective_snap.get("composite_authority", doa.composite_authority),
        linked_authoritative_sources=source_info
    )

# -----------------------------------------------------------------------------
# 4. Periodic Certification Workflow (Section 5)
# -----------------------------------------------------------------------------
def process_periodic_certification(
    db: Session,
    certification_id: int,
    decision: str,
    comments: str,
    current_user: User
) -> PeriodicCertification:
    """
    Section 5: Support configurable periodic certification by designated owner and Governance Team.
    """
    cert = db.query(PeriodicCertification).filter(PeriodicCertification.id == certification_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certification record not found")

    if cert.status == "PENDING_OWNER":
        cert.owner_certified_at = datetime.now(timezone.utc)
        cert.owner_comments = comments
        cert.status = "PENDING_GOVERNANCE" if decision == "CERTIFIED" else decision
    elif cert.status == "PENDING_GOVERNANCE":
        cert.governance_confirmed_at = datetime.now(timezone.utc)
        cert.governance_reviewer_id = current_user.id
        cert.governance_decision = decision
        cert.status = "CERTIFIED" if decision == "CERTIFIED" else decision

    db.flush()
    log_audit(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        role=current_user.role,
        action=f"CERTIFICATION_{decision}",
        entity="PERIODIC_CERTIFICATION",
        record_id=str(cert.id),
        comment=f"Periodic certification for DOA #{cert.doa_id}: {decision}. Remarks: {comments}"
    )
    db.commit()
    db.refresh(cert)
    return cert
