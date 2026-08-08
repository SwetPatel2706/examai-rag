import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Login from './pages/Login';
import { loaders } from './lib/lazyRoutes';
import useAuthStore from './store/authStore';
import { fetchMe, refreshSession } from './api/auth';
import { LoadingState } from './components/ui/states';
import RouteFallback from './components/layout/RouteFallback';

// Lazy page components. Only the Login/bootstrap path is loaded eagerly, so
// the initial bundle stays small and route chunks load on demand.
const StudentDashboard = lazy(loaders['/student']);
const SubjectOverview = lazy(loaders['/student/subject/:id']);
const Chat = lazy(loaders['/student/chat']);
const Quizzes = lazy(loaders['/student/quizzes']);
const QuizTaking = lazy(loaders['/student/quiz/:id']);
const QuizResults = lazy(loaders['/student/quiz/:id/results']);
const FlashcardDecks = lazy(loaders['/student/flashcards']);
const FlashcardStudy = lazy(loaders['/student/flashcards/:id/study']);
const StudentMaterials = lazy(loaders['/student/materials']);
const TeacherDashboard = lazy(loaders['/teacher']);
const TeacherMaterials = lazy(loaders['/teacher/materials']);
const QuizCreateEdit = lazy(loaders['/teacher/quiz/create']);
const Analytics = lazy(loaders['/teacher/analytics']);
const StudentProgress = lazy(loaders['/teacher/students']);

function RequireAuth({ children }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const location = useLocation();
  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function RequireRole({ role, children }) {
  const userRole = useAuthStore((s) => s.role);
  if (!userRole) {
    return <Navigate to="/login" replace />;
  }
  if (userRole !== role) {
    return <Navigate to={userRole === 'teacher' ? '/teacher' : '/student'} replace />;
  }
  return children;
}

function roleHome(role) {
  return role === 'teacher' ? '/teacher' : '/student';
}

/**
 * Restores a session once on app load. The access token is memory-only, so
 * on a reload we silently re-mint it from the HttpOnly refresh cookie, then
 * revalidate against GET /auth/me. Renders a brief splash so guards never
 * flash the wrong role home.
 */
function SessionBootstrap({ children }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      try {
        let token = accessToken;
        if (!token) {
          try {
            token = await refreshSession();
          } catch (err) {
            if (err.status === 401 && !cancelled) clearAuth();
            return;
          }
          if (token && !cancelled) setAccessToken(token);
        }
        if (token) {
          try {
            const user = await fetchMe();
            if (!cancelled) setUser(user);
          } catch {
            // 401 handler in the API client already cleared auth + redirected.
          }
        } else if (!cancelled) {
          clearAuth();
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    restore();
    return () => {
      cancelled = true;
    };
  }, [accessToken, setAccessToken, setUser, clearAuth]);

  if (!ready) {
    return <LoadingState label="Restoring session…" />;
  }
  return children;
}

function RedirectIfAuthed() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  if (accessToken && role) {
    return <Navigate to={roleHome(role)} replace />;
  }
  return <Login />;
}

/**
 * Session bootstrap + lazy routes. Exported separately from the default
 * `App` so tests can wrap the routes in a MemoryRouter.
 */
export function AppRoutes() {
  return (
    <SessionBootstrap>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<RedirectIfAuthed />} />

          {/* ── Student ── */}
          <Route
            path="/student"
            element={
              <RequireAuth>
                <RequireRole role="student">
                  <StudentDashboard />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/student/subject/:id"
            element={
              <RequireAuth>
                <RequireRole role="student">
                  <SubjectOverview />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/student/chat"
            element={
              <RequireAuth>
                <RequireRole role="student">
                  <Chat />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/student/quizzes"
            element={
              <RequireAuth>
                <RequireRole role="student">
                  <Quizzes />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/student/quiz/:id"
            element={
              <RequireAuth>
                <RequireRole role="student">
                  <QuizTaking />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/student/quiz/:id/results"
            element={
              <RequireAuth>
                <RequireRole role="student">
                  <QuizResults />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/student/flashcards"
            element={
              <RequireAuth>
                <RequireRole role="student">
                  <FlashcardDecks />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/student/flashcards/:id/study"
            element={
              <RequireAuth>
                <RequireRole role="student">
                  <FlashcardStudy />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/student/materials"
            element={
              <RequireAuth>
                <RequireRole role="student">
                  <StudentMaterials />
                </RequireRole>
              </RequireAuth>
            }
          />

          {/* ── Teacher ── */}
          <Route
            path="/teacher"
            element={
              <RequireAuth>
                <RequireRole role="teacher">
                  <TeacherDashboard />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/materials"
            element={
              <RequireAuth>
                <RequireRole role="teacher">
                  <TeacherMaterials />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/quiz/create"
            element={
              <RequireAuth>
                <RequireRole role="teacher">
                  <QuizCreateEdit />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/analytics"
            element={
              <RequireAuth>
                <RequireRole role="teacher">
                  <Analytics />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/students"
            element={
              <RequireAuth>
                <RequireRole role="teacher">
                  <StudentProgress />
                </RequireRole>
              </RequireAuth>
            }
          />

          {/* Legacy redirects for old routes */}
          <Route path="/student-old" element={<Navigate to="/student" replace />} />
          <Route path="/teacher-old" element={<Navigate to="/teacher" replace />} />
        </Routes>
      </Suspense>
    </SessionBootstrap>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
