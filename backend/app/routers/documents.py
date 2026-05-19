from typing import List, Optional
from uuid import UUID, uuid4
import os
import re

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.deps import get_current_user
from app.database import get_db
from app.models.application import Application
from app.models.document import Document, DocumentType
from app.models.user import User
from app.schemas.document import DocumentDownloadResponse, DocumentResponse, DocumentUpdate
from app.services.s3_service import S3Service

router = APIRouter(prefix="/documents", tags=["documents"])

MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}
ALLOWED_EXTENSIONS = {".pdf", ".docx"}


async def _ensure_application(db: AsyncSession, application_id: Optional[UUID], user_id: UUID) -> None:
    if not application_id:
        return
    result = await db.execute(select(Application).where(Application.id == application_id, Application.user_id == user_id))
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Application not found")


async def _get_document(db: AsyncSession, document_id: UUID, user_id: UUID) -> Document:
    result = await db.execute(select(Document).where(Document.id == document_id, Document.user_id == user_id))
    document = result.scalars().first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


def _safe_filename(filename: str) -> str:
    name = os.path.basename(filename or "document")
    name = re.sub(r"[^A-Za-z0-9._-]+", "-", name).strip("-._")
    return name or "document"


async def _validate_file(file: UploadFile) -> tuple[bytes, str, str]:
    original_filename = file.filename or "document"
    extension = os.path.splitext(original_filename)[1].lower()
    mime_type = file.content_type or ""
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF et DOCX sont acceptés.")
    if mime_type in {"", "application/octet-stream"}:
        mime_type = next(key for key, value in ALLOWED_MIME_TYPES.items() if value == extension)
    if mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Type MIME invalide. Seuls PDF et DOCX sont acceptés.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Le fichier dépasse la limite de 10 MB.")
    if not content:
        raise HTTPException(status_code=400, detail="Le fichier est vide.")

    return content, mime_type, extension


@router.post("/upload", response_model=List[DocumentResponse])
async def upload_documents(
    application_id: Optional[UUID] = Form(None),
    document_type: DocumentType = Form(...),
    display_name: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _ensure_application(db, application_id, current_user.id)

    created_documents: list[Document] = []
    for file in files:
        content, mime_type, _extension = await _validate_file(file)
        safe_name = _safe_filename(file.filename or "document")
        stored_filename = f"{uuid4()}-{safe_name}"
        s3_key = f"users/{current_user.id}/documents/{stored_filename}"

        S3Service.upload_file_to_s3(content, s3_key, mime_type)

        document = Document(
            user_id=current_user.id,
            application_id=application_id,
            original_filename=file.filename or safe_name,
            stored_filename=stored_filename,
            s3_key=s3_key,
            file_url=None,
            document_type=document_type,
            mime_type=mime_type,
            size=len(content),
            display_name=display_name.strip() if display_name else os.path.splitext(safe_name)[0],
            tags=tags,
        )
        db.add(document)
        created_documents.append(document)

    await db.commit()
    for document in created_documents:
        await db.refresh(document)
    return created_documents


@router.get("/", response_model=List[DocumentResponse])
async def read_document_library(
    document_type: Optional[DocumentType] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Document).where(Document.user_id == current_user.id)
    if document_type:
        query = query.where(Document.document_type == document_type)
    query = query.order_by(Document.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/application/{application_id}", response_model=List[DocumentResponse])
async def read_documents_by_application(
    application_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _ensure_application(db, application_id, current_user.id)
    query = select(Document).where(Document.application_id == application_id, Document.user_id == current_user.id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/download/{document_id}", response_model=DocumentDownloadResponse)
async def download_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = await _get_document(db, document_id, current_user.id)
    url = S3Service.generate_presigned_download_url(document.s3_key, document.original_filename)
    return DocumentDownloadResponse(url=url, expires_in=900)


@router.get("/{document_id}", response_model=DocumentResponse)
async def read_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await _get_document(db, document_id, current_user.id)


@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: UUID,
    document: DocumentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_document = await _get_document(db, document_id, current_user.id)
    update_data = document.model_dump(exclude_unset=True)
    if "application_id" in update_data:
        await _ensure_application(db, update_data["application_id"], current_user.id)

    for key, value in update_data.items():
        setattr(db_document, key, value)

    await db.commit()
    await db.refresh(db_document)
    return db_document


@router.delete("/{document_id}")
async def delete_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = await _get_document(db, document_id, current_user.id)
    S3Service.delete_file_from_s3(document.s3_key)
    await db.delete(document)
    await db.commit()
    return {"ok": True}
