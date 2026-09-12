from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.core import Event, Bus
from app.schemas.core import EventCreate
from app.services.issue_service import process_event_for_issue


def create_event(db: Session, payload: EventCreate) -> Event:
    # Validate bus_id exists — protects data integrity before insert
    bus = db.query(Bus).filter(Bus.id == payload.bus_id).first()
    if not bus:
        raise HTTPException(
            status_code=404,
            detail=f"bus_id '{payload.bus_id}' not found"
        )

    event = Event(
        type=payload.type,
        subtype=payload.subtype,
        confidence=payload.confidence,
        lat=payload.gps.lat,
        lng=payload.gps.lng,
        timestamp=payload.timestamp,
        bus_id=payload.bus_id,
        route_id=payload.route_id,
        camera_id=payload.camera_id,
    )

    db.add(event)
    db.flush()

    # Create a new persistent Issue or attach this observation
    # to an existing nearby Issue.
    process_event_for_issue(db, event)

    db.refresh(event)
    return event


def list_events(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(Event)
        .order_by(Event.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_event(db: Session, event_id: str) -> Event:
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=404,
            detail=f"event '{event_id}' not found"
        )

    return event