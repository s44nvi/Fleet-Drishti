from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_authority, require_authority
from app.schemas.core import EvidenceCreate, EvidenceOut
from app.services import evidence_service


router = APIRouter(prefix="/evidence", tags=["evidence"])


@router.post("", response_model=EvidenceOut, status_code=201)
def create_evidence(
    payload: EvidenceCreate,
    db: Session = Depends(get_db),
    current_authority: dict = Depends(require_authority),
):
    return evidence_service.create_evidence(db, payload)


@router.get("", response_model=list[EvidenceOut])
def get_evidence(
    db: Session = Depends(get_db),
    current_authority: dict = Depends(get_current_authority),
):
    return evidence_service.list_evidence(db)


@router.get("/{evidence_id}", response_model=EvidenceOut)
def get_evidence_by_id(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_authority: dict = Depends(get_current_authority),
):
    return evidence_service.get_evidence(db, evidence_id)