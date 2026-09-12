from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_authority, require_authority
from app.schemas.core import IssueOut, IssueStatusUpdate
from app.services.issue_service import (
    list_issues,
    get_issue,
    update_issue_status,
)


router = APIRouter(prefix="/issues", tags=["issues"])


@router.get("", response_model=list[IssueOut])
def get_issues(
    db: Session = Depends(get_db),
    current_authority: dict = Depends(get_current_authority),
):
    return list_issues(db)


@router.get("/{issue_id}", response_model=IssueOut)
def get_issue_by_id(
    issue_id: str,
    db: Session = Depends(get_db),
    current_authority: dict = Depends(get_current_authority),
):
    issue = get_issue(db, issue_id)

    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    return issue


@router.patch("/{issue_id}/status", response_model=IssueOut)
def patch_issue_status(
    issue_id: str,
    payload: IssueStatusUpdate,
    db: Session = Depends(get_db),
    current_authority: dict = Depends(require_authority),
):
    issue = update_issue_status(db, issue_id, payload.status)

    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    return issue