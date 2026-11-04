from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import DOARecord, ChangeRequest, User
from app.core.dependencies import get_current_user
from app.core.rbac import apply_doa_read_scope, filter_change_requests_for_user
from app.schemas.schemas import DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["Dashboard KPIs"])

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculates KPI statistics across authorized DOA records and Governance Change Requests."""
    base_doa = apply_doa_read_scope(db.query(DOARecord), current_user)
    pub_doa = base_doa.filter(DOARecord.status == "PUBLISHED")

    total_published = pub_doa.count()
    total_records = base_doa.count()
    key_decisions = pub_doa.filter(DOARecord.key_non_key == "Key").count()
    regulatory_mandated = pub_doa.filter(DOARecord.regulatory == "Y").count()
    
    risk_records = pub_doa.filter(
        (DOARecord.parent_function == "Risk") | (DOARecord.function == "Risk")
    ).count()
    
    finance_records = pub_doa.filter(
        (DOARecord.parent_function == "Finance") | (DOARecord.function == "Finance")
    ).count()

    visible_crs = filter_change_requests_for_user(db, db.query(ChangeRequest).all(), current_user)
    pending_reqs = sum(1 for c in visible_crs if c.status in ["SUBMITTED", "PENDING_PROCESS_OWNER", "PENDING_DEPT_OWNER", "PENDING_2LOD_REVIEW", "UNDER_REVIEW"])
    approved_reqs = sum(1 for c in visible_crs if c.status == "APPROVED")
    rejected_reqs = sum(1 for c in visible_crs if c.status == "REJECTED")
    published_reqs = sum(1 for c in visible_crs if c.status == "PUBLISHED")
    total_reqs = len(visible_crs)

    return DashboardSummary(
        total_published=total_published,
        total_doa_records=total_records,
        key_decisions_count=key_decisions,
        regulatory_mandated_count=regulatory_mandated,
        risk_records_count=risk_records,
        finance_records_count=finance_records,
        pending_requests=pending_reqs,
        approved_requests=approved_reqs,
        rejected_requests=rejected_reqs,
        published_requests=published_reqs,
        total_change_requests=total_reqs
    )
