import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.security import create_access_token, get_password_hash, verify_password
from app.database import get_db
from app.models.password_reset_token import PasswordResetToken
from app.models.user import AuthProvider, User
from app.schemas.user import (
    ForgotPasswordRequest,
    GoogleLoginRequest,
    MessageResponse,
    ResetPasswordRequest,
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
)
from app.services.email_service import send_password_reset_email, send_welcome_email

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

FORGOT_PASSWORD_MESSAGE = "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé."


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _token_response(user: User) -> TokenResponse:
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=user)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Les mots de passe ne correspondent pas.")

    existing = await db.execute(select(User).where(User.email == payload.email.lower()))
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        auth_provider=AuthProvider.LOCAL,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    background_tasks.add_task(send_welcome_email, user.email, user.full_name)
    return _token_response(user)


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalars().first()
    if not user or not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return _token_response(user)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(payload: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalars().first()

    if user:
        raw_token = secrets.token_urlsafe(48)
        token = PasswordResetToken(
            user_id=user.id,
            token_hash=_hash_token(raw_token),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        )
        db.add(token)
        await db.commit()

        reset_link = f"{settings.frontend_url.rstrip('/')}/reset-password?{urlencode({'token': raw_token})}"
        background_tasks.add_task(send_password_reset_email, user.email, reset_link)
        logger.info("Password reset email queued for %s", user.email)

    return MessageResponse(message=FORGOT_PASSWORD_MESSAGE)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Les mots de passe ne correspondent pas.")

    token_hash = _hash_token(payload.token)
    result = await db.execute(select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash))
    reset_token = result.scalars().first()
    now = datetime.now(timezone.utc)
    expires_at = reset_token.expires_at if reset_token else now
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if not reset_token or reset_token.used_at is not None or expires_at < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lien de réinitialisation invalide ou expiré.")

    user_result = await db.execute(select(User).where(User.id == reset_token.user_id))
    user = user_result.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lien de réinitialisation invalide ou expiré.")

    user.hashed_password = get_password_hash(payload.new_password)
    reset_token.used_at = now

    old_tokens = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.id != reset_token.id,
        )
    )
    for old_token in old_tokens.scalars().all():
        old_token.used_at = now

    await db.commit()
    return MessageResponse(message="Votre mot de passe a été réinitialisé avec succès.")


@router.post("/google", response_model=TokenResponse)
async def google_login(payload: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    audience = settings.google_login_client_id or settings.google_client_id
    if not audience:
        raise HTTPException(status_code=500, detail="Google login is not configured")

    try:
        info = id_token.verify_oauth2_token(payload.id_token, google_requests.Request(), audience)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token") from exc

    email = info.get("email")
    google_id = info.get("sub")
    if not email or not google_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google token missing identity")

    result = await db.execute(select(User).where(User.email == email.lower()))
    user = result.scalars().first()
    if user:
        user.google_id = user.google_id or google_id
        user.avatar_url = info.get("picture") or user.avatar_url
        user.full_name = user.full_name or info.get("name")
    else:
        user = User(
            email=email.lower(),
            full_name=info.get("name"),
            google_id=google_id,
            avatar_url=info.get("picture"),
            auth_provider=AuthProvider.GOOGLE,
        )
        db.add(user)

    await db.commit()
    await db.refresh(user)
    return _token_response(user)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
