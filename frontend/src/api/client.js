import useAuthStore from '@/store/authStore';

const DEFAULT_BASE_URL = 'http://localhost:8000';

export function getBaseUrl() {
  return import.meta.env?.VITE_API_BASE_URL || DEFAULT_BASE_URL;
}

export class ApiError extends Error {
  constructor({ status, code, message, requestId, details }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

function buildUrl(path, params) {
  const url = new URL(path, getBaseUrl());
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

let redirectToLogin = (url) => window.location.assign(url);

export function setRedirectToLogin(handler) {
  redirectToLogin = handler;
}

function handleUnauthorized() {
  const { clearAuth } = useAuthStore.getState();
  clearAuth();
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    redirectToLogin('/login?expired=1');
  }
}

/**
 * Thin fetch wrapper around the FastAPI backend.
 * - prefixes every path with VITE_API_BASE_URL
 * - attaches the bearer token from authStore
 * - unwraps the { success, data, error } envelope and returns `data`
 * - throws ApiError with status/code/message/requestId on failure
 * - on 401 clears the session and redirects to /login?expired=1
 */
export async function request(path, { method = 'GET', body, params, formData, headers = {} } = {}) {
  const token = useAuthStore.getState().accessToken;

  const requestHeaders = { ...headers };
  if (token) requestHeaders.Authorization = `Bearer ${token}`;

  let fetchBody = undefined;
  if (formData) {
    fetchBody = formData;
  } else if (body !== undefined && method !== 'GET') {
    requestHeaders['Content-Type'] = 'application/json';
    fetchBody = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers: requestHeaders,
      body: fetchBody,
    });
  } catch {
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Could not reach the server. Check your connection and try again.',
    });
  }

  if (response.status === 401) {
    handleUnauthorized();
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError({
      status: response.status,
      code: 'INVALID_RESPONSE',
      message: 'The server returned an unexpected response.',
    });
  }

  if (!payload || typeof payload.success !== 'boolean') {
    throw new ApiError({
      status: response.status,
      code: 'INVALID_ENVELOPE',
      message: 'Unexpected server response.',
    });
  }

  if (!payload.success) {
    const err = payload.error || {};
    throw new ApiError({
      status: response.status,
      code: err.code || 'API_ERROR',
      message: err.message || 'Request failed.',
      requestId: err.request_id,
      details: err.details,
    });
  }

  return payload.data;
}
