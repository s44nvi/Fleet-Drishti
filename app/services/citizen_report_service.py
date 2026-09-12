from sqlalchemy.orm import Session

from app.models.core import CitizenReport
from app.schemas.core import CitizenReportCreate


def create_citizen_report(
    db: Session,
    payload: CitizenReportCreate
) -> CitizenReport:

    report = CitizenReport(
        description=payload.description,
        photo_path=payload.photo_path,
        video_path=payload.video_path,
        timestamp=payload.timestamp,
        lat=payload.gps.lat,
        lng=payload.gps.lng,
        status="submitted",
        matched_issue_id=None,
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    return report


def list_citizen_reports(db: Session):
    return (
        db.query(CitizenReport)
        .order_by(CitizenReport.timestamp.desc())
        .all()
    )