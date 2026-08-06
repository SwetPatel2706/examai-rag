import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';
import useAuthStore from '@/store/authStore';

function jsonResponse(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/student" element={<div>Student Home</div>} />
        <Route path="/teacher" element={<div>Teacher Home</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function loginEnvelope(role) {
  return {
    success: true,
    data: {
      access_token: `at-${role}`,
      refresh_token: 'rt-1',
      expires_in: 3600,
      user: { id: 'u1', email: `${role}@examai.com`, role, name: 'Test User' },
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('Login', () => {
  it('logs in a student and redirects to the student home', async () => {
    useAuthStore.getState().clearAuth();
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(loginEnvelope('student'))));

    renderLogin();
    await user.type(screen.getByLabelText('Email Address'), 'student@examai.com');
    await user.type(screen.getByLabelText('Password'), 'Password123!');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Student Home')).toBeInTheDocument();
    expect(useAuthStore.getState().role).toBe('student');
    expect(useAuthStore.getState().accessToken).toBe('at-student');
  });

  it('redirects a teacher to the teacher home', async () => {
    useAuthStore.getState().clearAuth();
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(loginEnvelope('teacher'))));

    renderLogin();
    await user.type(screen.getByLabelText('Email Address'), 'teacher@examai.com');
    await user.type(screen.getByLabelText('Password'), 'Password123!');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Teacher Home')).toBeInTheDocument();
    expect(useAuthStore.getState().role).toBe('teacher');
  });

  it('shows the error banner when login fails', async () => {
    useAuthStore.getState().clearAuth();
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } }, 401)
      )
    );

    renderLogin();
    await user.type(screen.getByLabelText('Email Address'), 'student@examai.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('does not show a session-expired banner on a fresh login page', async () => {
    useAuthStore.getState().clearAuth();
    renderLogin();
    await waitFor(() => expect(screen.getByLabelText('Email Address')).toBeInTheDocument());
    expect(screen.queryByText('Your session expired. Please log in again.')).not.toBeInTheDocument();
  });
});
