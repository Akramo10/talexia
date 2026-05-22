import asyncio
import re
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.deps import get_current_user
from app.database import AsyncSessionLocal, get_db
from app.models.email_campaign import CampaignLog, CampaignLogLevel, CampaignStatus, EmailCampaign, EmailRecipient, RecipientStatus
from app.models.user import User
from app.schemas.campaign import (
    BulkDeleteRecipientsRequest,
    BulkCreateRecipientsRequest,
    BulkCreateRecipientsResponse,
    CampaignLogResponse,
    EmailAttachmentDownloadResponse,
    EmailAttachmentResponse,
    EmailCampaignCreate,
    EmailCampaignResponse,
    EmailCampaignUpdate,
    EmailRecipientCreate,
    EmailRecipientResponse,
    EmailRecipientUpdate,
    ImportRecipientsResponse,
    SendCampaignRequest,
)
from app.services.s3_service import S3Service
from app.services.campaign_log_service import CampaignLogService
from app.services.campaign_sender import CampaignSender
from app.services.campaign_service import CampaignService
from app.services.import_service import ImportService

router = APIRouter(prefix="/campaigns", tags=["campaigns"])
EMAIL_PATTERN = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
MIN_SCHEDULE_LEAD_SECONDS = 120


def _campaign_response(campaign: EmailCampaign) -> EmailCampaign:
    for key, value in CampaignService.counts(campaign).items():
        setattr(campaign, key, value)
    return campaign


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


async def _send_campaign_task(campaign_id: UUID, user_id: UUID, delay_seconds: int) -> None:
    async with AsyncSessionLocal() as db:
        campaign = await CampaignService.get_campaign(db, campaign_id, user_id)
        gmail_token = await CampaignSender.get_gmail_token(db, user_id)
        await CampaignSender.send(db, campaign, gmail_token, delay_seconds)


