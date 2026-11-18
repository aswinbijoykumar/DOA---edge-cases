from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
import secrets
from datetime import datetime, timedelta, timezone
from app.database.models import User, PasswordResetToken
from app.core.security import verify_password, create_access_token, get_password_hash
from app.core.dependencies import get_current_user
from app.core.rbac import get_user_permissions, get_user_entity_id, get_allowed_domains
from app.schemas.schemas import (
    LoginRequest, Token, UserResponse,
    ForgotPasswordRequest, ForgotPasswordResponse,
    VerifyOtpRequest, VerifyOtpResponse,
    ResetPasswordRequest, ResetPasswordResponse
)

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



@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account associated with this work email was found."
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is currently inactive. Contact your system administrator."
        )

    # Invalidate previous unused OTPs for this email
    db.query(PasswordResetToken).filter(
        PasswordResetToken.email == email,
        PasswordResetToken.is_used == False
    ).update({"is_used": True})

    otp = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    reset_record = PasswordResetToken(
        user_id=user.id,
        email=email,
        otp=otp,
        expires_at=expires_at,
        is_used=False
    )
    db.add(reset_record)
    db.commit()

    print(f"\n[AUTH-DEV] Password reset verification OTP for {email}: {otp}\n")

    return ForgotPasswordResponse(
        message=f"Verification code sent to {email}",
        email=email,
        dev_otp=otp
    )


@router.post("/verify-otp", response_model=VerifyOtpResponse)
def verify_otp(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    otp_code = req.otp.strip()

    record = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.email == email,
            PasswordResetToken.otp == otp_code,
            PasswordResetToken.is_used == False
        )
        .order_by(PasswordResetToken.id.desc())
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please check and try again."
        )

    now_utc = datetime.now(timezone.utc)
    rec_exp = record.expires_at
    if rec_exp.tzinfo is None:
        rec_exp = rec_exp.replace(tzinfo=timezone.utc)

    if rec_exp < now_utc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new code."
        )

    reset_token = secrets.token_urlsafe(32)
    record.reset_token = reset_token
    db.commit()

    return VerifyOtpResponse(
        message="Verification code validated successfully.",
        reset_token=reset_token
    )


@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    reset_token = req.reset_token.strip()
    new_password = req.new_password

    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    record = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.email == email,
            PasswordResetToken.reset_token == reset_token,
            PasswordResetToken.is_used == False
        )
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset session. Please request a new code."
        )

    now_utc = datetime.now(timezone.utc)
    rec_exp = record.expires_at
    if rec_exp.tzinfo is None:
        rec_exp = rec_exp.replace(tzinfo=timezone.utc)

    if rec_exp < now_utc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset session has expired. Please request a new code."
        )

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    user.hashed_password = get_password_hash(new_password)
    record.is_used = True
    db.commit()

    return ResetPasswordResponse(
        message="Password has been reset successfully. You may now sign in.",
        success=True
    )
