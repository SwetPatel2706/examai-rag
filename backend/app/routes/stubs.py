from fastapi import APIRouter
from app.schemas.common import StandardResponse, ErrorDetail

router = APIRouter(tags=["Stub Endpoints"])


@router.post("/api/auth/login", response_model=StandardResponse, status_code=501)
async def login_stub():
    return StandardResponse(
        success=False,
        error=ErrorDetail(code="NOT_IMPLEMENTED", message="Auth endpoint not implemented yet in Phase 0")
    )


@router.get("/api/subjects", response_model=StandardResponse, status_code=501)
async def subjects_stub():
    return StandardResponse(
        success=False,
        error=ErrorDetail(code="NOT_IMPLEMENTED", message="Subjects endpoint not implemented yet in Phase 0")
    )


@router.get("/api/materials", response_model=StandardResponse, status_code=501)
async def materials_stub():
    return StandardResponse(
        success=False,
        error=ErrorDetail(code="NOT_IMPLEMENTED", message="Materials endpoint not implemented yet in Phase 0")
    )


@router.post("/api/chat", response_model=StandardResponse, status_code=501)
async def chat_stub():
    return StandardResponse(
        success=False,
        error=ErrorDetail(code="NOT_IMPLEMENTED", message="Chat endpoint not implemented yet in Phase 0")
    )


@router.get("/api/quizzes", response_model=StandardResponse, status_code=501)
async def quizzes_stub():
    return StandardResponse(
        success=False,
        error=ErrorDetail(code="NOT_IMPLEMENTED", message="Quizzes endpoint not implemented yet in Phase 0")
    )


@router.get("/api/flashcards", response_model=StandardResponse, status_code=501)
async def flashcards_stub():
    return StandardResponse(
        success=False,
        error=ErrorDetail(code="NOT_IMPLEMENTED", message="Flashcards endpoint not implemented yet in Phase 0")
    )


@router.get("/api/analytics", response_model=StandardResponse, status_code=501)
async def analytics_stub():
    return StandardResponse(
        success=False,
        error=ErrorDetail(code="NOT_IMPLEMENTED", message="Analytics endpoint not implemented yet in Phase 0")
    )
