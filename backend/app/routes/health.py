from typing import Any, Dict
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException, status
from app.config import settings
from app.schemas.common import StandardResponse

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", response_model=StandardResponse)
async def health_check() -> Dict[str, Any]:
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "environment": settings.APP_ENV
        }
    }


@router.get("/dependencies", response_model=StandardResponse)
async def health_dependencies() -> Dict[str, Any]:
    # Placeholder reporting dependency status without exposing secrets
    dependencies_status = {
        "database": "configured" if settings.DATABASE_URL else "missing",
        "supabase": "configured" if settings.SUPABASE_URL else "missing",
        "qdrant": "configured" if settings.QDRANT_URL else "missing",
        "gemini": "configured" if settings.GEMINI_API_KEY else "missing",
    }
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "dependencies": dependencies_status
        }
    }
