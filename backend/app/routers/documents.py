from typing import List
import os
import shutil
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.core.deps import get_current_user
from app.models.application import Application
from app.models.document import Document, DocumentType
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentResponse, DocumentUpdate

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    application_id: UUID = Form(...),
    type: DocumentType = Form(...),
    version_name: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    app_result = await db.execute(select(Application).where(Application.id == application_id, Application.user_id == current_user.id))
    if not app_result.scalars().first():
        raise HTTPException(status_code=404, detail="Application not found")
    # Retrieve file extension
    file_extension = os.path.splitext(file.filename)[1]
    
    # Sanitize version name for filename (remove spaces and special chars)
    safe_version = "".join(c for c in version_name if c.isalnum() or c in ('-', '_')).strip()
    if not safe_version:
        safe_version = "v1"

    # Generate unique filename to avoid overriding
    unique_filename = f"{application_id}_{type.value}_{safe_version}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Save to Local File System
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")

    # Create DB Record
    db_document = Document(
        user_id=current_user.id,
        application_id=application_id,
        type=type,
        version_name=version_name,
        file_path=file_path
    )
    
    db.add(db_document)
    await db.commit()
    await db.refresh(db_document)
    return db_document

@router.get("/application/{application_id}", response_model=List[DocumentResponse])
async def read_documents_by_application(application_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = select(Document).where(Document.application_id == application_id, Document.user_id == current_user.id)
    result = await db.execute(query)
    return result.scalars().all()

@router.delete("/{document_id}")
async def delete_document(document_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Document).where(Document.id == document_id, Document.user_id == current_user.id))
    db_document = result.scalars().first()
    if not db_document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Optional: Delete file from disk
    if os.path.exists(db_document.file_path):
        os.remove(db_document.file_path)
        
    await db.delete(db_document)
    await db.commit()
    return {"ok": True}

from fastapi.responses import FileResponse

@router.get("/download/{document_id}")
async def download_document(document_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Document).where(Document.id == document_id, Document.user_id == current_user.id))
    db_document = result.scalars().first()
    if not db_document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if not os.path.exists(db_document.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
        
    return FileResponse(path=db_document.file_path, filename=os.path.basename(db_document.file_path))
