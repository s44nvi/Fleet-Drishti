from math import cos, radians

from sqlalchemy.orm import Session

from app.models.core import Issue, Event


# Approximate matching distance for repeated observations.
# 50 meters is suitable for the prototype.
MATCH_DISTANCE_METERS = 50


def list_issues(db: Session):
    return db.query(Issue).order_by(Issue.last_seen.desc()).all()


def get_issue(db: Session, issue_id: str):
    return db.query(Issue).filter(Issue.id == issue_id).first()


def update_issue_status(db: Session, issue_id: str, status: str):
    issue = get_issue(db, issue_id)

    if not issue:
        return None

    issue.status = status
    db.commit()
    db.refresh(issue)

    return issue


def distance_meters(lat1, lng1, lat2, lng2):
    """
    Approximate distance between two GPS coordinates in meters.
    Good enough for prototype-level issue matching.
    """
    lat_diff = (lat2 - lat1) * 111_000
    lng_diff = (
        (lng2 - lng1)
        * 111_000
        * cos(radians((lat1 + lat2) / 2))
    )

    return (lat_diff ** 2 + lng_diff ** 2) ** 0.5


def find_matching_issue(db: Session, event: Event):
    """
    Find an existing Issue representing the same physical defect.

    Matching criteria:
    - Same type
    - Same subtype
    - Within 50 meters
    """
    issues = (
        db.query(Issue)
        .filter(
            Issue.type == event.type,
            Issue.subtype == event.subtype,
        )
        .all()
    )

    for issue in issues:
        distance = distance_meters(
            issue.lat,
            issue.lng,
            event.lat,
            event.lng,
        )

        if distance <= MATCH_DISTANCE_METERS:
            return issue

    return None


def create_issue_from_event(db: Session, event: Event):
    """
    Create a new persistent Issue from an Event.
    """
    issue = Issue(
        type=event.type,
        subtype=event.subtype,
        lat=event.lat,
        lng=event.lng,
        severity=None,
        priority=None,
        status="unresolved",
        first_seen=event.timestamp,
        last_seen=event.timestamp,
    )

    db.add(issue)
    db.flush()

    event.issue_id = issue.id

    db.commit()
    db.refresh(issue)

    return issue


def process_event_for_issue(db: Session, event: Event):
    """
    Fusion entry point.

    If a matching Issue already exists:
    - attach the Event to it
    - update last_seen

    Otherwise:
    - create a new Issue
    """
    existing_issue = find_matching_issue(db, event)

    if existing_issue:
        event.issue_id = existing_issue.id

        if event.timestamp < existing_issue.first_seen:
            existing_issue.first_seen = event.timestamp

        if event.timestamp > existing_issue.last_seen:
            existing_issue.last_seen = event.timestamp

        db.commit()
        db.refresh(existing_issue)

        return existing_issue

    return create_issue_from_event(db, event)