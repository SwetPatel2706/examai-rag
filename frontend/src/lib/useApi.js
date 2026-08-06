import React, { useEffect, useState } from 'react';

/**
 * Minimal async hook: runs `fetcher` on mount and whenever `deps` change,
 * exposing { data, loading, error, reload }. Errors are ApiError instances
 * carrying `message` for display and `code` for programmatic handling.
 */
export function useApi(fetcher, deps = []) {
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  function reload() {
    setReloadKey((k) => k + 1);
  }

  return { data, loading, error, reload };
}
