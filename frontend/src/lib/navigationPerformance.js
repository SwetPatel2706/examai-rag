const pending = new Map();

function now() {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

/** Record the beginning of an intentional route transition. */
export function markNavigationStart(path) {
  if (!path) return;
  const startedAt = now();
  pending.set(path, startedAt);
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(`examai:navigation:start:${path}`);
  }
}

/**
 * Complete a route transition and expose the result for the manual performance
 * run without sending telemetry or adding a production analytics dependency.
 */
export function markNavigationReady(path) {
  if (!path) return null;
  const startedAt = pending.get(path);
  if (startedAt === undefined) return null;

  pending.delete(path);
  const duration = Math.max(0, now() - startedAt);
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(`examai:navigation:ready:${path}`);
  }

  const detail = { path, duration, withinWarmBudget: duration < 300 };
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('examai:navigation-ready', { detail }));
  }
  if (import.meta.env?.DEV) console.debug('[ExamAI navigation]', detail);
  return detail;
}

export function resetNavigationMeasurements() {
  pending.clear();
}
