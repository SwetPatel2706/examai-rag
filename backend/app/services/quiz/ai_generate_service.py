from uuid import UUID

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
        output = self._generate_with_retry(request, context)
        return [QuizDraftQuestionOut(**item.model_dump()) for item in output.questions]

    def _generate_with_retry(self, request: QuizGenerateRequest, context: str) -> QuizQuestionLLMOutput:
        prompt = self._prompt(request, context)
        for attempt in range(2):
            try:
                try:
                    output = self.llm.generate_json(prompt, QuizQuestionLLMOutput)
                except Exception as exc:
                    if isinstance(exc, StructuredOutputError):
                        raise
                    raise StructuredOutputError(f"API Error: {exc}", "") from exc
                
                if len(output.questions) != request.question_count:
                    raise StructuredOutputError(
                        f"Expected {request.question_count} questions, got {len(output.questions)}",
                        output.model_dump_json(),
                    )
                return output
            except StructuredOutputError as exc:
                prompt = self._retry_prompt(prompt, request, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The quiz generation service returned an invalid response.",
        )

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

    @staticmethod
    def _retry_prompt(prompt: str, request: QuizGenerateRequest, error: Exception) -> str:
        bad_response = getattr(error, "raw_response", "<response unavailable>")
        return (
            prompt
            + "\n\nYour previous response failed validation. "
            f"Verbatim validation error: {error}\nPrevious full response:\n{bad_response}\n"
            f"Return exactly {request.question_count} questions as valid JSON matching the schema."
        )
