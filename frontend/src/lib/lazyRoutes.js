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

function warmSubjectMaterials(subjectId) {
  return warm('../api/subjects', 'listSubjectMaterials', ['subjects', subjectId, 'materials', 'ready'], [subjectId, { status: 'ready', size: 100 }]);
}

/**
 * Fan-out cap for per-subject idle warming. Dashboards can list many
 * subjects; warming the first few covers the visible cards/tabs without
 * flooding the API on login.
 */
const MAX_DEEP_SUBJECTS = 8;
const MAX_DEEP_QUIZZES = 3;

function takeSubjects(subjects) {
  return (Array.isArray(subjects) ? subjects : []).slice(0, MAX_DEEP_SUBJECTS);
}

/** Student materials filtered to one subject — matches the course-filter key. */
function warmStudentMaterialsVariant(subjectId) {
  return warm(
    '../api/analytics',
    'getStudentMaterials',
    ['students', 'me', 'materials', subjectId, ''],
    [{ subjectId, size: 100 }]
  );
}

/** Teacher dashboard scoped to one subject tab. */
function warmTeacherDashboardSubject(subjectId) {
  return warm(
    '../api/analytics',
    'getTeacherDashboardStats',
    ['teacher', 'dashboard-stats', subjectId],
    [{ subjectId }],
    30_000
  );
}

/** Teacher materials table, first page of one subject tab. */
function warmTeacherMaterialsSubject(subjectId) {
  return warm(
    '../api/materials',
    'listMaterials',
    ['materials', subjectId, 1],
    [{ subjectId, page: 1, size: 100 }]
  );
}

/** Teacher roster filtered to one subject. */
function warmTeacherProgressSubject(subjectId) {
  return warm(
    '../api/analytics',
    'getStudentProgress',
    ['student-progress', subjectId],
    [{ subjectId }],
    30_000
  );
}

/** Teacher analytics for one published quiz. */
function warmQuizAnalyticsDetail(quizId) {
  return warm('../api/analytics', 'getQuizAnalytics', ['analytics', quizId], [quizId], 30_000);
}

/**
 * Warm the ready-materials cache for every enrolled subject. Reuses the same
 * deduplicated subjects request as the other student warmers, then warms each
 * subject's materials list so Chat's subject-switcher toggle and Subject
 * Overview render instantly on first visit.
 */
