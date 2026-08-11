import { prefetch } from './apiCache';

/**
 * Route-level page loaders and safe GET warmers. Route chunks are loaded on
 * demand, while an intentional hover/focus/pointer-down can also warm the
 * destination's reusable data. Mutations and generated/chat content are
 * deliberately absent from this registry.
 */
const routeEntries = [
  { pattern: '/student', loader: () => import('../pages/StudentDashboard'), prefetch: warmStudentHome },
  { pattern: '/student/subject/:id', loader: () => import('../pages/SubjectOverview'), prefetch: warmSubjectOverview },
  { pattern: '/student/chat', loader: () => import('../pages/Chat'), prefetch: warmChat },
  { pattern: '/student/quizzes', loader: () => import('../pages/Quizzes'), prefetch: warmStudentQuizzes },
  { pattern: '/student/quiz/:id', loader: () => import('../pages/QuizTaking'), prefetch: warmQuizDetail },
  { pattern: '/student/quiz/:id/results', loader: () => import('../pages/QuizResults'), prefetch: warmQuizResults },
  { pattern: '/student/flashcards', loader: () => import('../pages/FlashcardDecks'), prefetch: warmFlashcards },
  { pattern: '/student/flashcards/:id/study', loader: () => import('../pages/FlashcardStudy'), prefetch: warmFlashcardStudy },
  { pattern: '/student/materials', loader: () => import('../pages/StudentMaterials'), prefetch: warmStudentMaterials },
  { pattern: '/teacher', loader: () => import('../pages/TeacherDashboard'), prefetch: warmTeacherHome },
  { pattern: '/teacher/materials', loader: () => import('../pages/TeacherMaterials'), prefetch: warmTeacherMaterials },
  { pattern: '/teacher/quiz/create', loader: () => import('../pages/QuizCreateEdit'), prefetch: warmTeacherQuizEditor },
  { pattern: '/teacher/analytics', loader: () => import('../pages/Analytics'), prefetch: warmTeacherAnalytics },
  { pattern: '/teacher/students', loader: () => import('../pages/StudentProgress'), prefetch: warmTeacherProgress },
];

export const loaders = Object.fromEntries(routeEntries.map(({ pattern, loader }) => [pattern, loader]));

function getParams(pattern, path) {
  const names = [];
  const expression = pattern
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        names.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  const match = new RegExp(`^${expression}/?$`).exec(path);
  if (!match) return null;
  return Object.fromEntries(names.map((name, index) => [name, decodeURIComponent(match[index + 1])]));
}

function findRoute(path) {
  const cleanPath = path?.split('?')[0] || '';
  return routeEntries
    .map((entry) => ({ entry, params: getParams(entry.pattern, cleanPath) }))
    .find(({ params }) => params !== null) || null;
}

function warm(modulePath, exportName, parts, args = [], staleMs = 60_000) {
  return import(modulePath).then((module) =>
    prefetch(parts, () => module[exportName](...args), { staleMs })
  );
}

function warmMany(tasks) {
  return Promise.all(tasks.map((task) => task.catch(() => null)));
}

function warmStudentSubjects() {
  return warm('../api/analytics', 'getStudentSubjects', ['students', 'me', 'subjects']);
}

function warmTeacherSubjects() {
  return warm('../api/analytics', 'getTeacherSubjects', ['teachers', 'me', 'subjects']);
}

function warmStudentHome() {
  return warmMany([
    warm('../api/analytics', 'getStudentStats', ['students', 'me', 'stats'], [], 30_000),
    warmStudentSubjects(),
  ]);
}

function warmSubjectOverview({ id }) {
  return warmMany([
    warm('../api/subjects', 'getSubject', ['subjects', 'detail', id], [id]),
    warm('../api/subjects', 'listSubjectMaterials', ['subjects', id, 'materials', 'ready'], [id, { status: 'ready', size: 100 }]),
    warm('../api/quizzes', 'listQuizzes', ['quizzes', 'subject', id], [id], 30_000),
    warm('../api/quizzes', 'listMyAttempts', ['students', 'me', 'attempts', 'all'], [], 30_000),
    warmStudentSubjects(),
  ]);
}

function warmChat() {
  return warm('../api/subjects', 'listSubjects', ['subjects']);
}

function warmStudentQuizzes() {
  return warmMany([
    warm('../api/quizzes', 'listQuizzes', ['quizzes', 'all'], [], 30_000),
    warm('../api/quizzes', 'listMyAttempts', ['students', 'me', 'attempts', 'all'], [], 30_000),
    warmStudentSubjects(),
  ]);
}

function warmQuizDetail({ id }) {
  return warm('../api/quizzes', 'getQuiz', ['quizzes', 'detail', id], [id], 60_000);
}

function warmQuizResults({ id }) {
  return warm('../api/quizzes', 'listMyAttempts', ['students', 'me', 'attempts', 'quiz', id], [{ quizId: id }], 30_000);
}

function warmFlashcards() {
  return warmMany([
    warm('../api/flashcards', 'listDecks', ['flashcards', 'decks'], [], 30_000),
    warmStudentSubjects(),
  ]);
}

function warmFlashcardStudy({ id }) {
  return warm('../api/flashcards', 'getDeck', ['flashcards', 'decks', id], [id], 30_000);
}

function warmStudentMaterials() {
  return warmMany([
    warmStudentSubjects(),
    warm('../api/analytics', 'getStudentStats', ['students', 'me', 'stats'], [], 30_000),
    warm('../api/analytics', 'getStudentMaterials', ['students', 'me', 'materials', 'all', ''], [{ size: 100 }]),
  ]);
}

function warmTeacherHome() {
  return warmMany([
    warmTeacherSubjects(),
    warm('../api/analytics', 'getTeacherDashboardStats', ['teacher', 'dashboard-stats'], [], 30_000),
  ]);
}

function warmTeacherMaterials() {
  return warmTeacherSubjects();
}

function warmTeacherQuizEditor() {
  return warmMany([
    warmTeacherSubjects(),
    warm('../api/quizzes', 'listQuizzes', ['quizzes', 'all'], [], 30_000),
  ]);
}

function warmTeacherAnalytics() {
  return warmMany([
    warmTeacherSubjects(),
    warm('../api/quizzes', 'listQuizzes', ['quizzes', 'all'], [], 30_000),
  ]);
}

function warmTeacherProgress() {
  return warmMany([
    warmTeacherSubjects(),
    warm('../api/analytics', 'getStudentProgress', ['student-progress', 'all'], [], 30_000),
  ]);
}

/**
 * Kick off the route chunk and opportunistic safe-GET warming. The loader
 * promise is returned for callers that need to await the chunk; data failures
 * are intentionally swallowed so they never block a click.
 */
export function preloadRoute(path) {
  const match = findRoute(path);
  if (!match) return null;

  const chunk = match.entry.loader();
  void chunk.catch(() => {});
  if (match.entry.prefetch) {
    void match.entry.prefetch(match.params).catch(() => {});
  }
  return chunk;
}

export function getRouteParams(path) {
  const match = findRoute(path);
  return match?.params || null;
}
