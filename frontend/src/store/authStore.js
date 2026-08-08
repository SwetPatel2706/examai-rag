import { create } from 'zustand';

const STORAGE_KEY = 'examai.auth';

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const persisted = loadPersisted();

// Only identity (user + role) is persisted. The access token lives in memory
// only, and the long-lived refresh token is an HttpOnly cookie scoped to
// /api/auth that JavaScript can never read — see POST /api/auth/refresh.
// On reload, SessionBootstrap silently re-mints an access token from that
// cookie before rendering any guarded route.
function persist(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: state.user, role: state.role }));
  } catch {
    // ignore storage failures (private mode / quota)
  }
}

const useAuthStore = create((set) => ({
  user: persisted?.user ?? null, // { id, email, role, name }
  role: persisted?.role ?? null, // 'student' | 'teacher'
  accessToken: null, // memory-only — re-minted from the refresh cookie on load

  setAuth: (user, role, { accessToken } = {}) => {
    set((state) => {
      const next = { ...state, user, role, accessToken };
      persist(next);
      return next;
    });
  },

  setUser: (user) => {
    set((state) => {
      const next = { ...state, user, role: user.role };
      persist(next);
      return next;
    });
  },

  setAccessToken: (accessToken) => {
    set({ accessToken });
  },

  clearAuth: () => {
    set((state) => {
      const next = { ...state, user: null, role: null, accessToken: null };
      persist(next);
      return next;
    });
  },
}));

export default useAuthStore;
