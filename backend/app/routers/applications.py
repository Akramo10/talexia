from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user
from app.database import get_db
from app.models.application import Application, ApplicationStatus
from app.models.company import Company
from app.models.document import Document
from app.models.user import User
from app.schemas.application import ApplicationCreate, ApplicationResponse, ApplicationUpdate

router = APIRouter(prefix="/applications", tags=["applications"])

APPLICATION_LOADS = (
    selectinload(Application.company),
    selectinload(Application.cv_document),
    selectinload(Application.cover_letter_document),
)


async def _ensure_company(db: AsyncSession, company_id: UUID, user_id: UUID) -> None:
    result = await db.execute(select(Company).where(Company.id == company_id, Company.user_id == user_id))
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Company not found")


async def _ensure_document(db: AsyncSession, document_id: UUID | None, user_id: UUID) -> None:
    if not document_id:
        return
    result = await db.execute(select(Document).where(Document.id == document_id, Document.user_id == user_id))
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Document not found")


@router.post("/", response_model=ApplicationResponse)
async def create_application(
    application: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _ensure_company(db, application.company_id, current_user.id)

    if application.job_url:
        query = select(Application).where(Application.job_url == application.job_url, Application.user_id == current_user.id)
        result = await db.execute(query)
        if result.scalars().first():
            raise HTTPException(status_code=409, detail="Une candidature avec cette URL existe deja.")

    await _ensure_document(db, application.cv_document_id, current_user.id)
    await _ensure_document(db, application.cover_letter_document_id, current_user.id)

    db_application = Application(**application.model_dump(), user_id=current_user.id)
    db.add(db_application)
    await db.commit()

    query = select(Application).options(*APPLICATION_LOADS).where(
        Application.id == db_application.id,
        Application.user_id == current_user.id,
    )
    result = await db.execute(query)
    return result.scalars().first()


@router.get("/check")
async def check_duplicate(
    url: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Application).where(Application.job_url == url, Application.user_id == current_user.id)
    result = await db.execute(query)
    return {"exists": result.scalars().first() is not None}


@router.get("/", response_model=List[ApplicationResponse])
async def read_applications(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Application).options(*APPLICATION_LOADS).where(
        Application.user_id == current_user.id,
    ).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{application_id}", response_model=ApplicationResponse)
async def read_application(
    application_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Application).options(*APPLICATION_LOADS).where(
        Application.id == application_id,
        Application.user_id == current_user.id,
    )
    result = await db.execute(query)
    db_application = result.scalars().first()
    if db_application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return db_application


@router.put("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: UUID,
    application: ApplicationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Application).options(*APPLICATION_LOADS).where(
        Application.id == application_id,
        Application.user_id == current_user.id,
    )
    result = await db.execute(query)
    db_application = result.scalars().first()

    if db_application is None:
        raise HTTPException(status_code=404, detail="Application not found")

    update_data = application.model_dump(exclude_unset=True)
    if update_data.get("company_id"):
        await _ensure_company(db, update_data["company_id"], current_user.id)

    await _ensure_document(db, update_data.get("cv_document_id"), current_user.id)
    await _ensure_document(db, update_data.get("cover_letter_document_id"), current_user.id)

    new_status = update_data.get("status")
    if new_status:
        if new_status != db_application.status:
            db_application.last_contact_date = datetime.now(timezone.utc)
        if new_status == ApplicationStatus.APPLIED and db_application.status == ApplicationStatus.WISHLIST:
            db_application.date_sent = datetime.now(timezone.utc)

    for key, value in update_data.items():
        setattr(db_application, key, value)

    await db.commit()
    await db.refresh(db_application)

    result = await db.execute(
        select(Application).options(*APPLICATION_LOADS).where(
            Application.id == application_id,
            Application.user_id == current_user.id,
        )
    )
    return result.scalars().first()


@router.delete("/{application_id}")
async def delete_application(
    application_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Application).where(Application.id == application_id, Application.user_id == current_user.id))
    db_application = result.scalars().first()
    if db_application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    await db.delete(db_application)
    await db.commit()
    return {"ok": True}
