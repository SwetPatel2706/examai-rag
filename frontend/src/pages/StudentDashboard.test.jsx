import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StudentDashboard from './StudentDashboard';
import useAuthStore from '@/store/authStore';

function jsonResponse(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const STUDENT = { id: 'u1', email: 's@test.edu', role: 'student', name: 'Sam' };

beforeEach(() => {
  useAuthStore.setState({ user: STUDENT, role: 'student', accessToken: 't' });
});

afterEach(() => vi.unstubAllGlobals());

describe('StudentDashboard', () => {
  it('shows the screen skeleton while loading, then the loaded content', async () => {
    const subjects = deferred();
    const stats = deferred();
    vi.stubGlobal(
      'fetch',
      vi.fn((url) => {
        if (url.includes('/api/students/me/subjects')) return subjects.promise;
        if (url.includes('/api/students/me/stats')) return stats.promise;
        return Promise.resolve(jsonResponse({ success: true, data: null }));
      })
    );

    render(
      <MemoryRouter>
        <StudentDashboard />
      </MemoryRouter>
    );

    expect(screen.getByRole('status', { name: 'Loading dashboard' })).toBeInTheDocument();
    expect(screen.queryByText('Welcome back')).not.toBeInTheDocument();

    stats.resolve(jsonResponse({ success: true, data: { quizzes_taken: 2, weak_topics_count: 1, avg_score: 75, recent_materials: [] } }));
    subjects.resolve(jsonResponse({ success: true, data: [{ subject_id: 's1', name: 'Algorithms', teachers: [], progress: 50 }] }));

    expect(await screen.findByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByText('Algorithms')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Loading dashboard' })).not.toBeInTheDocument();
  });
});
