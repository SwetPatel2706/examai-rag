import { useState } from 'react';

/**
 * Shared mutation runner for admin pages: clears the page-level error, runs
 * the action, and reloads the given lists (their `useApi` hooks invalidate
 * the shared cache keys first, so warmers and sibling pages stay fresh).
 * Rethrows by default so dialog forms can keep their inputs intact while
 * showing their own inline error; pass `{ rethrow: false }` for
 * fire-and-forget handlers (e.g. onClick deletes) so a failure only sets the
 * banner instead of an unhandled rejection.
 */
export function useAdminAction(reloadFns = []) {
  const [actionError, setActionError] = useState(null);

  async function run(action, { rethrow = true } = {}) {
    setActionError(null);
    try {
      await action();
      await Promise.all(reloadFns.map((reload) => reload()));
    } catch (err) {
      setActionError(err.message || 'Request failed.');
      if (rethrow) throw err;
    }
  }

  return { actionError, run };
}
