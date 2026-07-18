"""
Authentication router: registration, login, logout, and OTP verification.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import uuid

from app.database import get_db
from app.models import User, Session as UserSession
from app.schemas import (
    UserCreate, UserLogin, TokenResponse, OTPRequest, 
    OTPVerify, UserResponse
)
from app.auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, get_current_user_optional
)
from app.config import settings


router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, request: Request, db: Session = Depends(get_db)):
    """
    Register a new user with username, phone, password, and display name.
    OTP verification is mocked (always 123456).
    """
    # Check if username already exists
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | (User.phone_number == user_data.phone_number)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or phone number already registered"
        )
    
    # Create new user
    new_user = User(
        username=user_data.username,
        phone_number=user_data.phone_number,
        display_name=user_data.display_name,
        password_hash=get_password_hash(user_data.password),
        is_online=True,
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create session
    access_token, jti = create_access_token(data={"sub": str(new_user.id)})
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    session = UserSession(
        user_id=new_user.id,
        token_jti=jti,
        device_info=request.headers.get("user-agent", "Unknown"),
        ip_address=request.client.host if request.client else None,
        expires_at=expires_at
    )
    db.add(session)
    db.commit()
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(new_user)
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, request: Request, db: Session = Depends(get_db)):
    """
    Authenticate user with username and password.
    Returns JWT token on success.
    """
    user = db.query(User).filter(User.username == credentials.username).first()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Update online status
    user.is_online = True
    user.last_seen_at = None
    
    # Create session
    access_token, jti = create_access_token(data={"sub": str(user.id)})
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    session = UserSession(
        user_id=user.id,
        token_jti=jti,
        device_info=request.headers.get("user-agent", "Unknown"),
        ip_address=request.client.host if request.client else None,
        expires_at=expires_at
    )
    db.add(session)
    db.commit()
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user)
    )


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Logout current user by revoking their active session.
    Requires authentication.
    """
    # Revoke all active sessions for this user
    db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_active == True
    ).update({"is_active": False})
    
    # Set offline
    current_user.is_online = False
    current_user.last_seen_at = datetime.now(timezone.utc)
    
    db.commit()
    
    return {"message": "Successfully logged out"}


@router.post("/otp/send")
async def send_otp(otp_request: OTPRequest):
    """
    Mock OTP sending. Always returns success.
    In production, this would integrate with SMS provider.
    """
    return {
        "message": "OTP sent successfully",
        "phone_number": otp_request.phone_number,
        "note": "Mock OTP: 123456"
    }


@router.post("/otp/verify")
async def verify_otp(otp_data: OTPVerify):
    """
    Mock OTP verification. Always accepts 123456.
    """
    if otp_data.otp != "123456":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP"
        )
    
    return {
        "verified": True,
        "message": "OTP verified successfully"
    }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user's profile.
    """
    return UserResponse.model_validate(current_user)