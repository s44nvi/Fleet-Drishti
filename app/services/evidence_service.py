from uuid import UUID

from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.core import Evidence, Event, Bus
from app.schemas.core import EvidenceCreate


def create_evidence(db: Session, payload: EvidenceCreate) -> Evidence:
    # Validate event_id format before querying PostgreSQL
    try:
        UUID(payload.event_id)
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(
            status_code=404,
            detail=f"event_id '{payload.event_id}' not found"
        )

    # Validate event exists
    event = db.query(Event).filter(Event.id == payload.event_id).first()
    if not event:
        raise HTTPException(
            status_code=404,
            detail=f"event_id '{payload.event_id}' not found"
        )

    # Validate bus_id format before querying PostgreSQL
    try:
        UUID(payload.bus_id)
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(
            status_code=404,
            detail=f"bus_id '{payload.bus_id}' not found"
        )

    # Validate bus exists
    bus = db.query(Bus).filter(Bus.id == payload.bus_id).first()
    if not bus:
        raise HTTPException(
            status_code=404,
            detail=f"bus_id '{payload.bus_id}' not found"
        )

    evidence = Evidence(
        event_id=payload.event_id,
        frame_path=payload.frame_path,
        video_path=payload.video_path,
        timestamp=payload.timestamp,
        lat=payload.gps.lat,
        lng=payload.gps.lng,
        bus_id=payload.bus_id,
        route_id=payload.route_id,
        confidence=payload.confidence,
    )

    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    return evidence


def list_evidence(db: Session):
    return (
        db.query(Evidence)
        .order_by(Evidence.timestamp.desc())
        .all()
    )


def get_evidence(db: Session, evidence_id: str):
    # Validate evidence_id format before querying PostgreSQL
    try:
        UUID(evidence_id)
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(
            status_code=404,
            detail=f"evidence '{evidence_id}' not found"
        )

    evidence = (
        db.query(Evidence)
        .filter(Evidence.id == evidence_id)
        .first()
    )

    if not evidence:
        raise HTTPException(
            status_code=404,
            detail=f"evidence '{evidence_id}' not found"
        )

    return evidence