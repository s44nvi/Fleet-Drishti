from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_authority, require_authority
from app.schemas.core import EventCreate, EventOut
from app.services import event_service

router = APIRouter(prefix="/events", tags=["events"])


@router.post("", response_model=EventOut, status_code=201)
def create_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
    current_authority: dict = Depends(require_authority),
):
    """
    M5 posts detections here.

    This is the M1 -> M5 -> M4 handoff point.
    The event is stored first; persistent Issue/fusion logic
    will group repeated observations separately.
    """
    return event_service.create_event(db, payload)


@router.get("", response_model=list[EventOut])
def get_events(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_authority: dict = Depends(get_current_authority),
):
    """M3 pulls this to render pins on the map."""
    return event_service.list_events(db, skip, limit)


@router.get("/{event_id}", response_model=EventOut)
def get_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_authority: dict = Depends(get_current_authority),
):
    return event_service.get_event(db, event_id)