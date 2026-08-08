import { describe, it, expect, beforeEach } from 'vitest';
import useAuthStore from './authStore';

const STORAGE_KEY = 'examai.auth';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('setAuth stores session, access token in memory, identity persisted', () => {
    useAuthStore.getState().setAuth(
      { id: 'u1', email: 's@examai.com', role: 'student', name: 'Sam' },
      'student',
      { accessToken: 'at-1' }
    );

    expect(useAuthStore.getState().user.name).toBe('Sam');
    expect(useAuthStore.getState().role).toBe('student');
    expect(useAuthStore.getState().accessToken).toBe('at-1');

    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(persisted).toMatchObject({ role: 'student' });
    expect(persisted.user.email).toBe('s@examai.com');
    // Secrets must never be persisted: the access token is memory-only and
    // the refresh token is an HttpOnly cookie JS cannot read.
    expect(persisted).not.toHaveProperty('accessToken');
    expect(persisted).not.toHaveProperty('refreshToken');
  });

  it('setUser updates the role from the server response', () => {
    useAuthStore.getState().setAuth(
      { id: 'u1', email: 's@examai.com', role: 'student', name: 'Sam' },
      'student',
      { accessToken: 'at-1' }
    );
    useAuthStore.getState().setUser({ id: 'u1', email: 's@examai.com', role: 'teacher', name: 'Sam' });

    expect(useAuthStore.getState().role).toBe('teacher');
    // setUser keeps the in-memory access token and never persists it.
    expect(useAuthStore.getState().accessToken).toBe('at-1');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).role).toBe('teacher');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).not.toHaveProperty('accessToken');
  });

  it('setAccessToken updates the in-memory token without persisting', () => {
    useAuthStore.getState().setAuth(
      { id: 'u1', email: 's@examai.com', role: 'student', name: 'Sam' },
      'student',
      { accessToken: 'old' }
    );
    useAuthStore.getState().setAccessToken('fresh');

    expect(useAuthStore.getState().accessToken).toBe('fresh');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).not.toHaveProperty('accessToken');
  });

  it('clearAuth wipes the session and persisted identity', () => {
    useAuthStore.getState().setAuth(
      { id: 'u1', email: 's@examai.com', role: 'student', name: 'Sam' },
      'student',
      { accessToken: 'at-1' }
    );
    useAuthStore.getState().clearAuth();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(persisted.user).toBeNull();
    expect(persisted.role).toBeNull();
  });
});
