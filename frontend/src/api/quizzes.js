import { request } from './client';

// ── Quiz summaries / detail ────────────────────────────────────────────────

export function mapQuizSummary(q) {
  return {
    id: q.id,
    subjectId: q.subject_id,
    teacherId: q.teacher_id,
    teacherName: q.teacher_name ?? null,
    topic: q.topic,
    source: q.source,
    status: q.status,
    timeLimitSeconds: q.time_limit_seconds ?? null,
    questionCount: q.question_count ?? 0,
    createdAt: q.created_at,
  };
}

/** GET /api/quizzes — role-aware: teacher sees drafts+published, student published only. */
export async function listQuizzes() {
  const data = await request('/api/quizzes');
  return (data || []).map(mapQuizSummary);
}

/** GET /api/quizzes/:id — role-aware; student variant never leaks correct answers. */
export async function getQuiz(id) {
  const data = await request(`/api/quizzes/${id}`);
  return {
    id: data.id,
    subjectId: data.subject_id,
    teacherId: data.teacher_id,
    teacherName: data.teacher_name ?? null,
    topic: data.topic,
    source: data.source,
    status: data.status,
    timeLimitSeconds: data.time_limit_seconds ?? null,
    createdAt: data.created_at,
    questions: (data.questions || []).map((q) => ({
      id: q.id,
      stem: q.question_text,
      options: q.options,
      correct: q.correct_option ?? null,
      topicTag: q.topic_tag ?? null,
      difficulty: q.difficulty ?? null,
    })),
  };
}

// ── Teacher authoring ──────────────────────────────────────────────────────

function toQuestionInput(q) {
  return {
    question_text: q.stem,
    options: q.options,
    correct_option: q.correct,
    topic_tag: q.topicTag ?? null,
    difficulty: q.difficulty ?? 'medium',
  };
}

/** POST /api/quizzes — creates a draft. */
export async function createQuiz({ subjectId, topic, source = 'manual', timeLimitSeconds, questions }) {
  const data = await request('/api/quizzes', {
    method: 'POST',
    body: {
      subject_id: subjectId,
      topic,
      source,
      time_limit_seconds: timeLimitSeconds ?? null,
      questions: questions.map(toQuestionInput),
    },
  });
  return data.id;
}

/** PATCH /api/quizzes/:id — update a draft in place. */
export async function updateQuiz(id, { topic, timeLimitSeconds, questions } = {}) {
  const body = {};
  if (topic !== undefined) body.topic = topic;
  if (timeLimitSeconds !== undefined) body.time_limit_seconds = timeLimitSeconds;
  if (questions !== undefined) body.questions = questions.map(toQuestionInput);
  return request(`/api/quizzes/${id}`, { method: 'PATCH', body });
}

/** DELETE /api/quizzes/:id */
export async function deleteQuiz(id) {
  return request(`/api/quizzes/${id}`, { method: 'DELETE' });
}

/** POST /api/quizzes/:id/publish */
export async function publishQuiz(id) {
  return request(`/api/quizzes/${id}/publish`, { method: 'POST' });
}

/** POST /api/quiz/generate — AI draft, not persisted. */
export async function generateQuiz({ subjectId, materialIds, topic, questionCount = 10 }) {
  const data = await request('/api/quiz/generate', {
    method: 'POST',
    body: {
      subject_id: subjectId,
      material_ids: materialIds,
      topic,
      question_count: questionCount,
    },
  });
  return (data.questions || []).map((q) => ({
    stem: q.question_text,
    options: q.options,
    correct: q.correct_option,
    topicTag: q.topic_tag ?? null,
    difficulty: q.difficulty ?? 'medium',
  }));
}

// ── Student attempts ───────────────────────────────────────────────────────

function mapAttempt(a) {
  return {
    id: a.id,
    quizId: a.quiz_id,
    studentId: a.student_id,
    quizTitle: a.quiz_title,
    subject: a.subject_name ?? null,
    answers: a.answers || {},
    score: a.score,
    correctCount: a.correct_count,
    totalQuestions: a.total_questions,
    weakTopics: (a.weak_topics || []).map((wt) => ({ topic: wt.topic, accuracy: wt.accuracy })),
    submittedAt: a.submitted_at,
    questions: (a.questions || []).map((q) => ({
      id: q.question_id,
      stem: q.question_text,
      options: q.options,
      correct: q.correct_option,
      selected: q.selected_option ?? null,
      isCorrect: q.is_correct,
    })),
  };
}

/**
 * POST /api/quiz-attempts — submit answers.
 * `answers` maps questionId → option TEXT (the backend grades option strings).
 * Idempotent: resubmitting returns the existing attempt.
 */
export async function submitAttempt({ quizId, answers }) {
  const data = await request('/api/quiz-attempts', {
    method: 'POST',
    body: { quiz_id: quizId, answers },
  });
  return mapAttempt(data);
}

/** GET /api/quiz-attempts/:id — a single own attempt. */
export async function getAttempt(id) {
  const data = await request(`/api/quiz-attempts/${id}`);
  return mapAttempt(data);
}

/** GET /api/students/me/attempts — own attempts (newest first), optional quiz filter. */
export async function listMyAttempts({ quizId } = {}) {
  const data = await request('/api/students/me/attempts', {
    params: quizId ? { quiz_id: quizId } : undefined,
  });
  return (data || []).map(mapAttempt);
}
