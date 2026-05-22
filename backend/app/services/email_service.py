import logging
from datetime import datetime
from html import escape

import resend

from app.core.config import settings

logger = logging.getLogger(__name__)
SUPPORT_PHONE = "+33 759009145"


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


def _format_date(value: datetime | None) -> str:
    if not value:
        return "date non renseignée"
    return value.strftime("%d/%m/%Y")


def _telxia_email(title: str, intro: str, body: str, cta_label: str | None = None, cta_url: str | None = None) -> str:
    cta = ""
    if cta_label and cta_url:
        cta = f"""
        <p style="margin:28px 0;">
          <a href="{cta_url}" style="background:#4B8491;color:#ffffff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block;">
            {escape(cta_label)}
          </a>
        </p>
        """

    return f"""
    <div style="margin:0;padding:0;background:#F5F8F9;font-family:Inter,Arial,sans-serif;color:#344D5C;">
      <div style="max-width:620px;margin:0 auto;padding:32px 18px;">
        <div style="background:#ffffff;border:1px solid #C2D1D5;border-radius:18px;overflow:hidden;">
          <div style="background:#344D5C;padding:28px 30px;">
            <h1 style="margin:0;color:#ffffff;font-size:26px;">Telxia</h1>
            <p style="margin:8px 0 0;color:#C2D1D5;font-size:14px;font-weight:600;">Votre espace candidatures</p>
          </div>
          <div style="padding:30px;">
            <h2 style="margin:0 0 14px;color:#344D5C;font-size:22px;">{escape(title)}</h2>
            <p style="margin:0 0 18px;line-height:1.7;color:#526A75;">{intro}</p>
            <div style="line-height:1.7;color:#344D5C;">{body}</div>
            {cta}
          </div>
          <div style="background:#F5F8F9;padding:16px 30px;color:#8BA5AD;font-size:12px;">
            Telxia - Suivi candidatures, documents, campagnes et analytics.<br>
            Support : {SUPPORT_PHONE}
          </div>
        </div>
      </div>
    </div>
    """


def send_welcome_email(
    to_email: str,
    full_name: str | None,
    plan_key: str = "trial_3_months",
    starts_at: datetime | None = None,
    ends_at: datetime | None = None,
) -> bool:
    display_name = escape(full_name or "utilisateur Telxia")
    platform_url = settings.frontend_url.rstrip("/")
    starts_label = _format_date(starts_at)
    ends_label = _format_date(ends_at)
    access_messages = {
        "trial_3_months": f"Votre essai gratuit de 3 mois est activé jusqu'au <strong>{ends_label}</strong>.",
        "six_months": f"Votre accès 6 mois Telxia est activé jusqu'au <strong>{ends_label}</strong>.",
        "twelve_months": f"Votre accès 12 mois Telxia est activé jusqu'au <strong>{ends_label}</strong>.",
    }
    html = _telxia_email(
        "Bienvenue sur Telxia - votre accès est activé",
        f"Bonjour {display_name}, bienvenue sur Telxia. Votre espace de pilotage carrière est prêt.",
        f"<p>{access_messages.get(plan_key, access_messages['trial_3_months'])}</p><p><strong>Date de début :</strong> {starts_label}<br><strong>Date expiration :</strong> {ends_label}<br><strong>Support :</strong> {SUPPORT_PHONE}</p><p>Centralisez vos candidatures, documents, relances, campagnes email et analytics dans un espace clair.</p>",
        "Accéder à la plateforme",
        platform_url,
    )
    text_messages = {
        "trial_3_months": f"Votre essai gratuit de 3 mois est activé jusqu'au {ends_label}.",
        "six_months": f"Votre accès 6 mois Telxia est activé jusqu'au {ends_label}.",
        "twelve_months": f"Votre accès 12 mois Telxia est activé jusqu'au {ends_label}.",
    }
    text = f"Bienvenue sur Telxia. Bonjour {full_name or 'utilisateur Telxia'}, {text_messages.get(plan_key, text_messages['trial_3_months'])} Début: {starts_label}. Expiration: {ends_label}. Support: {SUPPORT_PHONE}. Accès plateforme: {platform_url}"
    return _send_email(to_email, "Bienvenue sur Telxia - votre accès est activé", html, text)


def send_password_reset_email(to_email: str, reset_link: str) -> bool:
    html = _telxia_email(
        "Réinitialisation du mot de passe",
        "Vous avez demandé à réinitialiser votre mot de passe Telxia.",
        "<p>Ce lien expire dans <strong>30 minutes</strong> et ne peut être utilisé qu'une seule fois.</p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>",
        "Réinitialiser mon mot de passe",
        reset_link,
    )
    text = f"Réinitialisez votre mot de passe Telxia avec ce lien valable 30 minutes: {reset_link}"
    return _send_email(to_email, "Réinitialisation de votre mot de passe Telxia", html, text)


def send_trial_activated_email(to_email: str, ends_at: datetime) -> bool:
    platform_url = settings.frontend_url.rstrip("/")
    date_label = _format_date(ends_at)
    html = _telxia_email(
        "Votre essai gratuit est activé",
        f"Votre trial Telxia de 3 mois est actif jusqu'au <strong>{date_label}</strong>.",
        "<p>Aucune carte bancaire n'est nécessaire pour tester le suivi de candidatures, les documents, les campagnes email et les analytics.</p>",
        "Ouvrir Telxia",
        platform_url,
    )
    text = f"Votre trial Telxia de 3 mois est actif jusqu'au {date_label}."
    return _send_email(to_email, "Trial Telxia activé pour 3 mois", html, text)


def send_subscription_reminder_email(to_email: str, plan_name: str, ends_at: datetime, days_left: int, is_trial: bool) -> bool:
    platform_url = settings.frontend_url.rstrip("/")
    title = f"Votre {'trial' if is_trial else 'abonnement'} expire dans {days_left} jour{'s' if days_left > 1 else ''}"
    date_label = _format_date(ends_at)
    html = _telxia_email(
        title,
        f"Votre accès Telxia ({escape(plan_name)}) arrive à expiration le <strong>{date_label}</strong>.",
        "<p>Vous pouvez choisir un plan depuis votre profil pour conserver vos candidatures, documents, campagnes et analytics accessibles.</p>",
        "Choisir un plan",
        platform_url,
    )
    text = f"Votre accès Telxia ({plan_name}) expire le {date_label}. Connectez-vous pour choisir un plan."
    return _send_email(to_email, title, html, text)


def send_subscription_expired_email(to_email: str, plan_name: str) -> bool:
    platform_url = settings.frontend_url.rstrip("/")
    html = _telxia_email(
        "Votre abonnement Telxia a expiré",
        f"Votre accès Telxia ({escape(plan_name)}) est arrivé à expiration.",
        "<p>Choisissez un plan pour reprendre votre suivi de candidatures, vos documents, vos campagnes email et vos analytics.</p>",
        "Réactiver mon accès",
        platform_url,
    )
    text = f"Votre accès Telxia ({plan_name}) a expiré. Connectez-vous pour choisir un plan."
    return _send_email(to_email, "Votre abonnement Telxia a expiré", html, text)


def send_email_verification_email(to_email: str, verification_link: str) -> bool:
    html = _telxia_email(
        "Confirmez votre adresse email",
        "Cliquez sur le bouton ci-dessous pour confirmer votre email.",
        "",
        "Confirmer mon email",
        verification_link,
    )
    text = f"Confirmez votre adresse email Telxia: {verification_link}"
    return _send_email(to_email, "Confirmez votre adresse email Telxia", html, text)
