from typing import Any, Dict
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Request
# pyrefly: ignore [missing-import]
from fastapi.responses import JSONResponse
from app.config import settings
from app.schemas.common import StandardResponse

router = APIRouter(prefix="/health", tags=["Health"])

# Required integration settings — if any are absent, the service cannot
# operate correctly.  The dependency check returns 503 so load balancers and
# readiness probes can remove the instance from rotation.
_REQUIRED_SETTINGS = {
    "database": "DATABASE_URL",
    "supabase": "SUPABASE_URL",
    "qdrant": "QDRANT_URL",
    "gemini": "GEMINI_API_KEY",
}


@router.get("", response_model=StandardResponse)
async def health_check(request: Request) -> Dict[str, Any]:
    request_id = getattr(request.state, "request_id", "")
    return StandardResponse.ok(
        data={"status": "healthy", "environment": settings.APP_ENV}
    ).model_dump()


@router.get("/dependencies", response_model=StandardResponse)
async def health_dependencies(request: Request):
    """
    Evaluate required integration settings and return 200 (all configured)
    or 503 (one or more missing).  Values are never echoed — only presence
    is checked, so secrets are not leaked.
    """
    request_id = getattr(request.state, "request_id", "")

    dependency_status: Dict[str, str] = {}
    missing: list[str] = []

    for label, attr in _REQUIRED_SETTINGS.items():
        value = getattr(settings, attr, None)
        if value and str(value).strip():
            dependency_status[label] = "configured"
        else:
            dependency_status[label] = "missing"
            missing.append(label)

    all_healthy = len(missing) == 0

    if all_healthy:
        return StandardResponse.ok(
            data={"status": "healthy", "dependencies": dependency_status}
        ).model_dump()

    # Return 503 so readiness/liveness probes fail appropriately.
    body = StandardResponse.error_response(
        code="DEPENDENCY_MISSING",
        message=f"Required dependencies not configured: {', '.join(missing)}",
        request_id=request_id,
        details={"dependencies": dependency_status},
    )
    return JSONResponse(status_code=503, content=body.model_dump())
