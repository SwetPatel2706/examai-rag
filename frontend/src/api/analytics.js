import { request } from './client';
import { mapMaterial } from './subjects';

function mapTeacher(t) {
  return { id: t.id, name: t.name };
}

/** GET /api/teachers/me/subjects — subject tabs for a teacher. */
export async function getTeacherSubjects() {
  const data = await request('/api/teachers/me/subjects');
  return (data || []).map((s) => ({
    subjectId: s.subject_id,
    name: s.name,
    teachers: (s.teachers || []).map(mapTeacher),
  }));
}

/** GET /api/students/me/subjects — subject cards for a student. */
export async function getStudentSubjects() {
  const data = await request('/api/students/me/subjects');
  return (data || []).map((s) => ({
    subjectId: s.subject_id,
    name: s.name,
    teachers: (s.teachers || []).map(mapTeacher),
    progress: s.progress ?? null,
  }));
}

/** GET /api/students/me/stats — dashboard quick stats + recent materials. */
export async function getStudentStats() {
  const data = await request('/api/students/me/stats');
  return {
    quizzesTaken: data.quizzes_taken,
    weakTopicsCount: data.weak_topics_count,
    avgScore: data.avg_score ?? null,
    recentMaterials: (data.recent_materials || []).map(mapMaterial),
  };
}

/** GET /api/students/me/materials — paginated/filterable student materials. */
export async function getStudentMaterials({ subjectId, teacherId, search, page, size } = {}) {
  const data = await request('/api/students/me/materials', {
    params: { subject_id: subjectId, teacher_id: teacherId, search, page, size },
  });
  return {
    items: (data.items || []).map(mapMaterial),
    total: data.total ?? 0,
    page: data.page ?? 1,
    pages: data.pages ?? 0,
    size: data.size ?? 0,
  };
}

function mapGradeBand(b) {
  return { band: b.band, minScore: b.min_score, maxScore: b.max_score, count: b.count, pct: b.pct };
}

/** GET /api/teacher/dashboard-stats */
export async function getTeacherDashboardStats() {
  const data = await request('/api/teacher/dashboard-stats');
  return {
    activeStudents: data.active_students,
    subjectMaterials: data.subject_materials,
    quizzesCreated: data.quizzes_created,
    avgSectionScore: data.avg_section_score ?? null,
    gradeDistribution: (data.grade_distribution || []).map(mapGradeBand),
    recentActivity: (data.recent_activity || []).map((a) => ({
      attemptId: a.attempt_id,
      studentId: a.student_id,
      studentName: a.student_name,
      quizId: a.quiz_id,
      quizTitle: a.quiz_title,
      subjectId: a.subject_id,
      subjectName: a.subject_name ?? null,
      score: a.score,
      submittedAt: a.submitted_at,
      atRisk: a.at_risk,
    })),
  };
}

/** GET /api/analytics?quiz_id= — per-quiz teacher analytics. */
export async function getQuizAnalytics(quizId) {
  const data = await request('/api/analytics', { params: { quiz_id: quizId } });
  return {
    quizId: data.quiz_id,
    quizTopic: data.quiz_topic,
    subjectId: data.subject_id,
    subjectName: data.subject_name ?? null,
    classSize: data.class_size,
    attemptCount: data.attempt_count,
    completionPct: data.completion_pct,
    avgScore: data.avg_score ?? null,
    gradeDistribution: (data.grade_distribution || []).map(mapGradeBand),
    questionAccuracy: (data.question_accuracy || []).map((q) => ({
      questionId: q.question_id,
      questionText: q.question_text,
      topicTag: q.topic_tag ?? null,
      accuracy: q.accuracy ?? null,
      correctCount: q.correct_count,
      total: q.total,
    })),
    weakTopics: (data.weak_topics || []).map((wt) => ({
      topic: wt.topic,
      accuracy: wt.accuracy,
      questionCount: wt.question_count,
      attemptCount: wt.attempt_count,
    })),
    empty: data.empty,
  };
}

function mapProgressStudent(s) {
  return {
    studentId: s.student_id,
    name: s.name,
    subjects: s.subjects || [],
    avgScore: s.avg_score ?? null,
    completionPct: s.completion_pct,
    lastActive: s.last_active ?? null,
    atRisk: s.at_risk,
    assessed: s.assessed,
  };
}

/** GET /api/student-progress — teacher roster, optional subject filter. */
export async function getStudentProgress({ subjectId } = {}) {
  const data = await request('/api/student-progress', {
    params: subjectId ? { subject_id: subjectId } : undefined,
  });
  return {
    subjectId: data.subject_id ?? null,
    subjectName: data.subject_name ?? null,
    students: (data.students || []).map(mapProgressStudent),
  };
}

/** GET /api/student-progress/:id — per-student drill-down. */
export async function getStudentProgressDetail(studentId) {
  const data = await request(`/api/student-progress/${studentId}`);
  return {
    ...mapProgressStudent(data),
    quizHistory: (data.quiz_history || []).map((h) => ({
      quizId: h.quiz_id,
      quizTitle: h.quiz_title,
      subjectId: h.subject_id,
      subjectName: h.subject_name ?? null,
      score: h.score,
      submittedAt: h.submitted_at,
    })),
  };
}
