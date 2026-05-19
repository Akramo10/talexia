from typing import Optional
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import APIRouter, HTTPException, Depends
from app.core.deps import get_current_user
from app.database import get_db
from app.models.application import Application
from app.models.user import User
from app.services.scraping_service import ScrapingService

router = APIRouter(prefix="/scraper", tags=["scraper"])


class ScrapeRequest(BaseModel):
    url: str


class ScrapeResponse(BaseModel):
    url: str
    raw_text: str
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    contract_type: Optional[str] = None
    sector: Optional[str] = None
    location: Optional[str] = None
    remote_mode: Optional[str] = None
    publication_date: Optional[str] = None
    scraped_at: Optional[str] = None
    source_url: Optional[str] = None
    salary: Optional[str] = None
    description: Optional[str] = None
    benefits: Optional[str] = None


@router.post("/", response_model=ScrapeResponse)
async def scrape_job_offer(request: ScrapeRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check for duplicate job_url before scraping
    query = select(Application).where(Application.job_url == request.url, Application.user_id == current_user.id)
    result = await db.execute(query)
    if result.scalars().first():
        raise HTTPException(
            status_code=409, 
            detail="Cette offre a déjà été ajoutée."
        )

    data = await ScrapingService.extract_structured_data(request.url)

    if data["raw_text"].startswith("Error extracting"):
        raise HTTPException(status_code=400, detail=data["raw_text"])

    return ScrapeResponse(
        url=request.url,
        raw_text=data["raw_text"],
        company_name=data.get("company_name"),
        job_title=data.get("job_title"),
        contract_type=data.get("contract_type"),
        sector=data.get("sector"),
        location=data.get("location"),
        remote_mode=data.get("remote_mode"),
        publication_date=data.get("publication_date"),
        scraped_at=data.get("scraped_at"),
        source_url=data.get("source_url"),
        salary=data.get("salary"),
        description=data.get("description"),
        benefits=data.get("benefits"),
    )
