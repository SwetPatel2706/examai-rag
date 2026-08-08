import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { request, ApiError, setRedirectToLogin } from './client';
import useAuthStore from '@/store/authStore';

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

describe('request()', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  afterEach(() => {
    setRedirectToLogin((url) => window.location.assign(url));
    vi.unstubAllGlobals();
  });

  it('unwraps the success envelope and returns data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: true, data: { ok: 1 } })));
    await expect(request('/api/subjects')).resolves.toEqual({ ok: 1 });
  });

  it('sends the bearer token from authStore and includes credentials for the refresh cookie', async () => {
    useAuthStore.getState().setAuth(
      { id: 'u1', email: 's@examai.com', role: 'student', name: 'S' },
      'student',
      { accessToken: 'tok-123' }
    );
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, data: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await request('/api/subjects');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('http://localhost:8000/api/subjects');
    expect(init.headers.Authorization).toBe('Bearer tok-123');
    expect(init.credentials).toBe('include');
  });

  it('throws ApiError with envelope details on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            success: false,
            error: { code: 'FORBIDDEN', message: 'Not enrolled', request_id: 'req-1' },
          },
          403
        )
      )
    );

    const err = await request('/api/materials').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
    expect(err.message).toBe('Not enrolled');
    expect(err.requestId).toBe('req-1');
  });

  it('throws a network ApiError when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const err = await request('/api/subjects').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
    expect(err.code).toBe('NETWORK_ERROR');
  });

  it('silently refreshes via the cookie and retries once on 401', async () => {
    useAuthStore.getState().setAuth(
      { id: 'u1', email: 's@examai.com', role: 'student', name: 'S' },
      'student',
      { accessToken: 'expired' }
    );
    const calls = [];
    const fetchMock = vi.fn((url, init) => {
      calls.push({ url, init });
      if (url.includes('/api/auth/refresh')) {
        return Promise.resolve(jsonResponse({ success: true, data: { access_token: 'fresh-token' } }));
      }
      if (calls.filter((c) => c.url.includes('/api/me')).length === 1) {
        return Promise.resolve(jsonResponse({ success: false, error: { code: 'UNAUTHORIZED', message: 'Expired' } }, 401));
      }
      return Promise.resolve(jsonResponse({ success: true, data: { ok: 1 } }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const data = await request('/api/me');
    expect(data).toEqual({ ok: 1 });
    expect(useAuthStore.getState().accessToken).toBe('fresh-token');
    const meCalls = calls.filter((c) => c.url.includes('/api/me'));
    expect(meCalls).toHaveLength(2);
    expect(meCalls[0].init.headers.Authorization).toBe('Bearer expired');
    expect(meCalls[1].init.headers.Authorization).toBe('Bearer fresh-token');
    expect(calls.some((c) => c.url.includes('/api/auth/refresh'))).toBe(true);
  });

  it('clears auth and redirects to login on 401 when the refresh cookie is gone', async () => {
    useAuthStore.getState().setAuth(
      { id: 'u1', email: 's@examai.com', role: 'student', name: 'S' },
      'student',
      { accessToken: 'expired' }
    );
    const assign = vi.fn();
    setRedirectToLogin(assign);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: false, error: { code: 'UNAUTHORIZED', message: 'Expired' } }, 401)));

    await request('/api/me').catch(() => {});
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(assign).toHaveBeenCalledWith('/login?expired=1');
  });

  it('clears auth and redirects before decoding a non-JSON 401', async () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'student' }, 'student', { accessToken: 'expired' });
    const redirect = vi.fn();
    setRedirectToLogin(redirect);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401, json: async () => { throw new Error('not json'); } }));

    await request('/api/me').catch(() => {});
    expect(redirect).toHaveBeenCalledWith('/login?expired=1');
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('omits empty query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, data: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await request('/api/students/me/materials', { params: { subject_id: undefined, search: '', page: 1, size: 100 } });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('page=1');
    expect(url).toContain('size=100');
    expect(url).not.toContain('subject_id');
    expect(url).not.toContain('search');
  });

  it('JSON-encodes the request body for non-GET methods', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, data: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await request('/api/chat', { method: 'POST', body: { question: 'hi' } });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ question: 'hi' });
  });
});
