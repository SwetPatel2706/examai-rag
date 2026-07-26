# Frontend Placeholder & Mock Data Register

All mock data is clearly marked with `// --- Mock data (replace with ...)` comments inline.
This file gives a central view of every placeholder, what it stands in for, and the expected backend contract.

---

## Authentication

| File | Placeholder | Why | Backend replacement |
|------|-------------|-----|---------------------|
| `Login.jsx` | Static role toggle + hardcoded redirect | Auth not yet integrated | `POST /auth/login` → JWT → set `authStore` |
| `Sidebar.jsx` | `user.name` falls back to `"Student"/"Professor"` if store is empty | `authStore` not populated pre-login | Populate `authStore.setAuth()` after login response |

---

## Student Pages

### StudentDashboard
| Mock | Why | Replacement |
|------|-----|-------------|
| `QUICK_STATS` (12 quizzes, 4 weak topics, 85%) | No attempt data yet | `GET /students/me/stats` |
| `SUBJECTS` (3 hardcoded subjects) | No enrollment API yet | `GET /students/me/subjects` |
| Subject card banners use a gradient + icon (no image) | External AIDA images removed (privacy/stability) | Could use subject thumbnail from backend or keep gradient |

### SubjectOverview
| Mock | Why | Replacement |
|------|-----|-------------|
| `MOCK_SUBJECT['s1']` object | No `/subjects/:id` endpoint yet | `GET /subjects/:id` (teachers, materials by teacher, quizzes) |
| Only `s1` has data; other IDs get a fallback | Multi-subject mock was too verbose | Will resolve once real API is wired |

### Chat
| Mock | Why | Replacement |
|------|-----|-------------|
| `SUBJECTS_LIST` + `MATERIALS_BY_SUBJECT` | No API | `GET /subjects` + `GET /subjects/:id/materials` |
| `buildMockResponse()` — simulated AI reply with ~900ms delay | Backend RAG not connected | `POST /api/chat` `{ subject_id, message, material_ids: [...] }` → `{ text, citations: [{num, teacherName, materialFilename, materialId}] }` |
| Citation objects are **fully wired** into the UI — tooltip, numbered markers, citation list below message — will work as-is once real API returns them | — | — |

### Quizzes
| Mock | Why | Replacement |
|------|-----|-------------|
| `QUIZZES` array (4 quizzes, mixed statuses) | No quiz API | `GET /quizzes?role=student` |

### QuizTaking
| Mock | Why | Replacement |
|------|-----|-------------|
| `MOCK_QUIZZES` with question arrays | No quiz API | `GET /quizzes/:id` (questions, time limit) |
| Timer submits to `QuizResults` via `useNavigate(state)` — this is real behaviour, not mock | — | On submit: `POST /quiz-attempts { quiz_id, answers }` then navigate to results |

### QuizResults
| Mock | Why | Replacement |
|------|-----|-------------|
| `MOCK_RESULTS['q1']` | No attempts API | `GET /quiz-attempts/:id` or compute from `POST /quiz-attempts` response |
| Prefers `location.state` (live answers from QuizTaking) over mock — so once QuizTaking POSTs to backend, results can come from the API response directly | — | — |

### FlashcardDecks
| Mock | Why | Replacement |
|------|-----|-------------|
| `DECKS` array | No flashcard API | `GET /flashcard-decks` |
| `ALL_MATERIALS_BY_TEACHER` | Co-located with page for now | `GET /subjects/:id/materials` (same as Chat) |
| `handleGenerate()` sets a 1s timeout and navigates to `fd1` | Backend deck generation not wired | `POST /flashcard-decks { material_ids }` → `{ deck_id }` → navigate to `/student/flashcards/:deck_id/study` |

### FlashcardStudy
| Mock | Why | Replacement |
|------|-----|-------------|
| `MOCK_DECKS` with hardcoded cards | No flashcard card API | `GET /flashcard-decks/:id/cards` |

---

## Teacher Pages

### TeacherDashboard
| Mock | Why | Replacement |
|------|-----|-------------|
| `STATS`, `ACTIVITY`, `GRADE_DIST` | No API | `GET /teacher/dashboard-stats`, `GET /quiz-attempts?subject=X&limit=10` |
| Subject tabs are static strings | No subjects API | `GET /teachers/me/subjects` |

### TeacherMaterials
| Mock | Why | Replacement |
|------|-----|-------------|
| `INITIAL_MATERIALS` | No API | `GET /materials?owned=me` (own) + `GET /materials?subject=X` (co-teacher) |
| Upload uses a `setTimeout(1000)` simulation | Backend ingestion pipeline not wired | `POST /materials` (multipart, `file`, `subject_id`) — triggers parser → chunker → embedder pipeline |
| Qdrant ingestion is **not triggered** from frontend in mock | Ingestion happens server-side | No frontend change needed; happens server-side after upload |
| Subject is set to `"Unassigned"` on upload | No subject picker modal yet | Add a post-upload modal: `PATCH /materials/:id { subject_id }` |

### QuizCreateEdit
| Mock | Why | Replacement |
|------|-----|-------------|
| `MATERIALS_FOR_GENERATION` | No API | `GET /materials?owned=me` |
| `AI_DRAFT_QUESTIONS` + 1.5s delay | AI generation not wired | `POST /quiz/generate { material_ids, subject_id }` → `{ questions: [...] }` |
| `publish()` just navigates — no POST | No quiz API | `POST /quizzes { title, subject_id, questions }` → `{ quiz_id }` |

### Analytics
| Mock | Why | Replacement |
|------|-----|-------------|
| `ANALYTICS_DATA` (question accuracy, grade dist, weak topics) | No analytics API | `GET /analytics?quiz_id=X` |
| Quiz selector is populated from `QUIZZES_LIST` mock | No quiz list API | `GET /quizzes?teacher=me` |

### StudentProgress
| Mock | Why | Replacement |
|------|-----|-------------|
| `STUDENTS` array (4 students, 2 at-risk) | No student roster API | `GET /students?subject=X` |
| At-risk computed server-side; mock flags `atRisk: true` manually | No scoring pipeline yet | `GET /students?subject=X` should return `at_risk` field from backend |
| Subject filter is UI-only in mock (all students shown regardless) | Can't filter by subject without real data | Add `?subject_id=X` query param to API call |

---

## Intentional Design Constraints (not placeholders)

These are **intentional omissions** per `agents.md`, not things to add later:

| What is absent | Why |
|----------------|-----|
| No "Generate Custom Quiz" button on student Quizzes page | Out of scope Phase 1–3 per agents.md |
| No messaging UI in StudentProgress at-risk panel | Explicitly out of scope; panel only surfaces *who*, not a comms channel |
| No per-student score comparison on QuizResults | Students see own data only (fairness constraint for shared quizzes) |
| No student-owned materials upload | Materials are teacher-owned per core architecture decision |
