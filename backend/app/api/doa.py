from typing import List, Optional
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import User, DOAVersion
from app.core.dependencies import get_current_user, require_admin
from app.schemas.schemas import DOARead, DOACreate, DOAVersionRead
from app.services import doa_service

router = APIRouter(prefix="/doa", tags=["DOA Master Repository"])

@router.get("", response_model=List[DOARead])
def list_doa_records(
    parent_function: Optional[str] = Query(None),
    business_line: Optional[str] = Query(None),
    status: Optional[str] = Query("PUBLISHED"),
    search: Optional[str] = Query(None),
    key_non_key: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(250, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve filtered DOA master records. Accessible to both Admin and Normal Users."""
    return doa_service.get_doa_records(
        db=db,
        parent_function=parent_function,
        business_line=business_line,
        status=status,
        search=search,
        key_non_key=key_non_key,
        skip=skip,
        limit=limit
    )

@router.get("/{record_id}", response_model=DOARead)
def get_doa_record(
    record_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rec = doa_service.get_doa_by_id(db, record_id)
    if not rec:
        raise HTTPException(status_code=404, detail="DOA record not found")
    return rec

@router.get("/{record_id}/versions", response_model=List[DOAVersionRead])
def get_doa_versions(
    record_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve full version snapshots (historical and current) for a DOA record."""
    rec = doa_service.get_doa_by_id(db, record_id)
    if not rec:
        raise HTTPException(status_code=404, detail="DOA record not found")
        
    versions = (
        db.query(DOAVersion)
        .filter(DOAVersion.doa_id == record_id)
        .order_by(DOAVersion.version_number.desc())
        .all()
    )
    
    result = []
    for v in versions:
        result.append(
            DOAVersionRead(
                id=v.id,
                doa_id=v.doa_id,
                version_number=v.version_number,
                status=v.status,
                effective_date=v.effective_date,
                snapshot=json.loads(v.snapshot) if v.snapshot else {},
                change_request_id=v.change_request_id,
                created_by=v.created_by,
                created_at=v.created_at
            )
        )
    return result

@router.post("", response_model=DOARead)
def create_doa_record(
    payload: DOACreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Admin-only direct creation of master DOA record"""
    return doa_service.create_direct_doa_record(db, payload, admin_user.email)

@router.post("/{record_id}/archive", response_model=DOARead)
def archive_doa(
    record_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Admin-only archiving of published DOA record"""
    rec = doa_service.archive_doa_record(db, record_id, admin_user.email)
    if not rec:
        raise HTTPException(status_code=404, detail="DOA record not found")
    return rec
