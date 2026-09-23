from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import (
    events,
    fleet,
    issues,
    evidence,
    citizen_reports,
    auth,
    analytics,
)

app = FastAPI(title="CityLens Backend (M4)")

# Allow the frontend to communicate with the backend
# during local development. Configurable via CORS_ORIGINS env var
# (comma-separated); defaults cover common local dev ports.
cors_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router)
app.include_router(fleet.router)
app.include_router(issues.router)
app.include_router(evidence.router)
app.include_router(citizen_reports.router)
app.include_router(auth.router)
app.include_router(analytics.router)


@app.get("/health")
def health():
    return {"status": "ok"}