function warmStudentSubjectMaterials() {
  return warmStudentSubjects()
    .then((subjects) => {
      if (!Array.isArray(subjects)) return;
      return warmMany(subjects.map((subject) => warmSubjectMaterials(subject.subjectId)));
    })
    .catch(() => null);
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

/**
 * Eagerly fetch every route chunk up front (both roles). Chunks are small
 * (~2–14 KB each), so this trades a little startup network for the guarantee
 * that no navigation ever waits on a dynamic import or flashes the Suspense
 * fallback. Fired from app boot while the login/bootstrap path renders.
 */
export function preloadAllChunks() {
  return Promise.all(routeEntries.map((entry) => entry.loader().catch(() => null))).then(() => undefined);
}

/**
 * Per-subject deep warm for students: every subject card on the dashboard
 * links to a Subject Overview bundle (detail + ready materials + quizzes),
 * and the materials page can filter to each subject. Runs after the subject
 * list resolves; each entry is cache-shared with the page mount.
 */
function warmStudentDeep() {
  return warmStudentSubjects()
    .then((subjects) => {
      const list = takeSubjects(subjects);
      if (!list.length) return null;
      return warmMany([
        ...list.map((subject) => warmSubjectOverview({ id: subject.subjectId })),
        ...list.map((subject) => warmStudentMaterialsVariant(subject.subjectId)),
      ]);
    })
    .catch(() => null);
}

/**
 * Per-subject deep warm for teachers: dashboard subject tabs, materials tabs
 * (first page), roster subject filter, plus analytics for the first published
 * quizzes. Runs after the subject/quiz lists resolve.
 */
function warmTeacherDeep() {
  const subjectsWarm = warmTeacherSubjects()
    .then((subjects) => {
      const list = takeSubjects(subjects);
      if (!list.length) return null;
      const ids = list.map((s) => s.subjectId);
      return warmMany([
        ...ids.map(warmTeacherDashboardSubject),
        ...ids.map(warmTeacherMaterialsSubject),
        ...ids.map(warmTeacherProgressSubject),
      ]);
    })
    .catch(() => null);
  const quizzesWarm = warm('../api/quizzes', 'listQuizzes', ['quizzes', 'all'], [], 30_000)
    .then((quizzes) => {
      const ids = (Array.isArray(quizzes) ? quizzes : [])
        .filter((q) => q.status === 'published')
        .slice(0, MAX_DEEP_QUIZZES)
        .map((q) => q.id);
      if (!ids.length) return null;
      return warmMany(ids.map(warmQuizAnalyticsDetail));
    })
    .catch(() => null);
  return warmMany([subjectsWarm, quizzesWarm]);
}

/**
 * Warm the reusable safe-GET cache for every screen the role can navigate to,
 * fired once the session (and therefore auth token) is known. Each warmer
 * swallows its own failures so startup is never blocked by a slow endpoint;
 * navigation simply falls back to the normal on-mount fetch.
 */
export function preloadRoleData(role) {
  if (role === 'teacher') {
    return warmMany([
      warmTeacherHome(),
      warmTeacherMaterials(),
      warmTeacherQuizEditor(),
      warmTeacherAnalytics(),
      warmTeacherProgress(),
      warmTeacherDeep(),
    ]);
  }
  if (role === 'student') {
    return warmMany([
      warmStudentHome(),
      warmChat(),
      warmStudentQuizzes(),
      warmFlashcards(),
      warmStudentMaterials(),
      warmStudentSubjectMaterials(),
      warmStudentDeep(),
    ]);
  }
  return Promise.resolve(null);
}

/**
 * Idle cascade while the student stays on the dashboard: subject cards
 * (Advanced Database Systems, Software Engineering, …) resolve to Subject
 * Overview bundles, and the main destinations (materials per-subject filter,
 * quizzes, flashcards, chat) are already covered by preloadRoleData — this
 * re-warms them idempotently so a deep link straight to /student also fills
 * every default. Safe to call repeatedly; cache hits and in-flight dedupe
 * make repeats free.
 */
export function preloadStudentDashboardIdle(subjects) {
  const list = takeSubjects(subjects);
  if (!list.length) return Promise.resolve(null);
  return warmMany([
    ...list.map((subject) => warmSubjectOverview({ id: subject.subjectId }).catch(() => null)),
    ...list.map((subject) => warmStudentMaterialsVariant(subject.subjectId).catch(() => null)),
    warmStudentQuizzes().catch(() => null),
    warmFlashcards().catch(() => null),
    warmChat().catch(() => null),
  ]);
}

/**
 * Idle cascade while the teacher stays on the dashboard: per-subject dashboard
 * tabs, materials tabs, roster filters, and the sibling defaults (materials,
 * quiz editor, analytics, progress) so the first click renders from cache.
 */
export function preloadTeacherDashboardIdle(subjects) {
  const ids = takeSubjects(subjects).map((s) => s.subjectId);
  if (!ids.length) return Promise.resolve(null);
  return warmMany([
    ...ids.map((id) => warmTeacherDashboardSubject(id).catch(() => null)),
    ...ids.map((id) => warmTeacherMaterialsSubject(id).catch(() => null)),
    ...ids.map((id) => warmTeacherProgressSubject(id).catch(() => null)),
    warmTeacherQuizEditor().catch(() => null),
    warmTeacherAnalytics().catch(() => null),
    warmTeacherProgress().catch(() => null),
  ]);
}

/**
 * Idle cascade while the student stays on the materials page: its own
 * per-subject filter variants (the default "All" was already warmed on the
 * dashboard) plus the sibling defaults, so leaving the page never fetches.
 */
export function preloadStudentMaterialsIdle(subjects) {
  const list = takeSubjects(subjects);
  if (!list.length) return Promise.resolve(null);
  return warmMany([
    ...list.map((subject) => warmStudentMaterialsVariant(subject.subjectId).catch(() => null)),
    warmStudentQuizzes().catch(() => null),
    warmFlashcards().catch(() => null),
    warmChat().catch(() => null),
  ]);
}

/**
 * Idle cascade while the teacher stays on the materials page: the remaining
 * subject tabs' first pages plus the sibling defaults (dashboard, analytics,
 * progress), which are re-warmed idempotently for deep-link arrivals.
 */
export function preloadTeacherMaterialsIdle(subjects) {
  const ids = takeSubjects(subjects).map((s) => s.subjectId);
  if (!ids.length) return Promise.resolve(null);
  return warmMany([
    ...ids.map((id) => warmTeacherMaterialsSubject(id).catch(() => null)),
    warmTeacherHome().catch(() => null),
    warmTeacherAnalytics().catch(() => null),
    warmTeacherProgress().catch(() => null),
  ]);
}

/**
 * Sibling-default warmers for non-dashboard pages. Each main page fires one
 * of these while idle so that arriving via deep link, reload, or back-button
 * still fills every other default — the same guarantee the dashboard cascade
 * gives to login arrivals. Fully idempotent: fresh cache entries and shared
 * in-flight requests make repeats free.
 */
export function preloadStudentSiblingsIdle() {
  return warmMany([
    warmStudentHome().catch(() => null),
    warmChat().catch(() => null),
    warmStudentQuizzes().catch(() => null),
    warmFlashcards().catch(() => null),
    warmStudentMaterials().catch(() => null),
  ]);
}

export function preloadTeacherSiblingsIdle() {
  return warmMany([
    warmTeacherHome().catch(() => null),
    warmTeacherMaterials().catch(() => null),
    warmTeacherQuizEditor().catch(() => null),
    warmTeacherAnalytics().catch(() => null),
    warmTeacherProgress().catch(() => null),
  ]);
}
