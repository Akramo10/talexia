from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(title="PathFinder", description="CRM for tracing job applications", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import applications, auth, campaigns, companies, documents, export, gmail, notes, scraper

@app.get("/")
def read_root():
    return {"message": "Welcome to Outli Suivi Alternance API"}

app.include_router(auth.router, prefix="/api/v1")
app.include_router(companies.router, prefix="/api/v1")
app.include_router(applications.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(notes.router, prefix="/api/v1")
app.include_router(scraper.router, prefix="/api/v1")
app.include_router(export.router, prefix="/api/v1")
app.include_router(gmail.router, prefix="/api/v1")
app.include_router(campaigns.router, prefix="/api/v1")
