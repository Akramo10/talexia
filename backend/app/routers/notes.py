from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID

from app.database import get_db
from app.core.deps import get_current_user
from app.models.application import Application
from app.models.note import Note
from app.models.user import User
from app.schemas.note import NoteCreate, NoteResponse, NoteUpdate

router = APIRouter(prefix="/notes", tags=["notes"])

@router.post("/", response_model=NoteResponse)
async def create_note(note: NoteCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    app_result = await db.execute(select(Application).where(Application.id == note.application_id, Application.user_id == current_user.id))
    if not app_result.scalars().first():
        raise HTTPException(status_code=404, detail="Application not found")
    db_note = Note(**note.model_dump(), user_id=current_user.id)
    db.add(db_note)
    await db.commit()
    await db.refresh(db_note)
    return db_note

@router.get("/application/{application_id}", response_model=List[NoteResponse])
async def read_notes_by_application(application_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = select(Note).where(Note.application_id == application_id, Note.user_id == current_user.id).order_by(Note.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(note_id: UUID, note: NoteUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Note).where(Note.id == note_id, Note.user_id == current_user.id))
    db_note = result.scalars().first()
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    
    update_data = note.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_note, key, value)
    
    await db.commit()
    await db.refresh(db_note)
    return db_note

@router.delete("/{note_id}")
async def delete_note(note_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Note).where(Note.id == note_id, Note.user_id == current_user.id))
    db_note = result.scalars().first()
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    await db.delete(db_note)
    await db.commit()
    return {"ok": True}
