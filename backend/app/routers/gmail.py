import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from oauthlib.oauth2 import OAuth2Error
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.database import get_db
from app.models.email_campaign import GmailToken
from app.models.user import User
from app.schemas.campaign import GmailStatusResponse

router = APIRouter(prefix="/gmail", tags=["gmail"])
_oauth_code_verifiers: dict[str, str] = {}


def _flow(state: str | None = None, code_verifier: str | None = None) -> Flow:
    client_config = _client_config()
    return Flow.from_client_config(
        client_config,
        scopes=settings.gmail_scope_list,
        state=state,
        redirect_uri=settings.google_redirect_uri,
        code_verifier=code_verifier,
    )


def _client_config() -> dict:
    if settings.google_credentials_file:
        credentials_path = Path(settings.google_credentials_file)
        if not credentials_path.is_file():
            raise HTTPException(status_code=500, detail="Configured Google credentials file was not found")
        with credentials_path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        if "web" in data or "installed" in data:
            return data
        raise HTTPException(status_code=500, detail="Invalid Google credentials file")

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


def _parse_google_expiry(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


@router.get("/connect")
async def connect_gmail(current_user: User = Depends(get_current_user)):
    state = str(current_user.id)
    flow = _flow(state=state)
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    if flow.code_verifier:
        _oauth_code_verifiers[state] = flow.code_verifier
    return {"authorization_url": auth_url}


@router.get("/callback")
async def gmail_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        user_id = UUID(state)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid OAuth state") from exc
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found for OAuth state")

    code_verifier = _oauth_code_verifiers.pop(state, None)
    flow = _flow(state=state, code_verifier=code_verifier)
    try:
        flow.fetch_token(code=code)
    except OAuth2Error as exc:
        params = urlencode({"gmail": "error", "reason": str(exc)})
        return RedirectResponse(url=f"{settings.frontend_url}/candidature-spontanee?{params}")
    except Exception as exc:
        params = urlencode({"gmail": "error", "reason": str(exc)})
        return RedirectResponse(url=f"{settings.frontend_url}/candidature-spontanee?{params}")
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
    await db.commit()

    params = urlencode({"gmail": "connected"})
    return RedirectResponse(url=f"{settings.frontend_url}/candidature-spontanee?{params}")


@router.post("/import-local-token", response_model=GmailStatusResponse)
async def import_local_email_sender_token(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.gmail_token_file:
        raise HTTPException(status_code=400, detail="GMAIL_TOKEN_FILE is not configured")
    token_path = Path(settings.gmail_token_file)
    if not token_path.is_file():
        raise HTTPException(status_code=404, detail="Configured token.json was not found")

    with token_path.open("r", encoding="utf-8") as handle:
        token_data = json.load(handle)
    client_data = _client_config()
    client = client_data.get("web") or client_data.get("installed") or {}

    access_token = token_data.get("token")
    refresh_token = token_data.get("refresh_token")
    client_id = token_data.get("client_id") or client.get("client_id")
    client_secret = token_data.get("client_secret") or client.get("client_secret")
    token_uri = token_data.get("token_uri") or client.get("token_uri") or "https://oauth2.googleapis.com/token"
    scopes = token_data.get("scopes") or settings.gmail_scope_list

    if not access_token or not client_id or not client_secret:
        raise HTTPException(status_code=400, detail="token.json or credentials.json is incomplete")

    result = await db.execute(select(GmailToken).where(GmailToken.user_id == current_user.id))
    token = result.scalars().first()
    if not token:
        token = GmailToken(user_id=current_user.id)
        db.add(token)

    token.access_token = access_token
    token.refresh_token = refresh_token
    token.token_uri = token_uri
    token.client_id = client_id
    token.client_secret = client_secret
    token.scopes = ",".join(scopes) if isinstance(scopes, list) else str(scopes)
    token.expires_at = _parse_google_expiry(token_data.get("expiry"))
    await db.commit()

    return GmailStatusResponse(
        connected=True,
        expires_at=token.expires_at,
        scopes=[scope for scope in token.scopes.split(",") if scope],
    )


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
    return {"ok": True}
