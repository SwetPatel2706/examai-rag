import { request } from './client';

function mapDeck(d) {
  return {
    id: d.id,
    studentId: d.student_id,
    subjectId: d.subject_id,
    sourceMaterialIds: d.source_material_ids || [],
    title: d.title,
    createdAt: d.created_at,
    cards: (d.cards || []).map(mapCard),
  };
}

function mapCard(c) {
  return {
    id: c.id,
    deckId: c.deck_id,
    front: c.front,
    back: c.back,
    masteryState: c.mastery_state,
  };
}

/** POST /api/flashcard-decks — generate and persist a new deck. */
export async function generateDeck({ subjectId, materialIds, title, cardCount = 10 }) {
  const data = await request('/api/flashcard-decks', {
    method: 'POST',
    body: {
      subject_id: subjectId,
      material_ids: materialIds,
      title: title ?? null,
      card_count: cardCount,
    },
  });
  return mapDeck(data);
}

/** GET /api/flashcard-decks — own decks, newest first. */
export async function listDecks() {
  const data = await request('/api/flashcard-decks');
  return (data || []).map(mapDeck);
}

/** GET /api/flashcard-decks/:id — one own deck including cards. */
export async function getDeck(id) {
  const data = await request(`/api/flashcard-decks/${id}`);
  return mapDeck(data);
}

/** GET /api/flashcard-decks/:id/cards */
export async function getDeckCards(id) {
  const data = await request(`/api/flashcard-decks/${id}/cards`);
  return (data || []).map(mapCard);
}

/** PATCH /api/flashcards/:id — update mastery state on self-assessment. */
export async function updateCardMastery(cardId, masteryState) {
  const data = await request(`/api/flashcards/${cardId}`, {
    method: 'PATCH',
    body: { mastery_state: masteryState },
  });
  return mapCard(data);
}
