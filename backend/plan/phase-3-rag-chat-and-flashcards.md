# Phase 3 — Scoped RAG Chat and Student Flashcards

## Goal

Deliver the first student value loop: select approved materials by teacher, ask a subject-scoped question, receive an answer with reliable numbered citations, and generate personal flashcard decks from the same selected materials.

## Already done

- The exact RAG flow and citation requirement are documented.
- The frontend has a chat screen, subject switcher, material scope panel, citation tooltip/list UI, flashcard deck list, generation flow, and study view.
- The frontend store model already treats material selection as per-session state rather than a server-persisted default.
- The material ingestion/Qdrant prerequisites are planned in Phase 2.

## Not to be done in this phase

- Do not answer from unselected materials or from a broad subject search when explicit material IDs are supplied.
- Do not return a citation without teacher name, material filename, and material ID.
- Do not persist a permanent material scope setting.
- Do not add teacher-to-student messaging, student-generated quizzes, or personalized study planning.
- Do not make generated flashcards graded or visible to other students.

## Work items

1. Implement `retriever.py` with question embedding and a Qdrant `material_id IN selected_material_ids` filter. Enforce that selected materials belong to the requested subject and are ready.
2. Implement the context builder with numbered chunks and bounded context size. Preserve the mapping from context number to complete Qdrant payload.
3. Define a Pydantic structured output schema before prompting Gemini. Require answer text and source markers; validate markers against retrieved context.
4. Implement error-aware structured-output retries with the verbatim error, bad response, and schema included. Log raw model output in development with sensitive data controls.
5. Resolve citation markers to `{teacher_name, material_filename, material_id}` and return `{answer_text, citations}`. Decide and document behavior for unsupported claims or no relevant context.
6. Add chat request validation, rate/size limits, timeout handling, and a useful no-results response. Never fabricate a citation.
7. Implement flashcard generation from the same retriever/context pipeline. Store `flashcard_decks` and `flashcards` with student ownership, source material IDs, title, and mastery state.
8. Implement deck list/detail/cards, generation status, and self-assessment updates (`new`, `learning`, `mastered`).
9. Replace chat and flashcard mocks with API wrappers. Send `subject_id`, `selected_material_ids`, and question/message per request. Display backend errors and ingestion-not-ready states.

## Core API surface

- `POST /chat` with `{subject_id, selected_material_ids, question}`
- `POST /flashcard-decks` with `{subject_id, material_ids, title?}`
- `GET /flashcard-decks`, `GET /flashcard-decks/{deck_id}`, `GET /flashcard-decks/{deck_id}/cards`
- `PATCH /flashcards/{flashcard_id}` for mastery state

The exact frontend key names may be adapted at the API boundary, but the semantic contract must preserve the required citation fields and per-request selection.

## Verification

- A selected-material query never retrieves an unselected material.
- An answer with three retrieved chunks returns correctly numbered citations for the cited chunks only.
- Missing/invalid model JSON retries with an error-aware prompt and eventually returns a controlled error.
- A no-context question does not produce an uncited confident answer.
- A student cannot read or update another student's deck/card.
- Flashcard generation records source material IDs and uses only authorized ready materials.
- Frontend citation hover/list, material scope reset, chat subject switching, deck generation, and study self-assessment work against the real API.

## Exit criteria

The student can log in, choose a subject and teacher-owned material scope, receive an attributable RAG answer, generate a private deck from that scope, and study/update mastery. This is the preferred first stable demo slice.
