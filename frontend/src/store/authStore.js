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

function persist(state) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: state.user,
        role: state.role,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      })
    );
  } catch {
    // ignore storage failures (private mode / quota)
  }
}

const useAuthStore = create((set) => ({
  user: persisted?.user ?? null, // { id, email, role, name }
  role: persisted?.role ?? null, // 'student' | 'teacher'
  accessToken: persisted?.accessToken ?? null,
  refreshToken: persisted?.refreshToken ?? null,

  setAuth: (user, role, { accessToken, refreshToken } = {}) => {
    set((state) => {
      const next = { ...state, user, role, accessToken, refreshToken };
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

  clearAuth: () => {
    set((state) => {
      const next = { ...state, user: null, role: null, accessToken: null, refreshToken: null };
      persist(next);
      return next;
    });
  },
}));

export default useAuthStore;
