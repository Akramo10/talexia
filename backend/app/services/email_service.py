import logging
from html import escape

import resend

from app.core.config import settings

logger = logging.getLogger(__name__)


def _send_email(to_email: str, subject: str, html: str, text: str) -> bool:
    if not settings.resend_api_key:
        logger.warning("Resend email skipped: RESEND_API_KEY is not configured")
        return False
    if not settings.resend_from_email:
        logger.warning("Resend email skipped: RESEND_FROM_EMAIL is not configured")
        return False

    resend.api_key = settings.resend_api_key
    try:
        resend.Emails.send(
            {
                "from": settings.resend_from_email,
                "to": [to_email],
                "subject": subject,
                "html": html,
                "text": text,
            }
        )
        logger.info("Resend email sent successfully to %s", to_email)
        return True
    except Exception:
        logger.exception("Resend email failed for %s", to_email)
        return False


def send_welcome_email(to_email: str, full_name: str | None) -> bool:
    display_name = escape(full_name or "utilisateur Telxia")
    platform_url = settings.frontend_url.rstrip("/")
    html = f"""
    <div style="font-family: Inter, Arial, sans-serif; color: #344D5C; background: #F5F8F9; padding: 32px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #C2D1D5; border-radius: 16px; padding: 32px;">
        <h1 style="margin: 0; color: #4B8491;">Telxia</h1>
        <p style="margin: 8px 0 24px; color: #8BA5AD; font-weight: 600;">Votre chemin vers la réussite.</p>
        <h2 style="color: #344D5C;">Bienvenue sur Telxia 👋</h2>
        <p>Bonjour {display_name},</p>
        <p>Bienvenue sur Telxia. Votre espace de pilotage carrière est prêt.</p>
        <p style="margin: 28px 0;">
          <a href="{platform_url}" style="background: #4B8491; color: #ffffff; padding: 12px 18px; border-radius: 10px; text-decoration: none; font-weight: 700;">
            Accéder à la plateforme
          </a>
        </p>
        <p style="color: #8B9BAE;">Votre chemin vers la réussite.</p>
      </div>
    </div>
    """
    text = f"Bonjour {display_name},\nBienvenue sur Telxia. Votre espace de pilotage carrière est prêt."
    return _send_email(to_email, "Bienvenue sur Telxia 👋", html, text)


def send_password_reset_email(to_email: str, reset_link: str) -> bool:
    html = f"""
    <div style="font-family: Inter, Arial, sans-serif; color: #344D5C; background: #F5F8F9; padding: 32px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #C2D1D5; border-radius: 16px; padding: 32px;">
        <h1 style="margin: 0; color: #4B8491;">Telxia</h1>
        <h2 style="color: #344D5C;">Réinitialisation du mot de passe</h2>
        <p>Vous avez demandé à réinitialiser votre mot de passe Telxia.</p>
        <p>Ce lien expire dans 30 minutes.</p>
        <p style="margin: 28px 0;">
          <a href="{reset_link}" style="background: #4B8491; color: #ffffff; padding: 12px 18px; border-radius: 10px; text-decoration: none; font-weight: 700;">
            Réinitialiser mon mot de passe
          </a>
        </p>
        <p style="color: #8B9BAE;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      </div>
    </div>
    """
    text = f"Réinitialisez votre mot de passe Telxia avec ce lien valable 30 minutes: {reset_link}"
    return _send_email(to_email, "Réinitialisation de votre mot de passe Telxia", html, text)


def send_email_verification_email(to_email: str, verification_link: str) -> bool:
    html = f"""
    <div style="font-family: Inter, Arial, sans-serif; color: #344D5C; background: #F5F8F9; padding: 32px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #C2D1D5; border-radius: 16px; padding: 32px;">
        <h1 style="margin: 0; color: #4B8491;">Telxia</h1>
        <h2 style="color: #344D5C;">Confirmez votre adresse email</h2>
        <p>Cliquez sur le bouton ci-dessous pour confirmer votre email.</p>
        <p style="margin: 28px 0;">
          <a href="{verification_link}" style="background: #4B8491; color: #ffffff; padding: 12px 18px; border-radius: 10px; text-decoration: none; font-weight: 700;">
            Confirmer mon email
          </a>
        </p>
      </div>
    </div>
    """
    text = f"Confirmez votre adresse email Telxia: {verification_link}"
    return _send_email(to_email, "Confirmez votre adresse email Telxia", html, text)
