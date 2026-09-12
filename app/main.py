from fastapi import FastAPI

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