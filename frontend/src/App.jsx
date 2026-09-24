import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Login from './pages/Login';
import { loaders, preloadRoleData } from './lib/lazyRoutes';
import useAuthStore from './store/authStore';
import { fetchMe, refreshSession } from './api/auth';
import { LoadingState } from './components/ui/states';
import AppLayout from './components/layout/AppLayout';
import RouteFallback from './components/layout/RouteFallback';
import { markNavigationReady } from './lib/navigationPerformance';

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
            if (!cancelled) {
              setUser(user);
              // Token + identity are known: warm the cache for every screen
              // the role can reach so first-click navigation renders from
              // fresh data instead of mounting with skeletons.
              void preloadRoleData(user.role);
            }
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

function RouteReady({ children }) {
  const location = useLocation();

  useEffect(() => {
    markNavigationReady(location.pathname);
  }, [location.pathname]);

  return children;
}

function StandardRoute({ role, Page }) {
  return (
    <RequireAuth>
      <RequireRole role={role}>
        <AppLayout role={role}>
          <Suspense fallback={<RouteFallback fullScreen={false} />}>
            <RouteReady><Page /></RouteReady>
          </Suspense>
        </AppLayout>
      </RequireRole>
    </RequireAuth>
  );
}

function FocusRoute({ role, Page }) {
  return (
    <RequireAuth>
      <RequireRole role={role}>
        <Suspense fallback={<RouteFallback />}>
          <RouteReady><Page /></RouteReady>
        </Suspense>
      </RequireRole>
    </RequireAuth>
  );
}

/**
 * Session bootstrap + lazy routes. Exported separately from the default
 * `App` so tests can wrap the routes in a MemoryRouter.
 */
export function AppRoutes() {
  return (
    <SessionBootstrap>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<RedirectIfAuthed />} />

        {/* ── Student ── */}
        <Route path="/student" element={<StandardRoute role="student" Page={StudentDashboard} />} />
        <Route path="/student/subject/:id" element={<StandardRoute role="student" Page={SubjectOverview} />} />
        <Route path="/student/chat" element={<StandardRoute role="student" Page={Chat} />} />
        <Route path="/student/quizzes" element={<StandardRoute role="student" Page={Quizzes} />} />
        <Route path="/student/quiz/:id" element={<FocusRoute role="student" Page={QuizTaking} />} />
        <Route path="/student/quiz/:id/results" element={<FocusRoute role="student" Page={QuizResults} />} />
        <Route path="/student/flashcards" element={<StandardRoute role="student" Page={FlashcardDecks} />} />
        <Route path="/student/flashcards/:id/study" element={<FocusRoute role="student" Page={FlashcardStudy} />} />
        <Route path="/student/materials" element={<StandardRoute role="student" Page={StudentMaterials} />} />

        {/* ── Teacher ── */}
        <Route path="/teacher" element={<StandardRoute role="teacher" Page={TeacherDashboard} />} />
        <Route path="/teacher/materials" element={<StandardRoute role="teacher" Page={TeacherMaterials} />} />
        <Route path="/teacher/quiz/create" element={<StandardRoute role="teacher" Page={QuizCreateEdit} />} />
        <Route path="/teacher/analytics" element={<StandardRoute role="teacher" Page={Analytics} />} />
        <Route path="/teacher/students" element={<StandardRoute role="teacher" Page={StudentProgress} />} />

        {/* Legacy redirects for old routes */}
        <Route path="/student-old" element={<Navigate to="/student" replace />} />
        <Route path="/teacher-old" element={<Navigate to="/teacher" replace />} />
      </Routes>
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
