from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.database import get_db
from app.database.models import DOARecord, ChangeRequest, User
from app.core.dependencies import get_current_user
from app.schemas.schemas import DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["Dashboard KPIs"])

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculates KPI statistics across DOA records and Governance Change Requests."""
    total_published = db.query(DOARecord).filter(DOARecord.status == "PUBLISHED").count()
    total_records = db.query(DOARecord).count()
    key_decisions = db.query(DOARecord).filter(DOARecord.status == "PUBLISHED", DOARecord.key_non_key == "Key").count()
    regulatory_mandated = db.query(DOARecord).filter(DOARecord.status == "PUBLISHED", DOARecord.regulatory == "Y").count()
    
    risk_records = db.query(DOARecord).filter(
        DOARecord.status == "PUBLISHED",
        (DOARecord.parent_function == "Risk") | (DOARecord.function == "Risk")
    ).count()
    
    finance_records = db.query(DOARecord).filter(
        DOARecord.status == "PUBLISHED",
        (DOARecord.parent_function == "Finance") | (DOARecord.function == "Finance")
    ).count()

    pending_reqs = db.query(ChangeRequest).filter(ChangeRequest.status == "SUBMITTED").count()
    approved_reqs = db.query(ChangeRequest).filter(ChangeRequest.status == "APPROVED").count()
    rejected_reqs = db.query(ChangeRequest).filter(ChangeRequest.status == "REJECTED").count()
    published_reqs = db.query(ChangeRequest).filter(ChangeRequest.status == "PUBLISHED").count()
    total_reqs = db.query(ChangeRequest).count()

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
