from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.core import IssueOut, IssueStatusUpdate
from app.services.issue_service import (
    list_issues,
    get_issue,
    update_issue_status,
)


router = APIRouter(prefix="/issues", tags=["issues"])


@router.get("", response_model=list[IssueOut])
def get_issues(db: Session = Depends(get_db)):
    return list_issues(db)


@router.get("/{issue_id}", response_model=IssueOut)
def get_issue_by_id(
    issue_id: str,
    db: Session = Depends(get_db),
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
):
    issue = update_issue_status(db, issue_id, payload.status)

    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    return issue