import base64
import mimetypes
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.email_campaign import GmailToken


class GmailService:
    @staticmethod
    def _credentials(token: GmailToken) -> Credentials:
        return Credentials(
            token=token.access_token,
            refresh_token=token.refresh_token,
            token_uri=token.token_uri,
            client_id=token.client_id,
            client_secret=token.client_secret,
            scopes=[scope for scope in token.scopes.split(",") if scope],
        )

    @classmethod
    async def get_service(cls, db: AsyncSession, token: GmailToken):
        credentials = cls._credentials(token)
        if credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
            token.access_token = credentials.token
            token.refresh_token = credentials.refresh_token or token.refresh_token
            token.expires_at = credentials.expiry.replace(tzinfo=timezone.utc) if credentials.expiry else None
            await db.commit()
            await db.refresh(token)
        return build("gmail", "v1", credentials=credentials)

    @classmethod
    async def get_connected_email(cls, db: AsyncSession, token: GmailToken) -> str | None:
        credentials = cls._credentials(token)
        if credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
            token.access_token = credentials.token
            token.refresh_token = credentials.refresh_token or token.refresh_token
            token.expires_at = credentials.expiry.replace(tzinfo=timezone.utc) if credentials.expiry else None
            await db.commit()
            await db.refresh(token)

        try:
            profile = build("oauth2", "v2", credentials=credentials).userinfo().get().execute()
            if profile.get("email"):
                return profile["email"]
        except Exception:
            pass

        profile = build("gmail", "v1", credentials=credentials).users().getProfile(userId="me").execute()
        return profile.get("emailAddress")

    @staticmethod
    def create_message(to: str, subject: str, body_text: str, attachments: list[str] | None = None) -> dict[str, str]:
        message = EmailMessage()
        message["To"] = to
        message["From"] = "me"
        message["Subject"] = subject
        message.set_content(body_text)

        for file_path in attachments or []:
            path = Path(file_path)
            if not path.is_file():
                continue
            content_type, encoding = mimetypes.guess_type(str(path))
            if content_type is None or encoding is not None:
                content_type = "application/octet-stream"
            maintype, subtype = content_type.split("/", 1)
            message.add_attachment(path.read_bytes(), maintype=maintype, subtype=subtype, filename=path.name)

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
        return {"raw": raw}

    @classmethod
    async def send_email(
        cls,
        db: AsyncSession,
        token: GmailToken,
        to: str,
        subject: str,
        body_text: str,
        attachments: list[str] | None = None,
    ) -> tuple[bool, str]:
        try:
            service = await cls.get_service(db, token)
            message = cls.create_message(to=to, subject=subject, body_text=body_text, attachments=attachments)
            sent_message = service.users().messages().send(userId="me", body=message).execute()
            return True, sent_message.get("id", "")
        except HttpError as exc:
            return False, str(exc)
        except Exception as exc:
            return False, str(exc)
