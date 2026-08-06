import { request } from './client';

/**
 * POST /api/auth/login → { access_token, refresh_token, expires_in, user }
 * Returns a camelCase session object ready for authStore.setAuth.
 */
export async function login(email, password) {
  const data = await request('/api/auth/login', { method: 'POST', body: { email, password } });
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    user: {
      id: data.user.id,
      email: data.user.email,
      role: data.user.role,
      name: data.user.name,
    },
  };
}

/** GET /api/auth/me — revalidates the persisted session on app load. */
export async function fetchMe() {
  const data = await request('/api/auth/me');
  return { id: data.id, email: data.email, role: data.role, name: data.name };
}

/** POST /api/auth/logout — best-effort remote revocation. */
export async function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}
