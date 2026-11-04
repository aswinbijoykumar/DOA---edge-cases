from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import User
from app.core.security import verify_password, create_access_token
from app.core.dependencies import get_current_user
from app.core.rbac import get_user_permissions, get_user_entity_id, get_allowed_domains
from app.schemas.schemas import LoginRequest, Token, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")

    access_token = create_access_token(subject=user.email, role=user.role)
    perms = get_user_permissions(user)
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        persona_type=getattr(user, "persona_type", "FRONTEND_USER"),
        designation=getattr(user, "designation", ""),
        department=getattr(user, "department", ""),
        entity_id=get_user_entity_id(user),
        allowed_domains=",".join(get_allowed_domains(user)),
        permissions=perms
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    perms = get_user_permissions(current_user)
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        persona_type=getattr(current_user, "persona_type", "FRONTEND_USER"),
        designation=getattr(current_user, "designation", ""),
        department=getattr(current_user, "department", ""),
        reports_to=getattr(current_user, "reports_to", ""),
        entity_id=get_user_entity_id(current_user),
        allowed_domains=",".join(get_allowed_domains(current_user)),
        permissions=perms,
        is_active=current_user.is_active
    )
