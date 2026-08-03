# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.auth.dependencies import get_current_user
from app.auth.supabase_client import supabase_auth
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, UserProfileResponse
from app.schemas.common import StandardResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
security = HTTPBearer()

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=StandardResponse)
async def login(request_body: LoginRequest, db: Session = Depends(get_db)):
    """Log in a seeded user using email and password."""
    try:
        auth_data = await supabase_auth.login(request_body.email, request_body.password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

    import uuid
    # Fetch corresponding database profile
    try:
        user_uuid = uuid.UUID(auth_data["user"]["id"])
    except (KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user id in auth data"
        )
    
    db_user = db.query(User).filter(User.id == user_uuid).first()
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
async def logout(
    current_user: User = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Logout endpoint. Client deletes JWT token; server returns OK."""
    try:
        await supabase_auth.logout(credentials.credentials)
    except Exception:
        pass
    return StandardResponse.ok(data={"message": "Logged out successfully"})


@router.get("/me", response_model=StandardResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user's database profile."""
    profile = UserProfileResponse.model_validate(current_user)
    return StandardResponse.ok(data=profile.model_dump())
