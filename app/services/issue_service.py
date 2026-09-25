from math import cos, radians
from uuid import UUID
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.core import Issue, Event


# Approximate matching distance for repeated observations.
# 50 meters is suitable for the prototype.
MATCH_DISTANCE_METERS = 50

# Window within which a re-observation from the SAME bus is considered
# a low-information repeat (e.g. the bus idling / passing twice on the
# same run) rather than an independent confirmation.
SAME_BUS_REPEAT_WINDOW = timedelta(hours=24)

# --- Noisy-OR observation weights -------------------------------------
# c_n = incoming_observation_confidence * observation_weight
NEW_OBSERVER_WEIGHT = 1.0    # new bus/route seeing the issue for the first time
SAME_BUS_REPEAT_WEIGHT = 0.3  # same bus re-observing within the window
CITIZEN_REPORT_WEIGHT = 0.5   # citizen report confirming an issue

# Citizen reports don't self-report a confidence score (unlike Events),
# so this fixed, moderate-trust value is used as the incoming
# confidence fed into fuse_confidence() for a matched citizen report.
CITIZEN_REPORT_BASE_CONFIDENCE = 0.6

# Placeholder for traffic/foot-exposure signal used by calculate_priority.
# There is no real traffic-exposure data source yet (no dedicated
# traffic-volume field on Bus/Route/Issue), so this is a neutral 0-1
# default meaning "average exposure". Revisit once real traffic event
# data exists and a proper signal can be computed per issue/route.
TRAFFIC_EXPOSURE_PLACEHOLDER = 0.5

# Severity base scores (0-100), used both to seed Issue.severity and as
# the base term of calculate_priority.
SEVERITY_SCORES = {
    "pothole": 70,
    "road_damage": 80,
    "waterlogging": 85,
    "damaged_divider": 75,
    "missing_zebra_crossing": 80,
    "damaged_traffic_sign": 65,
    "other_hazard": 60,
}

# The M5 edge pipeline sends alternate names for some of the same
# defect types above. This maps those alternate names onto the
# canonical SEVERITY_SCORES key so severity/priority scoring works
# regardless of which naming convention the sender used - it does NOT
# rename or overwrite the actual subtype stored on the Event/Issue or
# returned in API responses, only which score gets looked up.
SUBTYPE_SEVERITY_ALIASES = {
    "damaged_road": "road_damage",
    "missing_divider": "damaged_divider",
    "damaged_signboard": "damaged_traffic_sign",
}


def resolve_severity_score(subtype: str) -> int:
    """Look up a subtype's severity score, resolving known M5 aliases first."""
    canonical_subtype = SUBTYPE_SEVERITY_ALIASES.get(subtype, subtype)
    return SEVERITY_SCORES.get(canonical_subtype, 50)

# Confidence fusion cap. Without a cap, sequential noisy-OR fusion
# asymptotically approaches 1.0 as more observations arrive, which is
# unrealistic (sensor/report noise means we should never claim near
# perfect certainty). We apply a simple, well-documented ceiling: the
# fused confidence is clamped to this value. This is the simplest
# defensible approach that doesn't require reworking the observation
# history/decay bookkeeping the current model doesn't track.
CONFIDENCE_CAP = 0.97

# Severity label thresholds applied to a SEVERITY_SCORES value (0-100)
# when writing Issue.severity. SEVERITY_SCORES itself remains the
# numeric map used by calculate_priority; only the value written to
# Issue.severity is bucketed into a label.
SEVERITY_HIGH_THRESHOLD = 75
SEVERITY_MEDIUM_THRESHOLD = 60


def severity_label(score: int) -> str:
    """Bucket a SEVERITY_SCORES value into "high"/"medium"/"low"."""
    if score >= SEVERITY_HIGH_THRESHOLD:
        return "high"
    if score >= SEVERITY_MEDIUM_THRESHOLD:
        return "medium"
    return "low"


