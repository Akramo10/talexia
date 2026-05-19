import logging
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from jose import JWTError, jwt
from oauthlib.oauth2 import OAuth2Error
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.database import get_db
from app.models.email_campaign import GmailToken
from app.models.user import User
from app.schemas.campaign import GmailStatusResponse
from app.services.gmail_service import GmailService

router = APIRouter(prefix="/gmail", tags=["gmail"])
logger = logging.getLogger(__name__)

GMAIL_STATE_AUDIENCE = "gmail-oauth"
GMAIL_STATE_EXPIRE_MINUTES = 10


def _client_config() -> dict:
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(status_code=500, detail="Gmail OAuth is not configured")
    return {
        "web": {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.google_redirect_uri],
        }
    }


def _flow(state: str | None = None) -> Flow:
    return Flow.from_client_config(
        _client_config(),
        scopes=settings.gmail_scope_list,
        state=state,
        redirect_uri=settings.google_redirect_uri,
    )


def _create_oauth_state(user_id: UUID) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "aud": GMAIL_STATE_AUDIENCE,
        "iat": now,
        "exp": now + timedelta(minutes=GMAIL_STATE_EXPIRE_MINUTES),
        "nonce": secrets.token_urlsafe(24),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _verify_oauth_state(state: str) -> UUID:
    try:
        payload = jwt.decode(
            state,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            audience=GMAIL_STATE_AUDIENCE,
        )
        return UUID(payload["sub"])
    except (JWTError, KeyError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state") from exc


@router.get("/connect")
async def connect_gmail(current_user: User = Depends(get_current_user)):
    logger.info("Gmail connect started for user_id %s", current_user.id)
    state = _create_oauth_state(current_user.id)
    flow = _flow(state=state)
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return {"authorization_url": auth_url}


@router.get("/callback")
async def gmail_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    user_id = _verify_oauth_state(state)
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found for OAuth state")

    flow = _flow(state=state)
    try:
        flow.fetch_token(code=code)
    except (OAuth2Error, Exception) as exc:
        params = urlencode({"gmail": "error"})
        logger.warning("Gmail OAuth callback failed for user_id %s: %s", user_id, exc)
        return RedirectResponse(url=f"{settings.frontend_url}/?{params}")

    credentials = flow.credentials
    result = await db.execute(select(GmailToken).where(GmailToken.user_id == user.id))
    token = result.scalars().first()
    if not token:
        token = GmailToken(user_id=user.id)
        db.add(token)

    token.access_token = credentials.token
    token.refresh_token = credentials.refresh_token or token.refresh_token
    token.token_uri = credentials.token_uri
    token.client_id = credentials.client_id
    token.client_secret = credentials.client_secret
    token.scopes = ",".join(credentials.scopes or settings.gmail_scope_list)
    token.expires_at = credentials.expiry.replace(tzinfo=timezone.utc) if credentials.expiry else None

    try:
        token.connected_email = await GmailService.get_connected_email(db, token)
    except Exception as exc:
        logger.warning("Could not fetch Gmail profile email for user_id %s: %s", user.id, exc)
        token.connected_email = None

    await db.commit()
    logger.info("Gmail token stored for user_id %s", user.id)

    params = urlencode({"gmail": "connected"})
    return RedirectResponse(url=f"{settings.frontend_url}/?{params}")


@router.get("/status", response_model=GmailStatusResponse)
async def gmail_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(GmailToken).where(GmailToken.user_id == current_user.id))
    token = result.scalars().first()
    if not token:
        return GmailStatusResponse(connected=False)
    return GmailStatusResponse(
        connected=True,
        connected_email=token.connected_email,
        expires_at=token.expires_at,
        scopes=[scope for scope in token.scopes.split(",") if scope],
    )


@router.delete("/disconnect")
async def gmail_disconnect(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(GmailToken).where(GmailToken.user_id == current_user.id))
    token = result.scalars().first()
    if token:
        await db.delete(token)
        await db.commit()
        logger.info("Gmail disconnected for user_id %s", current_user.id)
    return {"ok": True}
