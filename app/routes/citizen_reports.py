from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.core import CitizenReportCreate, CitizenReportOut
from app.services import citizen_report_service


router = APIRouter(
    prefix="/citizen-reports",
    tags=["citizen-reports"]
)


@router.post("", response_model=CitizenReportOut, status_code=201)
def create_citizen_report(
    payload: CitizenReportCreate,
    db: Session = Depends(get_db),
):
    return citizen_report_service.create_citizen_report(db, payload)


@router.get("", response_model=list[CitizenReportOut])
def get_citizen_reports(
    db: Session = Depends(get_db),
):
    return citizen_report_service.list_citizen_reports(db)