def fuse_confidence(previous_confidence: float, incoming_confidence: float, observation_weight: float) -> float:
    """
    Sequential noisy-OR fusion.

    C_n = 1 - (1 - C_(n-1)) * (1 - c_n)
    where c_n = incoming_observation_confidence * observation_weight

    `previous_confidence` and the result are both clamped to
    CONFIDENCE_CAP so repeated observations cannot drive the fused
    confidence arbitrarily close to 1.0 (see CONFIDENCE_CAP comment).
    """
    previous_confidence = max(0.0, min(previous_confidence, CONFIDENCE_CAP))

    c_n = max(0.0, min(incoming_confidence, 1.0)) * observation_weight
    c_n = max(0.0, min(c_n, 1.0))

    fused = 1 - (1 - previous_confidence) * (1 - c_n)

    return round(min(fused, CONFIDENCE_CAP), 4)


def calculate_priority(
    issue: Issue,
    confidence: float,
    repeat_observation: bool = False,
    observation_count: int = 1,
    traffic_exposure: float = TRAFFIC_EXPOSURE_PLACEHOLDER,
):
    """
    Calculate platform priority separately from AI confidence.

    Priority is a 0-100 operational urgency score. It is intentionally
    NOT the same thing as Issue.confidence (which only measures how
    sure we are the defect is real). Priority additionally factors in:

    - severity: how dangerous/disruptive this class of defect is
      (SEVERITY_SCORES, keyed by subtype).
    - confidence: how sure we are the issue is real (scaled down so it
      contributes but doesn't dominate).
    - repeat/observation count: more independent confirmations raise
      urgency, with diminishing returns.
    - traffic_exposure: how much traffic/foot exposure this issue has.
      There is no dedicated traffic-volume field on Bus/Route/Issue
      yet, so this defaults to TRAFFIC_EXPOSURE_PLACEHOLDER (a neutral
      "average exposure" placeholder) until a real traffic model
      exists. Callers with a better signal (e.g. route ridership) can
      pass it explicitly.
    - age: how long the issue has been open and unresolved. Older
      unresolved issues get a small escalating bonus, capped so this
      alone can't dominate the score.

    Returns a score from 0 to 100.
    """
    base_score = resolve_severity_score(issue.subtype)

    confidence_score = max(0.0, min(confidence, 1.0)) * 15

    # Diminishing-returns bonus for repeated/independent confirmations.
    repeat_bonus = 0
    if repeat_observation:
        repeat_bonus = min(2 + 3 * max(observation_count - 1, 0), 12)

    traffic_bonus = max(0.0, min(traffic_exposure, 1.0)) * 8

    age_bonus = 0
    first_seen = _utc_aware(issue.first_seen)
    if first_seen is not None:
        age_days = (datetime.now(timezone.utc) - first_seen).total_seconds() / 86400
        # +1 point per day unresolved, capped at 10.
        age_bonus = min(max(age_days, 0) * 1.0, 10)

    priority = (
        base_score
        + confidence_score
        + repeat_bonus
        + traffic_bonus
        + age_bonus
    )

    return min(round(priority, 2), 100)


def get_observation_count(db: Session, issue_id: str) -> int:
    """
    Number of Events currently linked to this Issue via Event.issue_id -
    i.e. the count already used internally by process_event_for_issue's
    fusion/priority logic, exposed here for API responses (IssueOut.
    observation_count). Computed on-the-fly rather than stored, since
    this is a hackathon-scale prototype with modest data volume; an
    extra COUNT query per issue read is a non-issue at this scale, and
    it avoids having to keep a denormalized counter column in sync.
    Citizen reports are intentionally NOT counted here - "observations"
    means Events (bus/route detections), not citizen reports.
    """
    return db.query(Event).filter(Event.issue_id == issue_id).count()


def _attach_observation_count(db: Session, issue: Issue) -> Issue:
    """Set a transient (non-column) attribute IssueOut reads via from_attributes."""
    if issue is not None:
        issue.observation_count = get_observation_count(db, issue.id)

    return issue


def list_issues(db: Session):
    issues = db.query(Issue).order_by(Issue.last_seen.desc()).all()

    for issue in issues:
        _attach_observation_count(db, issue)

    return issues


def get_issue(db: Session, issue_id: str):
    try:
        UUID(issue_id)
    except (ValueError, TypeError, AttributeError):
        return None

    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    return _attach_observation_count(db, issue)


