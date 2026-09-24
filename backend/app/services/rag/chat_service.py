from uuid import UUID

from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.chat import ChatLLMOutput, ChatResponse
from app.services.rag.citation import resolve_citations
from app.services.rag.retriever import MaterialRetriever, build_context
from app.utils.gemini_client import GeminiClient, StructuredOutputError
from app.utils.retry import generate_json_with_retry


class ChatService:
    def __init__(self, retriever=None, llm=None):
        self.retriever = retriever or MaterialRetriever()
        self.llm = llm or GeminiClient()

    def answer(self, db: Session, user: User, subject_id: UUID, material_ids: list[UUID], question: str) -> ChatResponse:
        chunks = self.retriever.retrieve_for(question, db, user, subject_id, material_ids)
        context = build_context(chunks)
        if not context:
            return ChatResponse(answer_text="I couldn't find relevant information in the selected materials.", citations=[])

        prompt = self._prompt(question, context)

        def validate(output: ChatLLMOutput) -> None:
            valid_markers = {c.number for c in chunks}
            invalid_markers = [m for m in output.source_markers if m not in valid_markers]
            if invalid_markers:
                raise StructuredOutputError(
                    f"Output contains invalid source markers: {invalid_markers}",
                    output.model_dump_json()
                )

        output = generate_json_with_retry(
            self.llm,
            prompt,
            ChatLLMOutput,
            http_error_detail="The answer service returned an invalid response. Please try again.",
            validate=validate,
            retry_instruction="Include only the schema fields answer_text and source_markers.",
        )
        citations = resolve_citations(output.source_markers, chunks)
        return ChatResponse(answer_text=output.answer_text, citations=citations)

    @staticmethod
    def _prompt(question: str, context: str) -> str:
        return ("Answer the student's question using only the supplied context. "
                "If the context is insufficient, say so clearly. Every factual claim "
                "must be supported by one or more source_markers. Return JSON matching "
                "the requested schema.\n\nQUESTION:\n" + question + "\n\nCONTEXT:\n" + context)
