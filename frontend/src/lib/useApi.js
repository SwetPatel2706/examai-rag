import React, { useCallback, useEffect, useState } from 'react';
import { buildCacheKey, readCache, getOrFetch, invalidate } from './apiCache';

/**
 * Data-fetching hook with an optional safe-GET cache.
 *
 * `useApi(fetcher, deps, { key, staleMs, enabled })`
 *
 * - `key` (array of stable string parts): enables the identity-scoped,
 *   freshness-bounded cache. Fresh entries render without a network call;
 *   stale entries render once from cache while a background revalidation
 *   runs; concurrent readers of the same key share one in-flight request.
 * - `key` omitted: previous behaviour — plain fetch on mount / dep change,
 *   never cached (used for chat answers, mutations, status polls, uploads,
 *   generated content, and expiring URLs).
 * - `staleMs`: freshness window for this resource (default 60s).
 * - `enabled`: when false, no request is issued and `loading` is false.
 *
 * Exposes { data, loading, error, validating, reload }.
 * Errors are ApiError instances carrying `message` and `code`.
 */
export function useApi(fetcher, deps = [], { key, staleMs, enabled = true } = {}) {
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [validating, setValidating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const cacheKey = key ? buildCacheKey(key) : null;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return undefined;
    }

    let cancelled = false;
    setError(null);

    async function run() {
      if (cacheKey) {
        const hit = readCache(cacheKey, { staleMs });
        if (hit.state === 'fresh') {
          if (!cancelled) {
            setData(hit.data);
            setLoading(false);
            setValidating(false);
          }
          return;
        }
        if (hit.state === 'stale') {
          if (!cancelled) {
            setData(hit.data);
            setLoading(false);
            setValidating(true);
          }
          try {
            const result = await getOrFetch(cacheKey, fetcher, { staleMs });
            if (!cancelled) {
              setData(result);
              setValidating(false);
            }
          } catch (err) {
            if (!cancelled) setError(err);
            setValidating(false);
          }
          return;
        }
        // missing — fetch (deduplicated across readers of this key)
        if (!cancelled) {
          setLoading(true);
          setValidating(false);
        }
        try {
          const result = await getOrFetch(cacheKey, fetcher, { staleMs });
          if (!cancelled) {
            setData(result);
            setLoading(false);
          }
        } catch (err) {
          if (!cancelled) {
            setError(err);
            setLoading(false);
          }
        }
        return;
      }

      // Uncached path — same lifecycle as the pre-cache hook.
      if (!cancelled) setLoading(true);
      try {
        const result = await fetcher();
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, staleMs, enabled, reloadKey, ...deps]);

  const reload = useCallback(() => {
    if (cacheKey) invalidate(key);
    setReloadKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, key]);

  return { data, loading, error, validating, reload };
}
