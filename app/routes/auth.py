from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import LoginRequest, TokenResponse
from app.services.auth_service import (
    authenticate_authority,
    create_access_token,
)


router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
)


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
):
    authority = authenticate_authority(
        db,
        payload.email,
        payload.password,
    )

    if authority is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(
        authority_id=str(authority.id),
        role=authority.role,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": authority.role,
    }