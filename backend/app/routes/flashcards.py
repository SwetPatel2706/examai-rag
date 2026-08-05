from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_student
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import StandardResponse
from app.schemas.flashcard import (
    FlashcardDeckResponse,
    FlashcardGenerationRequest,
    FlashcardMasteryUpdate,
    FlashcardResponse,
)
from app.services.flashcards.generate_service import FlashcardService, get_owned_card, get_owned_deck

router = APIRouter(prefix="/api", tags=["Flashcards"])


def _deck_response(deck):
    return FlashcardDeckResponse.model_validate(deck).model_dump(mode="json")


@router.post("/flashcard-decks", response_model=StandardResponse, status_code=201)
def generate_deck(request: FlashcardGenerationRequest, current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    deck = FlashcardService().generate(db, current_user, request)
    return StandardResponse.ok(data=_deck_response(deck))


@router.get("/flashcard-decks", response_model=StandardResponse)
def list_decks(current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    from app.models.flashcard import FlashcardDeck
    decks = db.query(FlashcardDeck).filter(FlashcardDeck.student_id == current_user.id).order_by(FlashcardDeck.created_at.desc()).all()
    return StandardResponse.ok(data=[_deck_response(deck) for deck in decks])


@router.get("/flashcard-decks/{deck_id}", response_model=StandardResponse)
def get_deck(deck_id: UUID, current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    return StandardResponse.ok(data=_deck_response(get_owned_deck(db, current_user, deck_id)))


@router.get("/flashcard-decks/{deck_id}/cards", response_model=StandardResponse)
def get_cards(deck_id: UUID, current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    deck = get_owned_deck(db, current_user, deck_id)
    cards = [FlashcardResponse.model_validate(card).model_dump(mode="json") for card in deck.cards]
    return StandardResponse.ok(data=cards)


@router.patch("/flashcards/{flashcard_id}", response_model=StandardResponse)
def update_card(flashcard_id: UUID, update: FlashcardMasteryUpdate, current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    card = get_owned_card(db, current_user, flashcard_id)
    card.mastery_state = update.mastery_state
    db.commit()
    db.refresh(card)
    return StandardResponse.ok(data=FlashcardResponse.model_validate(card).model_dump(mode="json"))
