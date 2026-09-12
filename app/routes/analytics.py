from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_authority
from app.services import analytics_service


router = APIRouter(
    prefix="/analytics",
    tags=["analytics"],
)


@router.get("")
def get_analytics(
    db: Session = Depends(get_db),
    current_authority: dict = Depends(get_current_authority),
):
    return analytics_service.get_overview(db)


@router.get("/defects")
def get_defects(
    db: Session = Depends(get_db),
    current_authority: dict = Depends(get_current_authority),
):
    return analytics_service.get_defects(db)


@router.get("/congestion")
def get_congestion(
    db: Session = Depends(get_db),
    current_authority: dict = Depends(get_current_authority),
):
    return analytics_service.get_congestion(db)


@router.get("/routes")
def get_routes_analytics(
    db: Session = Depends(get_db),
    current_authority: dict = Depends(get_current_authority),
):
    return analytics_service.get_routes(db)


@router.get("/coverage")
def get_coverage(
    db: Session = Depends(get_db),
    current_authority: dict = Depends(get_current_authority),
):
    return analytics_service.get_coverage(db)