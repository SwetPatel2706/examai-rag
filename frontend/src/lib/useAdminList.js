import { useCallback, useEffect, useState } from 'react';

/** Shared fetch + reload helper for admin list endpoints. */
export function useAdminList(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetcher());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload, setData };
}

/**
 * Shared mutation runner: clears the page-level error, runs the action, and
 * reloads the given lists. Rethrows by default so dialog forms can keep their
 * inputs intact while showing their own inline error; pass
 * `{ rethrow: false }` for fire-and-forget handlers (e.g. onClick deletes)
 * so a failure only sets the banner instead of an unhandled rejection.
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
