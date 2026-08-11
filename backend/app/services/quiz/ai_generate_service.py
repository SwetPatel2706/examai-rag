from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.quiz import (
    QuizDraftQuestionOut,
    QuizGenerateRequest,
    QuizQuestionLLMOutput,
)
from app.services.rag.retriever import MaterialRetriever, build_context
from app.utils.gemini_client import GeminiClient, StructuredOutputError
from app.utils.retry import generate_json_with_retry


class AIQuizGenerateService:
    """AI-assisted quiz generation: same retriever and structured-output retry
    conventions as chat/flashcards. Returns draft questions WITHOUT inserting
    them — a teacher must review/edit before saving a quiz and publishing."""

    def __init__(self, retriever=None, llm=None):
        self.retriever = retriever or MaterialRetriever()
        self.llm = llm or GeminiClient()

    def generate_draft(
        self, db: Session, user: User, request: QuizGenerateRequest
    ) -> list[QuizDraftQuestionOut]:
        query = f"Create quiz questions about the topic '{request.topic}' from the supplied material."
        chunks = self.retriever.retrieve_for(query, db, user, request.subject_id, request.material_ids)
        context = build_context(chunks)
        if not context:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Selected materials have no searchable content yet.",
            )
        output = generate_json_with_retry(
            self.llm,
            self._prompt(request, context),
            QuizQuestionLLMOutput,
            http_error_detail="The quiz generation service returned an invalid response.",
            validate=lambda item: _check_question_count(item, request.question_count),
            retry_instruction=f"Return exactly {request.question_count} questions.",
        )
        return [QuizDraftQuestionOut(**item.model_dump()) for item in output.questions]

    @staticmethod
    def _prompt(request: QuizGenerateRequest, context: str) -> str:
        return (
            f"Create exactly {request.question_count} multiple-choice quiz questions on the topic "
            f"'{request.topic}'. Use only the supplied context; do not invent facts. Each question "
            "must have 2-8 unique options, a correct_option that exactly matches one of the options, "
            "a topic_tag derived from the material, and a difficulty of easy, medium, or hard. "
            "Return JSON matching the requested schema.\n\n"
            f"TOPIC:\n{request.topic}\n\nCONTEXT:\n{context}"
        )


def _check_question_count(output: QuizQuestionLLMOutput, expected: int) -> None:
    if len(output.questions) != expected:
        raise StructuredOutputError(
            f"Expected {expected} questions, got {len(output.questions)}",
            output.model_dump_json(),
        )
