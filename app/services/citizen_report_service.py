from sqlalchemy.orm import Session

from app.models.core import CitizenReport, Event
from app.schemas.core import CitizenReportCreate
from app.services.issue_service import (
    find_matching_issue,
    fuse_confidence,
    calculate_priority,
    CITIZEN_REPORT_WEIGHT,
    CITIZEN_REPORT_BASE_CONFIDENCE,
)

# Citizen reports don't carry a type/subtype/confidence like Events do
# (see CitizenReportCreate) - they're free-form. To reuse the same
# spatial matching used for events, we treat a citizen report as a
# plausible match for any open issue type/subtype within range, and
# fall back to CITIZEN_REPORT_BASE_CONFIDENCE (defined alongside the
# other observation weights in issue_service) for the fusion
# contribution, since citizens don't self-report a confidence score.


def _find_matching_issue_for_report(db: Session, report: CitizenReport):
    """
    Reuse the spatial matching from issue_service. Citizen reports have
    no type/subtype, so we match purely on distance against any
    existing issue (nearest within MATCH_DISTANCE_METERS), rather than
    issue_service.find_matching_issue's type/subtype + distance
    filter which requires a type/subtype value.
    """
    from app.models.core import Issue
    from app.services.issue_service import distance_meters, MATCH_DISTANCE_METERS

    issues = db.query(Issue).all()

    best_issue = None
    best_distance = None

    for issue in issues:
        distance = distance_meters(issue.lat, issue.lng, report.lat, report.lng)

        if distance <= MATCH_DISTANCE_METERS:
            if best_distance is None or distance < best_distance:
                best_issue = issue
                best_distance = distance

    return best_issue


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
    db.flush()

    matched_issue = _find_matching_issue_for_report(db, report)

    if matched_issue is not None:
        report.matched_issue_id = matched_issue.id

        # Feed the citizen report into the same noisy-OR fusion used
        # for bus/route observations, with the citizen-report weight.
        matched_issue.confidence = fuse_confidence(
            matched_issue.confidence or 0.0,
            CITIZEN_REPORT_BASE_CONFIDENCE,
            CITIZEN_REPORT_WEIGHT,
        )

        observation_count = (
            db.query(Event).filter(Event.issue_id == matched_issue.id).count()
        )

        matched_issue.priority = calculate_priority(
            matched_issue,
            matched_issue.confidence,
            repeat_observation=True,
            observation_count=observation_count,
        )

    # No match: matched_issue_id stays NULL. We do NOT auto-create a
    # new Issue from an unmatched citizen report - the existing
    # architecture only creates Issues from Events (see
    # issue_service.create_issue_from_event), and citizen reports lack
    # the type/subtype an Issue requires.

    db.commit()
    db.refresh(report)

    return report


def list_citizen_reports(db: Session):
    return (
        db.query(CitizenReport)
        .order_by(CitizenReport.timestamp.desc())
        .all()
    )