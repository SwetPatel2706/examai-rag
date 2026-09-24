/**
 * Defer non-critical prefetch work until the browser is idle so the current
 * page stays interactive while sibling/param-variant data warms in the
 * background. Falls back to a macrotask when `requestIdleCallback` is
 * unavailable (e.g. Safari, jsdom tests).
 *
 * Usage: `runWhenIdle(() => void preloadStudentDashboardIdle(subjects))`.
 * The task's errors are swallowed — warming must never break the visible page.
 */
export function runWhenIdle(task, { timeout = 2000 } = {}) {
  const run = () => {
    try {
      const result = task();
      if (result && typeof result.catch === 'function') {
        result.catch(() => {});
      }
    } catch {
      // Opportunistic warming — ignore failures.
    }
  };
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout });
    return;
  }
  setTimeout(run, 0);
}
