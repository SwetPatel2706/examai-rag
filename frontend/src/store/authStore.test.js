import { describe, it, expect, beforeEach } from 'vitest';
import useAuthStore from './authStore';

const STORAGE_KEY = 'examai.auth';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('setAuth stores session and persists to localStorage', () => {
    useAuthStore.getState().setAuth(
      { id: 'u1', email: 's@examai.com', role: 'student', name: 'Sam' },
      'student',
      { accessToken: 'at-1', refreshToken: 'rt-1' }
    );

    expect(useAuthStore.getState().user.name).toBe('Sam');
    expect(useAuthStore.getState().role).toBe('student');
    expect(useAuthStore.getState().accessToken).toBe('at-1');

    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(persisted).toMatchObject({ role: 'student', accessToken: 'at-1', refreshToken: 'rt-1' });
    expect(persisted.user.email).toBe('s@examai.com');
  });

  it('setUser updates the role from the server response', () => {
    useAuthStore.getState().setAuth(
      { id: 'u1', email: 's@examai.com', role: 'student', name: 'Sam' },
      'student',
      { accessToken: 'at-1', refreshToken: 'rt-1' }
    );
    useAuthStore.getState().setUser({ id: 'u1', email: 's@examai.com', role: 'teacher', name: 'Sam' });

    expect(useAuthStore.getState().role).toBe('teacher');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).role).toBe('teacher');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toMatchObject({ accessToken: 'at-1', refreshToken: 'rt-1' });
  });

  it('clearAuth wipes the session and persisted state', () => {
    useAuthStore.getState().setAuth(
      { id: 'u1', email: 's@examai.com', role: 'student', name: 'Sam' },
      'student',
      { accessToken: 'at-1', refreshToken: 'rt-1' }
    );
    useAuthStore.getState().clearAuth();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(persisted.user).toBeNull();
    expect(persisted.accessToken).toBeNull();
  });
});
