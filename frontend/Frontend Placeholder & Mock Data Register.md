# Frontend Placeholder & Mock Data Register

Status legend:

- **Resolved** — the placeholder was removed; the screen now calls the real backend API listed.
- **Design-only** — intentional constraint per `agents.md`, not a placeholder to build later.
- **Deferred** — acknowledged gap kept as-is for a specific reason (usually an API limitation).

The old inline `// --- Mock data (replace with ...)` blocks have been removed from every
connected screen. All real calls go through `src/api/` thin wrappers that unwrap the
`StandardResponse` envelope and map snake_case → camelCase.

---

## Authentication

| File | Placeholder | Status | Backend replacement |
|------|-------------|--------|---------------------|
| `Login.jsx` | Static role toggle + hardcoded redirect | **Resolved** | `POST /api/auth/login` → `{ access_token, user }` → `authStore.setAuth()`; role-based redirect honoring `location.state.from` |
| `Sidebar.jsx` | `user.name` fallback to "Student"/"Professor" | **Resolved** | Populated from `authStore.user.name` after login; logout calls `POST /api/auth/logout` (best-effort) then clears local state |
| `App.jsx` | No route guards | **Resolved** | `RequireAuth` + `RequireRole` guards, `SessionBootstrap` revalidates via `GET /api/auth/me`, `/login` redirects already-authenticated users |

---

## Student Pages

### StudentDashboard
| Mock | Status | Replacement |
|------|--------|-------------|
| `QUICK_STATS` | **Resolved** | `GET /api/students/me/stats` |
| `SUBJECTS` (hardcoded) | **Resolved** | `GET /api/students/me/subjects` |
| Subject card gradient + icon (no image) | **Design-only** | AIDA images removed for privacy/stability; gradient is the final design |

### SubjectOverview
| Mock | Status | Replacement |
|------|--------|-------------|
| `MOCK_SUBJECT['s1']` object | **Resolved** | `GET /api/subjects/:id` + `GET /api/subjects/:id/materials` + `GET /api/quizzes` + `GET /api/students/me/attempts` (per-quiz status/score) |

### Chat
| Mock | Status | Replacement |
|------|--------|-------------|
| `SUBJECTS_LIST` + `MATERIALS_BY_SUBJECT` | **Resolved** | `GET /api/subjects` + `GET /api/subjects/:id/materials?status=ready` |
| `buildMockResponse()` (~900ms delay) | **Resolved** | `POST /api/chat` `{ subject_id, selected_material_ids, question }` → `{ answer_text, citations:[{num, teacher_name, material_filename, material_id, source_locator}] }` |
| Citation tooltip/numbered-marker UI | **Resolved** | Consumes real citations as-is (client maps to `{num, teacherName, materialFilename}`) |

### Quizzes
| Mock | Status | Replacement |
|------|--------|-------------|
| `QUIZZES` array | **Resolved** | `GET /api/quizzes` (role-aware; student sees published only) + `GET /api/students/me/subjects` for names + `GET /api/students/me/attempts` for per-quiz status/score |

### QuizTaking
| Mock | Status | Replacement |
|------|--------|-------------|
| `MOCK_QUIZZES` | **Resolved** | `GET /api/quizzes/:id` (student variant — no correct answers leak) |
| Timer → navigate results | **Resolved** | `POST /api/quiz-attempts` (answers as option **text** keyed by question id; idempotent) → navigate with graded attempt in `location.state` |

### QuizResults
| Mock | Status | Replacement |
|------|--------|-------------|
| `MOCK_RESULTS['q1']` | **Resolved** | Graded attempt from `POST /api/quiz-attempts` response, or `GET /api/students/me/attempts?quiz_id=X` fallback when arriving via deep link |

### FlashcardDecks
| Mock | Status | Replacement |
|------|--------|-------------|
| `DECKS` array | **Resolved** | `GET /api/flashcard-decks` (cards included; mastered count computed client-side) |
| `ALL_MATERIALS_BY_TEACHER` | **Resolved** | `GET /api/students/me/subjects` + `GET /api/subjects/:id/materials` in the generate dialog, grouped by teacher |
| 1s timeout + navigate to `fd1` | **Resolved** | `POST /api/flashcard-decks` `{ subject_id, material_ids, title, card_count }` → navigate to returned deck |

### FlashcardStudy
| Mock | Status | Replacement |
|------|--------|-------------|
| `MOCK_DECKS` hardcoded cards | **Resolved** | `GET /api/flashcard-decks/:id` (includes cards) |
| Self-assessment is UI-only | **Resolved** | `PATCH /api/flashcards/:id` `{ mastery_state }` (best-effort, never blocks the session) |

