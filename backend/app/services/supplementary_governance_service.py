import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
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
from app.core.rbac import (
    apply_doa_read_scope,
    assert_can_read_doa,
    can_user_read_doa,
    get_user_permissions,
    normalize_entity_code,
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

            finding_id = f"FND-SRC-{doa.id}-{int(datetime.now(timezone.utc).timestamp()) % 10000}"
            finding = GovernanceFinding(
                id=finding_id,
                finding_type="SOURCE_CHANGE_DRIFT",
                severity="HIGH",
                doa_id=doa.id,
                owner_email=admin_user.email,
                description=f"Authoritative source '{source.name}' ({source.id}) was amended. Decision area requires impact review.",
                status="OPEN"
            )
            db.add(finding)

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
    target_entity_id: str,
    current_user: Optional[User] = None,
) -> CrossGeographyCompareResponse:
    """
    Acceptance Criteria: Cross-geography comparison returns one clear result
    and preserves it in the request record, scoped to the user's authorized domain.
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

    if current_user is not None and src_doa is not None:
        assert_can_read_doa(src_doa, current_user)

    mismatch_reasons = []
    match_status = "COMPLETE_MATCH"
    outcome = "Harmonized across regional jurisdictions."

    if not tgt_doa:
        match_status = "NOT_MAPPED"
        mismatch_reasons.append("MISSING_IN_TARGET_GEOGRAPHY")
        outcome = f"Requires creation of matching decision area in {tgt_geo} subsidiary."
    else:
        if src_doa and src_doa.composite_authority != tgt_doa.composite_authority:
            match_status = "MISMATCH"
            mismatch_reasons.append("AUTHORITY_TIER_DIFF")
            outcome = f"Harmonize authority tiers between {src_geo} ({src_doa.composite_authority}) and {tgt_geo} ({tgt_doa.composite_authority})."

        if src_doa and src_doa.regulatory != tgt_doa.regulatory:
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


def generate_bahrain_ksa_alignment_report(
    db: Session,
    current_user: Optional[User] = None,
) -> BahrainKsaAlignmentReportResponse:
    """
    Acceptance Criteria:
    The Bahrain–KSA alignment report must reconcile to underlying mapped decision areas,
    separate complete matches from mismatches, identify every applicable mismatch reason,
    and record required alignment outcome for each mismatched item (scoped to user domain).
    """
    mappings = db.query(CrossGeographyMapping).all()
    records = []
    complete_matches_list = []
    mismatches_list = []
    complete_matches = 0
    mismatches = 0
    not_mapped = 0

    for m in mappings:
        src_doa = db.query(DOARecord).filter(DOARecord.id == m.source_doa_id).first()
        if current_user is not None and src_doa is not None and not can_user_read_doa(src_doa, current_user):
            continue

        tgt_doa = db.query(DOARecord).filter(DOARecord.id == m.target_doa_id).first() if m.target_doa_id else None
        reasons = json.loads(m.mismatch_reasons or "[]")

        item = {
            "mapping_id": m.id,
            "decision_area_code": m.decision_area_code,
            "decision_area_name": src_doa.decision_area if src_doa else "Unknown",
            "decision_area_title": src_doa.decision_area if src_doa else m.decision_area_code,
            "category": (src_doa.business_line or src_doa.parent_function) if src_doa else "General",
            "source_geography": "Bahrain",
            "source_authority": src_doa.composite_authority if src_doa else "-",
            "bahrain_doa_id": m.source_doa_id,
            "bahrain_authority_summary": src_doa.composite_authority if src_doa else "-",
            "target_geography": "KSA",
            "target_authority": tgt_doa.composite_authority if tgt_doa else "MISSING IN KSA",
            "ksa_doa_id": m.target_doa_id,
            "ksa_authority_summary": tgt_doa.composite_authority if tgt_doa else "MISSING IN KSA",
            "match_status": m.match_status,
            "mismatch_reasons": reasons,
            "required_alignment_outcome": m.required_alignment_outcome or "No action required",
            "last_compared_at": m.last_compared_at.isoformat() if m.last_compared_at else None
        }
        records.append(item)

        if m.match_status == "COMPLETE_MATCH":
            complete_matches += 1
            complete_matches_list.append(item)
        elif m.match_status == "MISMATCH":
            mismatches += 1
            mismatches_list.append(item)
        else:
            not_mapped += 1
            mismatches_list.append(item)

    total = len(records)
    pct = round((complete_matches / total) * 100) if total > 0 else 100

    return BahrainKsaAlignmentReportResponse(
        report_title="Bahrain–KSA Cross-Geography Governance Alignment Report",
        generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        alignment_percentage=pct,
        total_decision_areas_mapped=total,
        complete_matches_count=complete_matches,
        mismatches_count=mismatches,
        not_mapped_count=not_mapped,
        complete_matches=complete_matches_list,
        mismatches=mismatches_list,
        alignment_records=records
    )


# -----------------------------------------------------------------------------
# 3. Point-in-Time Reconstruction (Section 5)
# -----------------------------------------------------------------------------
def _reconstruct_single_doa(db: Session, doa: DOARecord, target_date: str) -> Dict[str, Any]:
    versions = db.query(DOAVersion).filter(
        DOAVersion.doa_id == doa.id
    ).order_by(DOAVersion.version_number.desc()).all()

    effective_snap = None
    effective_ver = None
    status_at_date = "HISTORICAL"

    for v in versions:
        v_eff = v.effective_date or (v.created_at.strftime("%Y-%m-%d") if v.created_at else "2026-01-01")
        if v_eff <= target_date:
            effective_snap = json.loads(v.snapshot)
            effective_ver = v.version_number
            status_at_date = v.status
            break

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
            "current_version": doa.current_version,
            "entity_id": getattr(doa, "entity_id", "ENT-BH-01"),
            "effective_date": current_eff,
        }
        effective_ver = doa.current_version
        status_at_date = doa.status

    links = db.query(DecisionAreaSourceLink).filter(DecisionAreaSourceLink.doa_id == doa.id).all()
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

    return {
        "doa": doa,
        "snapshot": effective_snap,
        "version": effective_ver,
        "status": status_at_date,
        "sources": source_info,
    }


def reconstruct_point_in_time_doa(
    db: Session,
    doa_id: Optional[str],
    target_date: str,
    entity_filter: Optional[str] = None,
    current_user: Optional[User] = None,
) -> PointInTimeReconstructResponse:
    """
    Section 5: Support point-in-time reconstruction of the DOA (single DOA or portfolio by entity/date),
    strictly respecting the user's authorized domain visibility.
    """
    entity_scope_label = entity_filter or "ALL"

    if doa_id:
        doa = db.query(DOARecord).filter(DOARecord.id == doa_id).first()
        if not doa:
            raise HTTPException(status_code=404, detail=f"DOA Record {doa_id} not found")
        if current_user is not None:
            assert_can_read_doa(doa, current_user)

        rec_data = _reconstruct_single_doa(db, doa, target_date)
        snap = rec_data["snapshot"]
        row_item = {
            "id": doa.id,
            "doa_id": doa.id,
            "decision_area": snap.get("decision_area", doa.decision_area),
            "parent_function": snap.get("parent_function", doa.parent_function),
            "business_line": snap.get("business_line", doa.business_line),
            "composite_authority": snap.get("composite_authority", doa.composite_authority),
            "version": rec_data["version"],
            "effective_date": snap.get("effective_date") or doa.effective_date or "2026-01-01",
            "authoritative_source_refs": [s["reference"] for s in rec_data["sources"]],
        }
        return PointInTimeReconstructResponse(
            doa_id=doa_id,
            selected_date=target_date,
            target_date=target_date,
            entity_scope=entity_scope_label,
            effective_version=rec_data["version"],
            status_at_date=rec_data["status"],
            record_snapshot=snap,
            active_governance_pathway=snap.get("composite_authority", doa.composite_authority),
            linked_authoritative_sources=rec_data["sources"],
            total_records_effective=1,
            effective_records=[row_item],
        )

    # Portfolio reconstruction across authorized DOA records
    q = db.query(DOARecord).filter(DOARecord.status == "PUBLISHED")
    if current_user is not None:
        q = apply_doa_read_scope(q, current_user)

    if entity_filter and entity_filter.upper() != "ALL":
        norm_ent = normalize_entity_code(entity_filter)
        q = q.filter(DOARecord.entity_id == norm_ent)

    doas = q.limit(100).all()
    effective_records = []
    for d in doas:
        eff_dt = d.effective_date or "2026-01-01"
        if eff_dt <= target_date:
            rec_data = _reconstruct_single_doa(db, d, target_date)
            snap = rec_data["snapshot"]
            effective_records.append({
                "id": d.id,
                "doa_id": d.id,
                "decision_area": snap.get("decision_area", d.decision_area),
                "parent_function": snap.get("parent_function", d.parent_function),
                "business_line": snap.get("business_line", d.business_line),
                "composite_authority": snap.get("composite_authority", d.composite_authority),
                "version": rec_data["version"],
                "effective_date": snap.get("effective_date") or eff_dt,
                "authoritative_source_refs": [s["reference"] for s in rec_data["sources"]],
            })

    return PointInTimeReconstructResponse(
        doa_id=None,
        selected_date=target_date,
        target_date=target_date,
        entity_scope=entity_scope_label,
        effective_version=None,
        status_at_date="PUBLISHED",
        record_snapshot=effective_records[0] if effective_records else None,
        active_governance_pathway=effective_records[0]["composite_authority"] if effective_records else None,
        linked_authoritative_sources=[],
        total_records_effective=len(effective_records),
        effective_records=effective_records,
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
    Enforces actor permissions and Segregation of Duties between owner certification and governance signoff.
    """
    perms = get_user_permissions(current_user)
    if perms["is_read_only"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Read-Only Role Violation: User cannot execute periodic certification sign-offs."
        )

    cert = db.query(PeriodicCertification).filter(PeriodicCertification.id == certification_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certification record not found")

    is_admin = current_user.role in ["ADMIN", "DOA_ADMINISTRATOR"]

    if cert.status == "PENDING_OWNER":
        is_designated_owner = bool(
            cert.designated_owner_email
            and cert.designated_owner_email.lower() == (current_user.email or "").lower()
        )
        is_dept_owner = current_user.role == "NORMAL_USER" and current_user.persona_type == "DEPT_OWNER"
        if not (is_designated_owner or is_dept_owner or is_admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the designated Decision Area Owner or Department Head may certify at PENDING_OWNER stage."
            )
        if cert.doa_id and not is_admin:
            doa = db.query(DOARecord).filter(DOARecord.id == cert.doa_id).first()
            if doa:
                assert_can_read_doa(doa, current_user)

        cert.owner_certified_at = datetime.now(timezone.utc)
        cert.owner_comments = comments
        cert.designated_owner_email = current_user.email
        cert.status = "PENDING_GOVERNANCE" if decision == "CERTIFIED" else decision

    elif cert.status == "PENDING_GOVERNANCE":
        if current_user.role not in ["ADMIN", "DOA_ADMINISTRATOR", "GOVERNANCE_TEAM"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only DOA Governance Team or DOA Administrator may confirm certification at PENDING_GOVERNANCE stage."
            )
        if (
            not is_admin
            and cert.designated_owner_email
            and cert.designated_owner_email.lower() == (current_user.email or "").lower()
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Segregation of Duties Violation: The same user cannot act as both Designated Owner and Governance Certifier."
            )
        cert.governance_confirmed_at = datetime.now(timezone.utc)
        cert.governance_reviewer_id = current_user.id
        cert.governance_decision = decision
        cert.status = "CERTIFIED" if decision == "CERTIFIED" else decision

    else:
        raise HTTPException(status_code=400, detail=f"Certification is already in terminal/inactive state '{cert.status}'")

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
