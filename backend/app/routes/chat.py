from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_student
from app.db.session import get_db
from app.models.user import User
from app.schemas.chat import ChatRequest
from app.services.rag.chat_service import ChatService
from app.schemas.common import StandardResponse

router = APIRouter(tags=["Chat"])


@router.post("/api/chat", response_model=StandardResponse)
def chat(request: ChatRequest, current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    result = ChatService().answer(db, current_user, request.subject_id, request.selected_material_ids, request.question)
    return StandardResponse.ok(data=result.model_dump(mode="json"))

