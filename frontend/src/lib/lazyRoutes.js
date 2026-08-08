/**
 * Route-level page loaders. App.jsx wraps each loader in React.lazy so the
 * initial bundle only contains the login/bootstrap path; Sidebar preloads the
 * likely next route on hover/focus via `preloadRoute`, which imports the same
 * module the lazy() wrapper uses (module cache makes this idempotent).
 */
export const loaders = {
  '/student': () => import('../pages/StudentDashboard'),
  '/student/subject/:id': () => import('../pages/SubjectOverview'),
  '/student/chat': () => import('../pages/Chat'),
  '/student/quizzes': () => import('../pages/Quizzes'),
  '/student/quiz/:id': () => import('../pages/QuizTaking'),
  '/student/quiz/:id/results': () => import('../pages/QuizResults'),
  '/student/flashcards': () => import('../pages/FlashcardDecks'),
  '/student/flashcards/:id/study': () => import('../pages/FlashcardStudy'),
  '/student/materials': () => import('../pages/StudentMaterials'),
  '/teacher': () => import('../pages/TeacherDashboard'),
  '/teacher/materials': () => import('../pages/TeacherMaterials'),
  '/teacher/quiz/create': () => import('../pages/QuizCreateEdit'),
  '/teacher/analytics': () => import('../pages/Analytics'),
  '/teacher/students': () => import('../pages/StudentProgress'),
};

/** Kick off the dynamic import for a route path (exact sidebar links only). */
export function preloadRoute(path) {
  const loader = loaders[path];
  if (loader) return loader();
  return null;
}
