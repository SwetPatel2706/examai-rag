import uuid
import time
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Request
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from fastapi.responses import JSONResponse

from app.config import settings
from app.routes import health
from app.schemas.common import ErrorDetail, StandardResponse

app = FastAPI(
    title="ExamAI API",
    description="Backend API for ExamAI RAG-based exam prep platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
# Wildcards for allow_methods/allow_headers are intentionally avoided:
# combining allow_credentials=True with wildcard methods/headers is a
# security anti-pattern (browsers ignore the wildcard restriction for
# credentialed cross-origin requests in some implementations).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


@app.middleware("http")
async def add_request_id_and_timing(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    start_time = time.time()

    response = await call_next(request)

    process_time = time.time() - start_time
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    error_response = StandardResponse.error_response(
        code="INTERNAL_SERVER_ERROR",
        message=str(exc) if settings.APP_ENV == "local" else "An unexpected error occurred.",
        request_id=request_id
    )
    return JSONResponse(
        status_code=500,
        content=error_response.model_dump()
    )


# Include routers
app.include_router(health.router)
from app.routes import stubs
app.include_router(stubs.router)
