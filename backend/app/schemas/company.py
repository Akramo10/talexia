from typing import List, Optional
from pydantic import BaseModel, HttpUrl, ConfigDict
from uuid import UUID

class CompanyBase(BaseModel):
    name: str
    sector: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    glassdoor_link: Optional[str] = None
    linkedin_link: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(CompanyBase):
    name: Optional[str] = None

class CompanyResponse(CompanyBase):
    id: UUID
    user_id: UUID

    model_config = ConfigDict(from_attributes=True)
