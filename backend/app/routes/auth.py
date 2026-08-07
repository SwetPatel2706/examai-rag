# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.config import settings
from app.db.session import get_db
from app.auth.dependencies import get_current_user
from app.auth.supabase_client import supabase_auth
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, UserProfileResponse
from app.schemas.common import StandardResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
security = HTTPBearer()

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# The refresh token is an HttpOnly cookie (JS can never read it), scoped to
# /api/auth so it is only sent to login/refresh/logout. Secure only over
# HTTPS; local dev (http://localhost) must leave it off.
REFRESH_COOKIE_NAME = "examai_refresh"
REFRESH_COOKIE_PATH = "/api/auth"
REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30  # 30 days, Supabase session lifetime


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=REFRESH_COOKIE_MAX_AGE,
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="lax",
        path=REFRESH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)

@router.post("/login", response_model=StandardResponse)
async def login(request_body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    """Log in a seeded user using email and password.

    The refresh token is delivered as an HttpOnly cookie and never returned
    to JavaScript as the primary storage channel; the access token stays in
    the JSON body for the Bearer header.
    """
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

    _set_refresh_cookie(response, auth_data["refresh_token"])

    response_data = LoginResponse(
        access_token=auth_data["access_token"],
        token_type=auth_data.get("token_type", "bearer"),
        expires_in=auth_data["expires_in"],
        user=UserProfileResponse.model_validate(db_user)
    )
    return StandardResponse.ok(data=response_data.model_dump())


@router.post("/refresh", response_model=StandardResponse)
async def refresh(request: Request, response: Response):
    """Silent re-auth: exchange the HttpOnly refresh cookie for a fresh access
    token. Supabase rotates the refresh token on every call, so the cookie is
    re-issued here. No Authorization header required — the cookie is the
    credential."""
    token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token"
        )
    try:
        auth_data = await supabase_auth.refresh(token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    new_refresh_token = auth_data.get("refresh_token")
    if new_refresh_token:
        _set_refresh_cookie(response, new_refresh_token)
    return StandardResponse.ok(data={
        "access_token": auth_data["access_token"],
        "token_type": auth_data.get("token_type", "bearer"),
        "expires_in": auth_data.get("expires_in", 3600),
    })


@router.post("/logout", response_model=StandardResponse)
async def logout(
    response: Response,
    current_user: User = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Logout endpoint. Client deletes JWT token; server clears the refresh
    cookie and returns OK."""
    try:
        await supabase_auth.logout(credentials.credentials)
    except Exception as e:
        import logging
        logging.error(f"Logout failed on remote server: {type(e).__name__} {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to log out from remote authentication server."
        )
    _clear_refresh_cookie(response)
    return StandardResponse.ok(data={"message": "Logged out successfully"})


@router.get("/me", response_model=StandardResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user's database profile."""
    profile = UserProfileResponse.model_validate(current_user)
    return StandardResponse.ok(data=profile.model_dump())
