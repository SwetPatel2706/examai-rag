import { request } from './client';
import { refreshAccessToken } from './client';

/**
 * POST /api/auth/login → { access_token, expires_in, user }
 * The refresh token is delivered as an HttpOnly cookie by the server, so it
 * never reaches JavaScript and is never persisted in localStorage.
 * Returns a camelCase session object ready for authStore.setAuth.
 */
export async function login(email, password) {
  const data = await request('/api/auth/login', { method: 'POST', body: { email, password } });
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    user: {
      id: data.user.id,
      email: data.user.email,
      role: data.user.role,
      name: data.user.name,
    },
  };
}

/** POST /api/auth/refresh — silently re-mints an access token from the
 * HttpOnly refresh cookie. Resolves to the token, or null if the cookie is
 * missing/expired. Used on app load to restore a session after a reload. */
export function refreshSession() {
  return refreshAccessToken();
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
