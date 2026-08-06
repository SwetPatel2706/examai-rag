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
    set({ user, role, accessToken, refreshToken });
    persist({ user, role, accessToken, refreshToken });
  },

  setUser: (user) => {
    set({ user, role: user.role });
    persist({ user, role: user.role });
  },

  clearAuth: () => {
    set({ user: null, role: null, accessToken: null, refreshToken: null });
    persist({ user: null, role: null, accessToken: null, refreshToken: null });
  },
}));

export default useAuthStore;
