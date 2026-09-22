from math import cos, radians
from uuid import UUID
from datetime import timezone

from sqlalchemy.orm import Session

from app.models.core import Issue, Event


# Approximate matching distance for repeated observations.
# 50 meters is suitable for the prototype.
MATCH_DISTANCE_METERS = 50


def calculate_priority(
    issue: Issue,
    confidence: float,
    repeat_observation: bool = False,
):
    """
    Calculate platform priority separately from AI confidence.

    Returns a score from 0 to 100.
    """

    severity_scores = {
        "pothole": 70,
        "road_damage": 80,
        "waterlogging": 85,
        "damaged_divider": 75,
        "missing_zebra_crossing": 80,
        "damaged_traffic_sign": 65,
        "other_hazard": 60,
    }

    base_score = severity_scores.get(issue.subtype, 50)
    confidence_score = confidence * 20
    repeat_bonus = 10 if repeat_observation else 0

    priority = base_score + confidence_score + repeat_bonus

    return min(round(priority, 2), 100)


def list_issues(db: Session):
    return db.query(Issue).order_by(Issue.last_seen.desc()).all()


def get_issue(db: Session, issue_id: str):
    try:
        UUID(issue_id)
    except (ValueError, TypeError, AttributeError):
        return None

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


def _utc_aware(dt):
    """
    Normalize a datetime to timezone-aware UTC.

    Handles both:
    - timezone-aware datetimes
    - timezone-naive datetimes from PostgreSQL
    """
    if dt is None:
        return None

    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)

    return dt.astimezone(timezone.utc)


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

    issue.priority = calculate_priority(
        issue,
        event.confidence,
        repeat_observation=False,
    )

    event.issue_id = issue.id

    db.commit()
    db.refresh(issue)

    return issue


def process_event_for_issue(db: Session, event: Event):
    """
    Fusion entry point.

    If a matching Issue already exists:
    - attach the Event to it
    - update first_seen/last_seen (normalizing naive/aware datetimes
      before comparing, since PostgreSQL can hand back naive
      datetimes while incoming event timestamps may be aware)
    - increase priority for repeated observation

    Otherwise:
    - create a new Issue
    """
    existing_issue = find_matching_issue(db, event)

    if existing_issue:
        event.issue_id = existing_issue.id

        event_timestamp = _utc_aware(event.timestamp)
        first_seen = _utc_aware(existing_issue.first_seen)
        last_seen = _utc_aware(existing_issue.last_seen)

        if event_timestamp < first_seen:
            existing_issue.first_seen = event_timestamp

        if event_timestamp > last_seen:
            existing_issue.last_seen = event_timestamp

        existing_issue.priority = calculate_priority(
            existing_issue,
            event.confidence,
            repeat_observation=True,
        )

        db.commit()
        db.refresh(existing_issue)

        return existing_issue

    return create_issue_from_event(db, event)
