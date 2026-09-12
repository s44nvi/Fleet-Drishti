from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_authority
from app.schemas.core import BusOut, RouteOut
from app.services import fleet_service

router = APIRouter(tags=["fleet"])


@router.get("/buses", response_model=list[BusOut])
def get_buses(
    db: Session = Depends(get_db),
    current_authority: dict = Depends(get_current_authority),
):
    return fleet_service.list_buses(db)


@router.get("/buses/{bus_id}", response_model=BusOut)
def get_bus(
    bus_id: str,
    db: Session = Depends(get_db),
    current_authority: dict = Depends(get_current_authority),
):
    return fleet_service.get_bus(db, bus_id)


@router.get("/routes", response_model=list[RouteOut])
def get_routes(
    db: Session = Depends(get_db),
    current_authority: dict = Depends(get_current_authority),
):
    return fleet_service.list_routes(db)