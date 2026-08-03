# pyrefly: ignore [missing-import]
from fastapi import APIRouter
from app.schemas.common import StandardResponse

router = APIRouter(tags=["Stub Endpoints"])

_NOT_IMPLEMENTED = "Not implemented yet in Phase 0"


@router.post("/api/auth/login", response_model=StandardResponse, status_code=501)
async def login_stub():
    return StandardResponse.error_response(
        code="NOT_IMPLEMENTED",
        message=f"Auth endpoint — {_NOT_IMPLEMENTED}",
        request_id="",
    )


@router.get("/api/subjects", response_model=StandardResponse, status_code=501)
async def subjects_stub():
    return StandardResponse.error_response(
        code="NOT_IMPLEMENTED",
        message=f"Subjects endpoint — {_NOT_IMPLEMENTED}",
        request_id="",
    )


@router.get("/api/materials", response_model=StandardResponse, status_code=501)
async def materials_stub():
    return StandardResponse.error_response(
        code="NOT_IMPLEMENTED",
        message=f"Materials endpoint — {_NOT_IMPLEMENTED}",
        request_id="",
    )


@router.post("/api/chat", response_model=StandardResponse, status_code=501)
async def chat_stub():
    return StandardResponse.error_response(
        code="NOT_IMPLEMENTED",
        message=f"Chat endpoint — {_NOT_IMPLEMENTED}",
        request_id="",
    )


@router.get("/api/quizzes", response_model=StandardResponse, status_code=501)
async def quizzes_stub():
    return StandardResponse.error_response(
        code="NOT_IMPLEMENTED",
        message=f"Quizzes endpoint — {_NOT_IMPLEMENTED}",
        request_id="",
    )


@router.get("/api/flashcards", response_model=StandardResponse, status_code=501)
async def flashcards_stub():
    return StandardResponse.error_response(
        code="NOT_IMPLEMENTED",
        message=f"Flashcards endpoint — {_NOT_IMPLEMENTED}",
        request_id="",
    )


@router.get("/api/analytics", response_model=StandardResponse, status_code=501)
async def analytics_stub():
    return StandardResponse.error_response(
        code="NOT_IMPLEMENTED",
        message=f"Analytics endpoint — {_NOT_IMPLEMENTED}",
        request_id="",
    )
