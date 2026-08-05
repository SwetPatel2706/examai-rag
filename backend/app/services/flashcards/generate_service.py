from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.flashcard import Flashcard, FlashcardDeck
from app.models.user import User
from app.schemas.flashcard import FlashcardGenerationRequest, FlashcardLLMOutput
from app.services.rag.retriever import MaterialRetriever, build_context
from app.utils.gemini_client import GeminiClient, StructuredOutputError


class FlashcardService:
    def __init__(self, retriever=None, llm=None):
        self.retriever = retriever or MaterialRetriever()
        self.llm = llm or GeminiClient()

    def generate(self, db: Session, user: User, request: FlashcardGenerationRequest) -> FlashcardDeck:
        chunks = self.retriever.retrieve_for("Create study flashcards from the selected material.", db, user, request.subject_id, request.material_ids)
        context = build_context(chunks)
        if not context:
            raise HTTPException(status_code=409, detail="Selected materials have no searchable content yet.")
        prompt = (f"Create {request.card_count} concise study flashcards from only this context. "
                  "Do not invent facts. Return JSON matching the schema.\n\nCONTEXT:\n" + context)
        try:
            output = self.llm.generate_json(prompt, FlashcardLLMOutput)
            if len(output.cards) != request.card_count:
                raise StructuredOutputError(
                    f"Expected {request.card_count} cards, got {len(output.cards)}",
                    output.model_dump_json()
                )
        except StructuredOutputError as exc:
            bad_response = getattr(exc, "raw_response", "<response unavailable>")
            retry = prompt + (f"\n\nPrevious response validation error: {exc}\n"
                              f"Previous full response:\n{bad_response}\nReturn only valid JSON.")
            try:
                output = self.llm.generate_json(retry, FlashcardLLMOutput)
                if len(output.cards) != request.card_count:
                    raise StructuredOutputError(
                        f"Expected {request.card_count} cards, got {len(output.cards)}",
                        output.model_dump_json()
                    )
            except StructuredOutputError as retry_exc:
                raise HTTPException(status_code=502, detail="The flashcard service returned an invalid response.") from retry_exc

        deck = FlashcardDeck(student_id=user.id, subject_id=request.subject_id,
                             source_material_ids=[str(value) for value in request.material_ids],
                             title=request.title or "Generated flashcards")
        deck.cards = [Flashcard(front=card.front, back=card.back, mastery_state="new") for card in output.cards]
        db.add(deck)
        db.commit()
        db.refresh(deck)
        return deck


def get_owned_deck(db: Session, user: User, deck_id: UUID) -> FlashcardDeck:
    deck = db.query(FlashcardDeck).filter(FlashcardDeck.id == deck_id, FlashcardDeck.student_id == user.id).first()
    if not deck:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flashcard deck not found")
    return deck


def get_owned_card(db: Session, user: User, card_id: UUID) -> Flashcard:
    card = (db.query(Flashcard).join(FlashcardDeck)
            .filter(Flashcard.id == card_id, FlashcardDeck.student_id == user.id).first())
    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flashcard not found")
    return card
