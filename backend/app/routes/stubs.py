# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Request
from app.schemas.common import StandardResponse

router = APIRouter(tags=["Stub Endpoints"])

_NOT_IMPLEMENTED = "Not implemented yet in Phase 0"





@router.get("/api/quizzes", response_model=StandardResponse, status_code=501)
async def quizzes_stub(request: Request):
    return StandardResponse.error_response(
        code="NOT_IMPLEMENTED",
        message=f"Quizzes endpoint — {_NOT_IMPLEMENTED}",
        request_id=request.state.request_id,
    )


@router.get("/api/flashcards", response_model=StandardResponse, status_code=501)
async def flashcards_stub(request: Request):
    return StandardResponse.error_response(
        code="NOT_IMPLEMENTED",
        message=f"Flashcards endpoint — {_NOT_IMPLEMENTED}",
        request_id=request.state.request_id,
    )


@router.get("/api/analytics", response_model=StandardResponse, status_code=501)
async def analytics_stub(request: Request):
    return StandardResponse.error_response(
        code="NOT_IMPLEMENTED",
        message=f"Analytics endpoint — {_NOT_IMPLEMENTED}",
        request_id=request.state.request_id,
    )
