import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '@/App';
import { clear } from '@/lib/apiCache';
import useAuthStore from '@/store/authStore';

const STUDENT = { id: 'u1', email: 's@test.edu', role: 'student', name: 'Sam' };
const TEACHER = { id: 't1', email: 't@test.edu', role: 'teacher', name: 'Dr Lee' };

function jsonResponse(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

function stubApi({ profile, subjects = [], stats = {}, teacherSubjects = [], dashboardStats = {}, refresh }) {
  const handler = vi.fn(async (url) => {
    if (url.includes('/api/auth/refresh')) {
      if (refresh) return jsonResponse(refresh, 200);
      return jsonResponse({ success: false, error: { code: 'NO_SESSION' } }, 401);
    }
    if (url.includes('/api/auth/me')) return jsonResponse({ success: true, data: profile });
    if (url.includes('/api/students/me/subjects')) return jsonResponse({ success: true, data: subjects });
    if (url.includes('/api/students/me/stats')) return jsonResponse({ success: true, data: stats });
    if (url.includes('/api/teachers/me/subjects')) return jsonResponse({ success: true, data: teacherSubjects });
    if (url.includes('/api/teacher/dashboard-stats')) return jsonResponse({ success: true, data: dashboardStats });
    return jsonResponse({ success: true, data: null });
  });
  vi.stubGlobal('fetch', handler);
  return handler;
}

function studentSubjects() {
  return [{ subject_id: 's1', name: 'Algorithms', teachers: [], progress: 50 }];
}

function studentStats() {
  return { quizzes_taken: 2, weak_topics_count: 1, avg_score: 75, recent_materials: [] };
}

beforeEach(() => {
  clear();
  useAuthStore.setState({ user: null, role: null, accessToken: null });
});

afterEach(() => vi.unstubAllGlobals());

describe('AppRoutes', () => {
  it('renders the student dashboard from a lazy route', async () => {
    useAuthStore.setState({ user: STUDENT, role: 'student', accessToken: 't' });
    stubApi({
      profile: STUDENT,
      subjects: studentSubjects(),
      stats: studentStats(),
    });

    render(
      <MemoryRouter initialEntries={['/student']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByText('Algorithms')).toBeInTheDocument();
  });

  it('renders the teacher dashboard from a lazy route', async () => {
    useAuthStore.setState({ user: TEACHER, role: 'teacher', accessToken: 't' });
    stubApi({
      profile: TEACHER,
      teacherSubjects: [],
      dashboardStats: {
        active_students: 3,
        subject_materials: 5,
        quizzes_created: 2,
        avg_section_score: 70,
        grade_distribution: [],
        recent_activity: [],
      },
    });

    render(
      <MemoryRouter initialEntries={['/teacher']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByText('Dashboard Overview')).toBeInTheDocument();
  });

  it('redirects an unauthenticated visitor to login', async () => {
    stubApi({ profile: STUDENT, subjects: studentSubjects(), stats: studentStats() });

    render(
      <MemoryRouter initialEntries={['/student']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByText('Welcome Back')).toBeInTheDocument();
  });

  it('redirects a student away from a teacher route', async () => {
    useAuthStore.setState({ user: STUDENT, role: 'student', accessToken: 't' });
    stubApi({ profile: STUDENT, subjects: studentSubjects(), stats: studentStats() });

    render(
      <MemoryRouter initialEntries={['/teacher']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByText('Algorithms')).toBeInTheDocument();
  });
});
