import useAuthStore from '@/store/authStore';

/**
 * Small, explicit client data policy for safe GET requests.
 *
 * Rules enforced here:
 * - Cache entries are keyed by the authenticated identity first, so one
 *   user's protected data is never served to another user in the same tab.
 * - Only data written through `getOrFetch` is cached. Mutations, chat
 *   answers, generated content, processing-status polls and expiring URLs
 *   never go through this module (their call sites pass no cache key to
 *   `useApi`, so they bypass it entirely).
 * - Entries are freshness-bounded (`staleMs`). Stale entries are served
 *   once for an immediate render while a background revalidation runs.
 * - Concurrent readers of the same key share a single in-flight request.
 * - `invalidate(prefix)` drops matching entries (current identity only)
 *   after uploads, deletes, retries, quiz mutations, and other writes. It
 *   also bumps a generation counter so an already in-flight request for an
 *   invalidated prefix refetches instead of resolving stale data.
 * - `clear()` is called on logout / session replacement / role change via
 *   an authStore subscription below.
 *
 * Callers pass the array of `parts` they declared at the `useApi` call site;
 * the full key is `"<identity>:<part>/<part>/..."`.
 */

const DEFAULT_STALE_MS = 60_000;

// cacheKey -> { value, expiresAt, inflight }
const store = new Map();

// Bumped by `invalidate` so an in-flight request knows its prefix was
// invalidated while it ran. Bumped by `clear` separately so a fetch that
// finishes after logout never repopulates the cleared cache.
let generation = 0;
let clearCount = 0;

function identity() {
  const { user, role } = useAuthStore.getState();
  return user?.id ?? (role ? `role:${role}` : 'anon');
}

/** Build the fully scoped cache key from stable parts. */
export function buildCacheKey(parts) {
  return `${identity()}:${parts.join('/')}`;
}

/**
 * Read a cache entry.
 * @returns {{ state: 'fresh'|'stale'|'missing', data?: unknown }}
 */
export function readCache(cacheKey) {
  const entry = store.get(cacheKey);
  if (!entry || entry.value === undefined) return { state: 'missing' };
  const fresh = entry.expiresAt > Date.now();
  return { state: fresh ? 'fresh' : 'stale', data: entry.value };
}

/**
 * Return a promise that resolves with data for `cacheKey`, deduplicating
 * concurrent in-flight requests. Fresh entries short-circuit. Stale entries
 * are refetched (the hook renders the stale value while this runs).
 * If the prefix is invalidated while a request is in flight, the request is
 * restarted (or adopts a newer in-flight request) so an obsolete result never
 * reaches the caller; a fetch that resolves after `clear()` is discarded
 * entirely.
 */
export function getOrFetch(cacheKey, fetcher, { staleMs = DEFAULT_STALE_MS } = {}) {
  const existing = store.get(cacheKey);
  if (existing?.value !== undefined && existing.expiresAt > Date.now()) {
    return Promise.resolve(existing.value);
  }
  if (existing?.inflight) return existing.inflight;

  let inflight;
  let settledGeneration = null;
  const clearAtStart = clearCount;
  const load = () => {
    const attemptGeneration = generation;
    return fetcher().then((value) => {
      if (generation === attemptGeneration) {
        settledGeneration = attemptGeneration;
        return value;
      }
      const current = store.get(cacheKey);
      if (current?.inflight && current.inflight !== inflight) return current.inflight;
      return load();
    });
  };

  inflight = load()
    .then((value) => {
      const current = store.get(cacheKey);
      if (
        generation === settledGeneration &&
        clearCount === clearAtStart &&
        (current?.inflight === inflight || current === undefined)
      ) {
        store.set(cacheKey, { value, expiresAt: Date.now() + staleMs });
      }
      return value;
    })
    .catch((err) => {
      const current = store.get(cacheKey);
      if (current?.inflight === inflight) store.delete(cacheKey);
      throw err;
    })
    .finally(() => {
      const current = store.get(cacheKey);
      if (current?.inflight === inflight) delete current.inflight;
    });

  store.set(cacheKey, { ...(existing || {}), inflight });
  return inflight;
}

/**
 * Warm a cache entry before the destination component mounts. This shares the
 * same in-flight map as useApi, so a page mount racing a prefetch still makes
 * one request. Prefetch callers should handle errors because warming is
 * opportunistic and must never block navigation.
 */
export function prefetch(parts, fetcher, options = {}) {
  return getOrFetch(buildCacheKey(parts), fetcher, options);
}

/**
 * Drop every entry whose parts start with the given prefix, for the current
 * identity only. Deleting the entry also drops its in-flight promise, so a
 * later read starts a fresh request; the generation bump makes requests that
 * were already in flight refetch instead of resolving stale data.
 */
export function invalidate(parts) {
  generation += 1;
  const prefix = buildCacheKey(parts);
  for (const cacheKey of store.keys()) {
    if (cacheKey === prefix || cacheKey.startsWith(`${prefix}/`)) {
      store.delete(cacheKey);
    }
  }
}

/** Drop the whole cache — used on logout, session expiry, role change. */
export function clear() {
  clearCount += 1;
  store.clear();
}

// Identity scoping: whenever the signed-in user (or role) changes, cached
// protected data must not leak across identities. This fires on logout
// (clearAuth), session expiry (handleUnauthorized -> clearAuth), role change
// (setUser) and account replacement. `previousIdentity` is seeded from the
// store's current state so even the first observed change clears.
let previousIdentity = identity();
useAuthStore.subscribe((state) => {
  const current = state.user?.id ?? (state.role ? `role:${state.role}` : 'anon');
  if (current !== previousIdentity) {
    clear();
  }
  previousIdentity = current;
});
