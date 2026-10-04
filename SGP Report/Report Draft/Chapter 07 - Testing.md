# Chapter 7 — Testing

- BLACK-BOX TESTING
- WHITE-BOX TESTING
- TEST CASES

## 7.1 Black-Box Testing

The following black-box tests check that each feature behaves correctly from a user's point of view, without looking at the underlying code:

- Login Testing — a provisioned student or teacher can log in with the correct email and password and receives the correct role.
- Invalid Login Testing — wrong credentials are rejected with an appropriate error.
- Unauthorized Subject Testing — a student requesting another subject's materials receives a forbidden response, not data.
- Material Upload Testing — a teacher upload of a supported file type within the size limit is accepted and enters processing.
- Invalid Upload Testing — an unsupported file type or oversized file is rejected with a clear message and never ingested.
- Chat Scope Testing — a question scoped to authorized, ready materials returns an answer with numbered teacher/file citations.
- Cross-Subject Chat Testing — a request naming a material ID from another subject is refused before any vector query runs.
- Quiz Publication Testing — a draft quiz is invisible to students until the teacher publishes it.
- Attempt Testing — submitting an attempt returns a score with per-question feedback and weak topics; duplicate submission does not duplicate the score.
- Flashcard Testing — deck generation from selected materials produces reviewable cards with mastery states.
- Analytics Testing — per-quiz and cross-quiz views return their separate read models only to the subject's teachers.

## 7.2 White-Box Testing

The following checks were made against the internal logic of the system:

- Input Validation Logic — Pydantic schemas reject malformed input (bad identifiers, out-of-range values, wrong file types) before it reaches services or storage.
- Authorization Logic — service-layer membership checks (enrollment for students, subject membership for teachers) verified for both allowed and denied paths.
- Retrieval Filter Logic — the Qdrant filter always carries both subject and material constraints built from Postgres-validated IDs.
- Citation Mapping Logic — each `[n]` marker in generated text resolves to the payload metadata (teacher, filename, locator) of the retrieved chunk.
- Structured-Output Retry Logic — malformed model JSON (code fences, trailing prose, wrong field types) triggers an error-aware retry carrying the verbatim error, the bad response, and the schema.
- Grading Logic — server-side scoring, per-question correctness, and weak-topic derivation checked against hand-computed attempts.
- Ingestion State Logic — status transitions (processing → ready / failed), retry from failure, and version-safe updates under concurrent operations.
- API Contract Logic — every endpoint exercised with valid and invalid payloads through the interactive API documentation; standardized response envelopes verified.

## 7.3 Test Cases

| Test ID | Test Case | Input | Expected Result |
|---|---|---|---|
| TC1 | Valid student login | Correct provisioned email + password | Session established, student role returned |
| TC2 | Student requests another subject's material | Subject ID with no enrollment row | Forbidden response |
| TC3 | Teacher uploads unsupported file | Executable / disallowed extension | Validation error; file not ingested |
| TC4 | Student selects unrelated material ID | Material ID from another subject | Authorization fails before vector query |
| TC5 | RAG answer generated | Question + authorized ready scope | Answer with numbered citations carrying teacher and filename |
| TC6 | Malformed model JSON | Forced bad structured output | Error-aware retry validates the corrected output |
| TC7 | Student submits quiz twice | Same attempt submitted again | Idempotent; score not duplicated |
| TC8 | Teacher reads analytics | Per-quiz and progress requests | Separate correct read models returned |
| TC9 | Frontend stale response | Slow earlier request resolving last | Older response does not overwrite current state |

Table 7.1: Representative test cases — all passing.

The backend suite (82 tests across smoke, phase, and review-fix files) runs fully offline in under a second; the frontend suite (63 tests across routes, stores, API client, and components) runs under Vitest. Integration with hosted services (Supabase, Qdrant, Gemini) remains environment-dependent and is covered by manual end-to-end passes rather than automated tests.
