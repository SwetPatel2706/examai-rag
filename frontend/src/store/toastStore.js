import { create } from 'zustand';

let nextId = 1;
const DEFAULT_DURATION_MS = 4000;
const timers = new Map();

function dismiss(id) {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  useToastStore.setState((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  }));
}

function push(message, variant = 'success', durationMs = DEFAULT_DURATION_MS) {
  const id = nextId++;
  useToastStore.setState((state) => ({
    toasts: [...state.toasts.slice(-2), { id, message, variant }],
  }));
  timers.set(id, setTimeout(() => dismiss(id), durationMs));
  return id;
}

const useToastStore = create(() => ({
  toasts: [],
}));

/** Confirmative UI for completed actions. Mirrors the design-system banners. */
export const toast = {
  success: (message) => push(message, 'success'),
  error: (message) => push(message, 'error'),
  dismiss,
};

export default useToastStore;
