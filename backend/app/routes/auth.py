# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.auth.dependencies import get_current_user
from app.auth.supabase_client import supabase_auth
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, UserProfileResponse
from app.schemas.common import StandardResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=StandardResponse)
async def login(request_body: LoginRequest, db: Session = Depends(get_db)):
    """Log in a seeded user using email and password."""
    try:
        auth_data = supabase_auth.login(request_body.email, request_body.password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

    # Fetch corresponding database profile
    email_str = request_body.email.lower().strip()
    db_user = db.query(User).filter(User.email.ilike(email_str)).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User database profile not found"
        )

    response_data = LoginResponse(
        access_token=auth_data["access_token"],
        token_type=auth_data.get("token_type", "bearer"),
        expires_in=auth_data["expires_in"],
        refresh_token=auth_data["refresh_token"],
        user=UserProfileResponse.model_validate(db_user)
    )
    return StandardResponse.ok(data=response_data.model_dump())


@router.post("/logout", response_model=StandardResponse)
async def logout():
    """Logout endpoint. Client deletes JWT token; server returns OK."""
    return StandardResponse.ok(data={"message": "Logged out successfully"})


@router.get("/me", response_model=StandardResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user's database profile."""
    profile = UserProfileResponse.model_validate(current_user)
    return StandardResponse.ok(data=profile.model_dump())
