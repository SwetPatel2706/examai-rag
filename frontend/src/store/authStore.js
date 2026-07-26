import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: null,        // { id, name, email, avatarUrl }
  role: null,        // 'student' | 'teacher'
  setAuth: (user, role) => set({ user, role }),
  clearAuth: () => set({ user: null, role: null }),
}));

export default useAuthStore;
