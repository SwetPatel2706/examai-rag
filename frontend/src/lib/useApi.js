import React, { useCallback, useEffect, useRef, useState } from 'react';
import { buildCacheKey, readCache, getOrFetch, invalidate } from './apiCache';

function initialState(cacheKey, enabled) {
  if (!enabled) return { key: cacheKey, data: undefined, loading: false, error: null, validating: false };
  if (!cacheKey) return { key: cacheKey, data: undefined, loading: true, error: null, validating: false };

  const hit = readCache(cacheKey);
  if (hit.state === 'fresh') {
    return { key: cacheKey, data: hit.data, loading: false, error: null, validating: false };
  }
  if (hit.state === 'stale') {
    return { key: cacheKey, data: hit.data, loading: false, error: null, validating: true };
  }
  return { key: cacheKey, data: undefined, loading: true, error: null, validating: false };
}

/**
 * Data-fetching hook with an optional safe-GET cache.
 *
 * `useApi(fetcher, deps, { key, staleMs, enabled })`
 *
 * - `key` (array of stable string parts): enables the identity-scoped,
 *   freshness-bounded cache. Fresh entries render synchronously; stale entries
 *   render once from cache while a background revalidation runs; concurrent
 *   readers of the same key share one in-flight request.
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
  const cacheKey = key ? buildCacheKey(key) : null;
  const [state, setState] = useState(() => initialState(cacheKey, enabled));
  const [reloadKey, setReloadKey] = useState(0);

  // Track the latest key so `reload` can invalidate the current one without
  // depending on the inline `key` array (whose identity changes every render).
  const keyRef = useRef(key);
  keyRef.current = key;

  // A route-param change can reuse the same component instance. Do not let
  // the previous resource flash while the effect switches to the new key.
  const visibleState = state.key === cacheKey ? state : initialState(cacheKey, enabled);

  useEffect(() => {
    if (!enabled) {
      setState(initialState(cacheKey, false));
      return undefined;
    }

    let cancelled = false;
    setState(initialState(cacheKey, enabled));

    async function run() {
      if (cacheKey) {
        const hit = readCache(cacheKey);
        if (hit.state === 'fresh') {
          if (!cancelled) {
            setState({ key: cacheKey, data: hit.data, loading: false, error: null, validating: false });
          }
          return;
        }
        if (hit.state === 'stale') {
          if (!cancelled) {
            setState({ key: cacheKey, data: hit.data, loading: false, error: null, validating: true });
          }
          try {
            const result = await getOrFetch(cacheKey, fetcher, { staleMs });
            if (!cancelled) {
              setState({ key: cacheKey, data: result, loading: false, error: null, validating: false });
            }
          } catch (err) {
            if (!cancelled) setState((current) => ({ ...current, error: err, validating: false }));
          }
          return;
        }

        // Missing — fetch, deduplicated across readers of the same key.
        if (!cancelled) {
          setState({ key: cacheKey, data: undefined, loading: true, error: null, validating: false });
        }
        try {
          const result = await getOrFetch(cacheKey, fetcher, { staleMs });
          if (!cancelled) {
            setState({ key: cacheKey, data: result, loading: false, error: null, validating: false });
          }
        } catch (err) {
          if (!cancelled) {
            setState({ key: cacheKey, data: undefined, loading: false, error: err, validating: false });
          }
        }
        return;
      }

      // Uncached path — same lifecycle as the pre-cache hook.
      if (!cancelled) setState({ key: cacheKey, data: undefined, loading: true, error: null, validating: false });
      try {
        const result = await fetcher();
        if (!cancelled) {
          setState({ key: cacheKey, data: result, loading: false, error: null, validating: false });
        }
      } catch (err) {
        if (!cancelled) {
          setState({ key: cacheKey, data: undefined, loading: false, error: err, validating: false });
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
    if (cacheKey) invalidate(keyRef.current);
    setReloadKey((current) => current + 1);
  }, [cacheKey]);

  return {
    data: visibleState.data,
    loading: visibleState.loading,
    error: visibleState.error,
    validating: visibleState.validating,
    reload,
  };
}