def update_issue_status(db: Session, issue_id: str, status: str):
    issue = get_issue(db, issue_id)

    if not issue:
        return None

    issue.status = status
    db.commit()
    db.refresh(issue)

    return _attach_observation_count(db, issue)  # db.refresh() dropped the transient attribute


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


def find_matching_issue(db: Session, lat: float, lng: float, type_: str, subtype: str):
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
            Issue.type == type_,
            Issue.subtype == subtype,
        )
        .all()
    )

    for issue in issues:
        distance = distance_meters(
            issue.lat,
            issue.lng,
            lat,
            lng,
        )

        if distance <= MATCH_DISTANCE_METERS:
            return issue

    return None


def find_matching_issue_for_event(db: Session, event: Event):
    """Backwards-compatible wrapper matching an Event to an Issue."""
    return find_matching_issue(db, event.lat, event.lng, event.type, event.subtype)


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


def _same_bus_recent_observation(db: Session, issue: Issue, event: Event) -> bool:
    """
    True if this event's bus already has a prior Event linked to this
    issue within SAME_BUS_REPEAT_WINDOW (i.e. this is a low-information
    repeat rather than an independent confirmation).
    """
    window_start = _utc_aware(event.timestamp) - SAME_BUS_REPEAT_WINDOW
    window_end = _utc_aware(event.timestamp) + SAME_BUS_REPEAT_WINDOW

    prior = (
        db.query(Event)
        .filter(
            Event.issue_id == issue.id,
            Event.bus_id == event.bus_id,
            Event.id != event.id,
        )
        .all()
    )

    for other in prior:
        other_ts = _utc_aware(other.timestamp)
        if other_ts is None:
            continue
        if window_start <= other_ts <= window_end:
            return True

    return False


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
        confidence=0.0,
        status="unresolved",
        first_seen=event.timestamp,
        last_seen=event.timestamp,
    )

    db.add(issue)
    db.flush()

    # First observation: fuse from a prior confidence of 0.0 with the
    # "new observer" weight of 1.0.
    issue.confidence = fuse_confidence(0.0, event.confidence, NEW_OBSERVER_WEIGHT)
    issue.severity = severity_label(resolve_severity_score(issue.subtype))

    issue.priority = calculate_priority(
        issue,
        issue.confidence,
        repeat_observation=False,
        observation_count=1,
    )

    event.issue_id = issue.id

    db.commit()
    db.refresh(issue)

    return _attach_observation_count(db, issue)


def process_event_for_issue(db: Session, event: Event):
    """
    Fusion entry point.

    If a matching Issue already exists:
    - attach the Event to it
    - update first_seen/last_seen
    - fuse the event's confidence into Issue.confidence via
      sequential noisy-OR, weighted by whether this is a new
      observer (bus/route) or a same-bus repeat within 24h
    - recalculate priority (kept separate from confidence)

    Otherwise:
    - create a new Issue
    """
    existing_issue = find_matching_issue_for_event(db, event)

    if existing_issue:
        # Determine observation weight BEFORE attaching the event,
        # so the "same bus" lookup doesn't see this event itself.
        is_same_bus_repeat = _same_bus_recent_observation(db, existing_issue, event)
        weight = SAME_BUS_REPEAT_WEIGHT if is_same_bus_repeat else NEW_OBSERVER_WEIGHT

        event.issue_id = existing_issue.id

        event_timestamp = _utc_aware(event.timestamp)
        first_seen = _utc_aware(existing_issue.first_seen)
        last_seen = _utc_aware(existing_issue.last_seen)

        if event_timestamp < first_seen:
            existing_issue.first_seen = event_timestamp

        if event_timestamp > last_seen:
            existing_issue.last_seen = event_timestamp

        existing_issue.confidence = fuse_confidence(
            existing_issue.confidence or 0.0,
            event.confidence,
            weight,
        )

        observation_count = (
            db.query(Event).filter(Event.issue_id == existing_issue.id).count()
        )

        existing_issue.priority = calculate_priority(
            existing_issue,
            existing_issue.confidence,
            repeat_observation=True,
            observation_count=observation_count,
        )

        db.commit()
        db.refresh(existing_issue)

        return _attach_observation_count(db, existing_issue)

    return create_issue_from_event(db, event)
