from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.services.campaign_scheduler import CampaignScheduler
from app.services.subscription_scheduler import SubscriptionScheduler

app = FastAPI(title="Telxia", description="Career Operating System for candidatures, documents and campaigns", version="1.0.0")


@app.on_event("startup")
async def startup_event():
    CampaignScheduler.start()
    SubscriptionScheduler.start()


@app.on_event("shutdown")
async def shutdown_event():
    await CampaignScheduler.stop()
    await SubscriptionScheduler.stop()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import admin, analytics, applications, auth, campaigns, companies, documents, export, gmail, notes, scraper, subscriptions

@app.get("/")
def read_root():
    return {"message": "Welcome to Telxia API"}

app.include_router(auth.router, prefix="/api/v1")
app.include_router(subscriptions.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(companies.router, prefix="/api/v1")
app.include_router(applications.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(notes.router, prefix="/api/v1")
app.include_router(scraper.router, prefix="/api/v1")
app.include_router(export.router, prefix="/api/v1")
app.include_router(gmail.router, prefix="/api/v1")
app.include_router(campaigns.router, prefix="/api/v1")