### StudentMaterials (Resources)
| Mock | Status | Replacement |
|------|--------|-------------|
| `COURSE_FILTERS` | **Resolved** | Derived from `GET /api/students/me/subjects` |
| `TEACHERS` | **Resolved** | Distinct teachers across `GET /api/students/me/subjects` |
| `RECENTLY_ACCESSED` | **Resolved** | `GET /api/students/me/stats` → `recent_materials` (rename: no access-history API; shows "Recently Added") |
| `ALL_MATERIALS` + `TOTAL_MATERIALS` | **Resolved** | `GET /api/students/me/materials?subject_id&search&size=100` |
| Search / course filters client-side | **Deferred** | Subject + search are server-side; teacher filter is client-side because the API accepts a single `teacher_id` and multi-teacher selection can't be expressed. Pagination is client-side (size capped at 100). |
| Download / more-actions UI-only | **Resolved** | `GET /api/materials/:id/download` → presigned URL → `window.open` |
| External avatar URL (`ownerAvatarUrl`) | **Resolved** | Omitted; owner shown as text. |
| Size column | **Deferred** | Backend `MaterialResponse` has no file-size field; the column shows `—`. |

---

## Teacher Pages

### TeacherDashboard
| Mock | Status | Replacement |
|------|--------|-------------|
| `STATS`, `ACTIVITY`, `GRADE_DIST` | **Resolved** | `GET /api/teacher/dashboard-stats` |
| Subject tabs (static) | **Resolved** | `GET /api/teachers/me/subjects` (tabs link to Analytics) |

### TeacherMaterials
| Mock | Status | Replacement |
|------|--------|-------------|
| `INITIAL_MATERIALS` | **Resolved** | `GET /api/materials?subject_id=X` — own vs co-teacher derived from `teacher_id === user.id` (no `owned=me` param exists) |
| Upload `setTimeout(1000)` simulation | **Resolved** | `POST /api/materials` (multipart `file` + `subject_id`) via a subject-picker dialog (no post-upload `PATCH` needed — subject chosen before upload) |
| Status never tracked | **Resolved** | Status column (`processing`/`ready`/`failed`/`deleting`); polling every 4s via `GET /api/materials/:id/status` while processing |
| No retry | **Resolved** | `POST /api/materials/:id/retry` for failed ingestion |
| Delete UI-only | **Resolved** | `DELETE /api/materials/:id` (own only) |
| Download | **Resolved** | `GET /api/materials/:id/download` |

### QuizCreateEdit
| Mock | Status | Replacement |
|------|--------|-------------|
| `MATERIALS_FOR_GENERATION` | **Resolved** | `GET /api/materials?subject_id=X` filtered to `status=ready` |
| `AI_DRAFT_QUESTIONS` + 1.5s delay | **Resolved** | `POST /api/quiz/generate` `{ subject_id, material_ids, topic, question_count }` → drafts appended to editor for review |
| `publish()` just navigates | **Resolved** | `POST /api/quizzes` → `PATCH /api/quizzes/:id` → `POST /api/quizzes/:id/publish`; teacher quiz list (`GET /api/quizzes`) with Edit/Publish/Delete |
| Subject select mock options | **Resolved** | `GET /api/teachers/me/subjects` |

### Analytics
| Mock | Status | Replacement |
|------|--------|-------------|
| `ANALYTICS_DATA` | **Resolved** | `GET /api/analytics?quiz_id=X` (heatmap, grade distribution, weak topics) |
| Quiz selector from `QUIZZES_LIST` | **Resolved** | `GET /api/quizzes` filtered to published |

### StudentProgress
| Mock | Status | Replacement |
|------|--------|-------------|
| `STUDENTS` array | **Resolved** | `GET /api/student-progress` (roster with `at_risk`, `completion_pct`, `last_active`) |
| At-risk manually flagged | **Resolved** | Computed server-side (`at_risk` field) |
| Subject filter UI-only | **Resolved** | `GET /api/student-progress?subject_id=X` |
| Drill-down mock quiz history | **Resolved** | `GET /api/student-progress/:student_id` |

---

## Intentional Design Constraints (not placeholders)

| What is absent | Why |
|----------------|-----|
| No "Generate Custom Quiz" button on student Quizzes page | Out of scope Phase 1–3 per `agents.md` |
| No messaging UI in StudentProgress at-risk panel | Explicitly out of scope; panel only surfaces *who* |
| No per-student score comparison on QuizResults | Students see own data only (fairness constraint for shared quizzes) |
| No student-owned materials upload | Materials are teacher-owned per core architecture decision |

## Known limitations (Deferred, recorded)

| Limitation | Reason |
|------------|--------|
| Student materials teacher filter is client-side (single `teacher_id` on the API) | API accepts one teacher id; multi-select cannot be expressed server-side |
| Student materials pagination is client-side over the first 100 rows | Keeps multi-teacher OR semantics; dataset is bounded in practice |
| Material "Size" column shows `—` | No file-size field in `MaterialResponse` |
| Flashcard deck card count comes from the deck's embedded cards | `FlashcardDeckResponse` includes `cards`; no separate count field |
