from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.core import Bus, Route


def list_buses(db: Session):
    return db.query(Bus).all()


def get_bus(db: Session, bus_id: str) -> Bus:
    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail=f"bus '{bus_id}' not found")
    return bus


def list_routes(db: Session):
    return db.query(Route).all()
