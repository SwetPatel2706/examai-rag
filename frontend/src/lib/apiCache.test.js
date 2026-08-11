import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useAuthStore from '@/store/authStore';
import { buildCacheKey, readCache, getOrFetch, prefetch, invalidate, clear } from '@/lib/apiCache';
import { createQuiz } from '@/api/quizzes';
import { jsonResponse, deferred } from '@/test/helpers';

beforeEach(() => {
  clear();
  useAuthStore.setState({ user: null, role: null, accessToken: null });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('apiCache', () => {
  it('buildCacheKey scopes keys by authenticated identity', () => {
    useAuthStore.setState({ user: { id: 'u1', role: 'student' }, role: 'student' });
    expect(buildCacheKey(['subjects'])).toBe('u1:subjects');

    useAuthStore.setState({ user: null, role: 'teacher', accessToken: null });
    expect(buildCacheKey(['subjects'])).toBe('role:teacher:subjects');

    useAuthStore.setState({ user: null, role: null, accessToken: null });
    expect(buildCacheKey(['subjects'])).toBe('anon:subjects');
  });

  it('serves a fresh entry without calling the fetcher again', async () => {
    useAuthStore.setState({ user: { id: 'u1', role: 'student' }, role: 'student' });
    const fetcher = vi.fn().mockResolvedValue({ ok: 1 });
    const key = buildCacheKey(['subjects']);

    await getOrFetch(key, fetcher, { staleMs: 60_000 });
    const again = await getOrFetch(key, fetcher, { staleMs: 60_000 });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(again).toEqual({ ok: 1 });
    expect(readCache(key)).toEqual({ state: 'fresh', data: { ok: 1 } });
  });

  it('deduplicates concurrent readers of the same key into one request', async () => {
    useAuthStore.setState({ user: { id: 'u1', role: 'student' }, role: 'student' });
    const d = deferred();
    const fetcher = vi.fn(() => d.promise);
    const key = buildCacheKey(['subjects']);

    const p1 = getOrFetch(key, fetcher, { staleMs: 60_000 });
    const p2 = getOrFetch(key, fetcher, { staleMs: 60_000 });
    expect(fetcher).toHaveBeenCalledTimes(1);

    d.resolve({ v: 42 });
    await expect(p1).resolves.toEqual({ v: 42 });
    await expect(p2).resolves.toEqual({ v: 42 });
  });

  it('shares a prefetched request with a later cache reader', async () => {
    useAuthStore.setState({ user: { id: 'u1', role: 'student' }, role: 'student' });
    const d = deferred();
    const fetcher = vi.fn(() => d.promise);

    const warmed = prefetch(['subjects'], fetcher, { staleMs: 60_000 });
    const mounted = getOrFetch(buildCacheKey(['subjects']), fetcher, { staleMs: 60_000 });
    expect(fetcher).toHaveBeenCalledTimes(1);

    d.resolve([{ id: 's1' }]);
    await expect(warmed).resolves.toEqual([{ id: 's1' }]);
    await expect(mounted).resolves.toEqual([{ id: 's1' }]);
  });

  it('refetches once the freshness window passes', async () => {
    vi.useFakeTimers();
    useAuthStore.setState({ user: { id: 'u1', role: 'student' }, role: 'student' });
    const fetcher = vi.fn().mockResolvedValue({ v: 1 });
    const key = buildCacheKey(['stats']);

    await getOrFetch(key, fetcher, { staleMs: 10_000 });
    expect(readCache(key).state).toBe('fresh');

    await vi.advanceTimersByTimeAsync(11_000);
    expect(readCache(key).state).toBe('stale');

    await getOrFetch(key, fetcher, { staleMs: 10_000 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('invalidate drops every entry whose parts start with the prefix', async () => {
    useAuthStore.setState({ user: { id: 'u1', role: 'student' }, role: 'student' });
    const key = buildCacheKey(['subjects', 's1', 'materials', 'ready']);
    await getOrFetch(key, vi.fn().mockResolvedValue('m'), { staleMs: 60_000 });

    invalidate(['subjects']);

    expect(readCache(key)).toEqual({ state: 'missing' });
  });

  it('refetches when invalidate fires while a request is in flight', async () => {
    useAuthStore.setState({ user: { id: 'u1', role: 'student' }, role: 'student' });
    const d1 = deferred();
    const d2 = deferred();
    const fetcher = vi
      .fn()
      .mockImplementationOnce(() => d1.promise)
      .mockImplementationOnce(() => d2.promise);
    const key = buildCacheKey(['subjects']);

    const p = getOrFetch(key, fetcher, { staleMs: 60_000 });
    expect(fetcher).toHaveBeenCalledTimes(1);

    invalidate(['subjects']);
    d1.resolve([{ id: 'old' }]);
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalledTimes(2);

    d2.resolve([{ id: 'new' }]);

    await expect(p).resolves.toEqual([{ id: 'new' }]);
    expect(readCache(key)).toEqual({ state: 'fresh', data: [{ id: 'new' }] });
  });

  it('does not cache a failed fetch', async () => {
    useAuthStore.setState({ user: { id: 'u1', role: 'student' }, role: 'student' });
    const key = buildCacheKey(['subjects']);
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(getOrFetch(key, fetcher, { staleMs: 60_000 })).rejects.toThrow('boom');
    expect(readCache(key)).toEqual({ state: 'missing' });
  });

  it('clears the whole cache when the identity changes', async () => {
    useAuthStore.setState({ user: { id: 'u1', role: 'student' }, role: 'student' });
    const key1 = buildCacheKey(['subjects']);
    await getOrFetch(key1, vi.fn().mockResolvedValue('u1-data'), { staleMs: 60_000 });

    useAuthStore.setState({ user: { id: 'u2', role: 'student' }, role: 'student' });
    expect(readCache(key1)).toEqual({ state: 'missing' });

    useAuthStore.setState({ user: null, role: null, accessToken: null });
    expect(buildCacheKey(['subjects'])).toBe('anon:subjects');
  });

  it('clears the whole cache on logout', async () => {
    useAuthStore.setState({ user: { id: 'u1', role: 'student' }, role: 'student' });
    const key = buildCacheKey(['subjects']);
    await getOrFetch(key, vi.fn().mockResolvedValue('data'), { staleMs: 60_000 });

    useAuthStore.getState().clearAuth();

    expect(readCache(key)).toEqual({ state: 'missing' });
  });

  it('does not repopulate the store when an in-flight request resolves after clear', async () => {
    useAuthStore.setState({ user: { id: 'u1', role: 'student' }, role: 'student' });
    const key = buildCacheKey(['subjects']);
    const d = deferred();
    const fetcher = vi.fn(() => d.promise);

    const p = getOrFetch(key, fetcher, { staleMs: 60_000 });
    expect(fetcher).toHaveBeenCalledTimes(1);

    clear();
    d.resolve({ v: 1 });

    await expect(p).resolves.toEqual({ v: 1 });
    expect(readCache(key)).toEqual({ state: 'missing' });
  });

  it('createQuiz invalidates cached quiz lists', async () => {
    useAuthStore.setState({ user: { id: 't1', role: 'teacher' }, role: 'teacher', accessToken: 't' });
    const key = buildCacheKey(['quizzes', 'overview']);
    await getOrFetch(key, vi.fn().mockResolvedValue([{ id: 'old' }]), { staleMs: 60_000 });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: true, data: { id: 'q-new' } })));
    await createQuiz({
      subjectId: 's1',
      topic: 'Arrays',
      questions: [{ stem: 'Q', options: ['A', 'B'], correct: 0, topicTag: 'complexity', difficulty: 'easy' }],
    });

    expect(readCache(key)).toEqual({ state: 'missing' });
  });
});