@router.post("/", response_model=EmailCampaignResponse)
async def create_campaign(
    payload: EmailCampaignCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    campaign = await CampaignService.create_campaign(db, current_user.id, payload)
    return _campaign_response(campaign)


@router.get("/", response_model=list[EmailCampaignResponse])
async def list_campaigns(
    search: str | None = None,
    status: CampaignStatus | None = None,
    sort: str = Query("created_desc", pattern="^(created_desc|created_asc|updated_desc|updated_asc)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(EmailCampaign)
        .options(selectinload(EmailCampaign.recipients), selectinload(EmailCampaign.attachments))
        .where(EmailCampaign.user_id == current_user.id)
    )
    if search:
        term = f"%{search}%"
        query = query.where(EmailCampaign.name.ilike(term) | EmailCampaign.subject.ilike(term))
    if status:
        query = query.where(EmailCampaign.status == status)
    order_column = EmailCampaign.updated_at if sort.startswith("updated") else EmailCampaign.created_at
    query = query.order_by(order_column.asc() if sort.endswith("asc") else order_column.desc())
    result = await db.execute(query)
    return [_campaign_response(campaign) for campaign in result.scalars().all()]


@router.get("/{campaign_id}", response_model=EmailCampaignResponse)
async def read_campaign(
    campaign_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return _campaign_response(await CampaignService.get_campaign(db, campaign_id, current_user.id))


@router.put("/{campaign_id}", response_model=EmailCampaignResponse)
async def update_campaign(
    campaign_id: UUID,
    payload: EmailCampaignUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    campaign = await CampaignService.get_campaign(db, campaign_id, current_user.id)
    return _campaign_response(await CampaignService.update_campaign(db, campaign, payload))


@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    campaign = await CampaignService.get_campaign(db, campaign_id, current_user.id)
    if campaign.status == CampaignStatus.SENDING:
        raise HTTPException(status_code=409, detail="Cancel the campaign before deleting it")
    for attachment in campaign.attachments:
        s3_key = attachment.s3_key or attachment.file_path
        if s3_key:
            S3Service.delete_file_from_s3(s3_key)
    await db.delete(campaign)
    await db.commit()
    return {"ok": True}


@router.post("/{campaign_id}/duplicate", response_model=EmailCampaignResponse)
async def duplicate_campaign(
    campaign_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    campaign = await CampaignService.get_campaign(db, campaign_id, current_user.id)
    return _campaign_response(await CampaignService.duplicate_campaign(db, campaign))


@router.post("/{campaign_id}/recipients", response_model=EmailRecipientResponse)
async def create_recipient(
    campaign_id: UUID,
    payload: EmailRecipientCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    campaign = await CampaignService.get_campaign(db, campaign_id, current_user.id)
    return await CampaignService.add_recipient(db, campaign, payload)


@router.post("/{campaign_id}/recipients/import", response_model=ImportRecipientsResponse)
async def import_recipients(
    campaign_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    campaign = await CampaignService.get_campaign(db, campaign_id, current_user.id)
    try:
        recipients, invalid_rows = ImportService.parse_contacts(await file.read(), file.filename or "contacts.csv")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    for item in recipients:
        db.add(
            EmailRecipient(
                campaign_id=campaign.id,
                email=item.email,
                company_name=item.company_name,
                contact_name=item.contact_name,
            )
        )
    await CampaignLogService.add(db, campaign.id, f"Imported {len(recipients)} recipient(s).", CampaignLogLevel.INFO)
    await db.commit()
    return ImportRecipientsResponse(imported=len(recipients), invalid_rows=invalid_rows)


@router.post("/{campaign_id}/recipients/bulk", response_model=BulkCreateRecipientsResponse)
async def bulk_create_recipients(
    campaign_id: UUID,
    payload: BulkCreateRecipientsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    campaign = await CampaignService.get_campaign(db, campaign_id, current_user.id)
    raw_items = [item.strip().lower() for item in re.split(r"[\s,;]+", payload.raw_text) if item.strip()]
    existing_result = await db.execute(select(EmailRecipient.email).where(EmailRecipient.campaign_id == campaign.id))
    existing = {email.lower() for email in existing_result.scalars().all()}
    seen: set[str] = set()
    invalid_items: list[str] = []
    duplicate_items: list[str] = []
    created_count = 0

    for item in raw_items:
        if not EMAIL_PATTERN.match(item):
            invalid_items.append(item)
            continue
        if item in existing or item in seen:
            duplicate_items.append(item)
            continue
        seen.add(item)
        db.add(EmailRecipient(campaign_id=campaign.id, email=item, status=RecipientStatus.PENDING))
        created_count += 1

    await CampaignLogService.add(
        db,
        campaign.id,
        f"Manual bulk add: {created_count} created, {len(duplicate_items)} duplicates, {len(invalid_items)} invalid.",
        CampaignLogLevel.INFO,
    )
    await db.commit()
    return BulkCreateRecipientsResponse(
        created_count=created_count,
        duplicate_count=len(duplicate_items),
        invalid_count=len(invalid_items),
        invalid_items=invalid_items,
        duplicate_items=duplicate_items,
    )


@router.get("/{campaign_id}/recipients", response_model=list[EmailRecipientResponse])
async def list_recipients(
    campaign_id: UUID,
    search: str | None = None,
    company: str | None = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    campaign = await CampaignService.get_campaign(db, campaign_id, current_user.id)
    query = select(EmailRecipient).where(EmailRecipient.campaign_id == campaign.id)
    if search:
        query = query.where(EmailRecipient.email.ilike(f"%{search}%"))
    if company:
        query = query.where(EmailRecipient.company_name.ilike(f"%{company}%"))
    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()


@router.put("/{campaign_id}/recipients/{recipient_id}", response_model=EmailRecipientResponse)
async def update_recipient(
    campaign_id: UUID,
    recipient_id: UUID,
    payload: EmailRecipientUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await CampaignService.get_campaign(db, campaign_id, current_user.id)
    recipient = await CampaignService.get_recipient(db, campaign_id, recipient_id)
    return await CampaignService.update_recipient(db, recipient, payload)


@router.delete("/{campaign_id}/recipients/{recipient_id}")
async def delete_recipient(
    campaign_id: UUID,
    recipient_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await CampaignService.get_campaign(db, campaign_id, current_user.id)
    recipient = await CampaignService.get_recipient(db, campaign_id, recipient_id)
    await db.delete(recipient)
    await db.commit()
    return {"ok": True}


@router.post("/{campaign_id}/recipients/bulk-delete")
async def bulk_delete_recipients(
    campaign_id: UUID,
    payload: BulkDeleteRecipientsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await CampaignService.get_campaign(db, campaign_id, current_user.id)
    result = await db.execute(
        delete(EmailRecipient)
        .where(EmailRecipient.campaign_id == campaign_id, EmailRecipient.id.in_(payload.recipient_ids))
        .returning(EmailRecipient.id)
    )
    deleted = len(result.scalars().all())
    await db.commit()
    return {"deleted": deleted}


@router.post("/{campaign_id}/attachments", response_model=EmailAttachmentResponse)
async def upload_attachment(
    campaign_id: UUID,
    file: UploadFile = File(...),
    label: str | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    campaign = await CampaignService.get_campaign(db, campaign_id, current_user.id)
    return await CampaignService.save_attachment(db, campaign, file, label)


@router.delete("/{campaign_id}/attachments/{attachment_id}")
async def delete_attachment(
    campaign_id: UUID,
    attachment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await CampaignService.get_campaign(db, campaign_id, current_user.id)
    await CampaignService.delete_attachment(db, campaign_id, attachment_id)
    return {"ok": True}


@router.get("/{campaign_id}/attachments/{attachment_id}/download", response_model=EmailAttachmentDownloadResponse)
async def download_attachment(
    campaign_id: UUID,
    attachment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await CampaignService.get_campaign(db, campaign_id, current_user.id)
    url = await CampaignService.get_attachment_download_url(db, campaign_id, attachment_id)
    return EmailAttachmentDownloadResponse(url=url, expires_in=900)


@router.post("/{campaign_id}/send", response_model=EmailCampaignResponse)
async def send_campaign(
    campaign_id: UUID,
    payload: SendCampaignRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    campaign = await CampaignService.get_campaign(db, campaign_id, current_user.id)
    if not campaign.recipients:
        raise HTTPException(status_code=400, detail="No recipients to send")
    if campaign.status == CampaignStatus.SENDING:
        raise HTTPException(status_code=409, detail="Campaign is already sending")
    await CampaignSender.get_gmail_token(db, current_user.id)
    delay = payload.delay_seconds if payload.delay_seconds is not None else campaign.send_delay_seconds
    if payload.scheduled_at:
        scheduled_at = _as_utc(payload.scheduled_at)
        minimum_schedule_at = datetime.now(timezone.utc) + timedelta(seconds=MIN_SCHEDULE_LEAD_SECONDS)
        if scheduled_at < minimum_schedule_at:
            raise HTTPException(
                status_code=400,
                detail=f"Scheduled date must be at least {MIN_SCHEDULE_LEAD_SECONDS // 60} minutes in the future",
            )
        campaign.status = CampaignStatus.SCHEDULED
        campaign.scheduled_at = scheduled_at
        campaign.started_at = None
        campaign.completed_at = None
        await CampaignLogService.add(db, campaign.id, f"Campaign scheduled for {scheduled_at.isoformat()}.", CampaignLogLevel.INFO)
        await db.commit()
        return _campaign_response(await CampaignService.get_campaign(db, campaign.id, current_user.id))
    campaign.status = CampaignStatus.SENDING
    campaign.scheduled_at = None
    campaign.started_at = datetime.now(timezone.utc)
    campaign.completed_at = None
    await CampaignLogService.add(db, campaign.id, "Campaign queued for sending.", CampaignLogLevel.INFO)
    await db.commit()
    background_tasks.add_task(_send_campaign_task, campaign.id, current_user.id, delay)
    return _campaign_response(await CampaignService.get_campaign(db, campaign.id, current_user.id))


@router.post("/{campaign_id}/pause", response_model=EmailCampaignResponse)
async def pause_campaign(campaign_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    campaign = await CampaignService.get_campaign(db, campaign_id, current_user.id)
    campaign.status = CampaignStatus.PAUSED
    await CampaignLogService.add(db, campaign.id, "Campaign paused by user.", CampaignLogLevel.WARNING)
    await db.commit()
    return _campaign_response(await CampaignService.get_campaign(db, campaign.id, current_user.id))


@router.post("/{campaign_id}/resume", response_model=EmailCampaignResponse)
async def resume_campaign(campaign_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    campaign = await CampaignService.get_campaign(db, campaign_id, current_user.id)
    campaign.status = CampaignStatus.SENDING
    await CampaignLogService.add(db, campaign.id, "Campaign resumed by user.", CampaignLogLevel.INFO)
    await db.commit()
    return _campaign_response(await CampaignService.get_campaign(db, campaign.id, current_user.id))


@router.post("/{campaign_id}/cancel", response_model=EmailCampaignResponse)
async def cancel_campaign(campaign_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    campaign = await CampaignService.get_campaign(db, campaign_id, current_user.id)
    campaign.status = CampaignStatus.CANCELLED
    campaign.scheduled_at = None
    campaign.cancelled_at = datetime.now(timezone.utc)
    await CampaignLogService.add(db, campaign.id, "Campaign cancelled by user.", CampaignLogLevel.WARNING)
    await db.commit()
    return _campaign_response(await CampaignService.get_campaign(db, campaign.id, current_user.id))


@router.get("/{campaign_id}/logs", response_model=list[CampaignLogResponse])
async def campaign_logs(
    campaign_id: UUID,
    since_id: UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    campaign = await CampaignService.get_campaign(db, campaign_id, current_user.id)
    query = select(CampaignLog).where(CampaignLog.campaign_id == campaign.id).order_by(CampaignLog.created_at.asc())
    if since_id:
        since_log = await db.get(CampaignLog, since_id)
        if since_log:
            query = query.where(CampaignLog.created_at > since_log.created_at)
    result = await db.execute(query)
    return result.scalars().all()
