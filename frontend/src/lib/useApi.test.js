import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useApi } from '@/lib/useApi';
import { clear } from '@/lib/apiCache';
import useAuthStore from '@/store/authStore';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  clear();
  useAuthStore.setState({ user: { id: 'u1', role: 'student' }, role: 'student', accessToken: 't' });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useApi', () => {
  it('serves a fresh cached result without refetching on remount', async () => {
    const fetcher = vi.fn().mockResolvedValue('v1');

    const first = renderHook(() => useApi(fetcher, [], { key: ['subjects'], staleMs: 60_000 }));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    expect(first.result.current.data).toBe('v1');
    first.unmount();

    const second = renderHook(() => useApi(fetcher, [], { key: ['subjects'], staleMs: 60_000 }));
    await waitFor(() => expect(second.result.current.loading).toBe(false));
    expect(second.result.current.data).toBe('v1');

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetches on every mount when no key is given', async () => {
    const fetcher = vi.fn().mockResolvedValue('v1');

    const first = renderHook(() => useApi(fetcher, []));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();

    const second = renderHook(() => useApi(fetcher, []));
    await waitFor(() => expect(second.result.current.loading).toBe(false));

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('skips the fetch while enabled is false', () => {
    const fetcher = vi.fn();
    const hook = renderHook(() => useApi(fetcher, [], { key: ['x'], staleMs: 60_000, enabled: false }));

    expect(hook.result.current.loading).toBe(false);
    expect(hook.result.current.data).toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('reload invalidates the cached entry and refetches', async () => {
    const fetcher = vi.fn().mockResolvedValue('v1');
    const hook = renderHook(() => useApi(fetcher, [], { key: ['subjects'], staleMs: 60_000 }));
    await waitFor(() => expect(hook.result.current.loading).toBe(false));

    fetcher.mockResolvedValue('v2');
    act(() => {
      hook.result.current.reload();
    });

    await waitFor(() => expect(hook.result.current.data).toBe('v2'));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('renders stale data while a background revalidation runs', async () => {
    const fetcher = vi.fn().mockResolvedValue('v1');
    const first = renderHook(() => useApi(fetcher, [], { key: ['subjects'], staleMs: 10 }));
    await waitFor(() => expect(first.result.current.data).toBe('v1'));
    first.unmount();

    await sleep(40);

    fetcher.mockResolvedValue('v2');
    const second = renderHook(() => useApi(fetcher, [], { key: ['subjects'], staleMs: 10 }));
    expect(second.result.current.data).toBe('v1');
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.validating).toBe(true);

    await waitFor(() => expect(second.result.current.data).toBe('v2'));
    expect(second.result.current.validating).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
