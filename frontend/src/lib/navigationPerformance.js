const pending = new Map();

function now() {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

/** Strip query-string and hash segments so equivalent route paths match. */
function normalizePath(path) {
  return path.split('?')[0].split('#')[0];
}

/** Record the beginning of an intentional route transition. */
export function markNavigationStart(path) {
  if (!path) return;
  const normalized = normalizePath(path);
  const startedAt = now();
  pending.set(normalized, startedAt);
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(`examai:navigation:start:${normalized}`);
  }
}

/**
 * Complete a route transition and expose the result for the manual performance
 * run without sending telemetry or adding a production analytics dependency.
 */
export function markNavigationReady(path) {
  if (!path) return null;
  const normalized = normalizePath(path);
  const startedAt = pending.get(normalized);
  if (startedAt === undefined) return null;

  pending.delete(normalized);
  const duration = Math.max(0, now() - startedAt);
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(`examai:navigation:ready:${normalized}`);
  }

  const detail = { path: normalized, duration, withinWarmBudget: duration < 300 };
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('examai:navigation-ready', { detail }));
  }
  if (import.meta.env?.DEV) console.debug('[ExamAI navigation]', detail);
  return detail;
}

export function resetNavigationMeasurements() {
  pending.clear();
}
