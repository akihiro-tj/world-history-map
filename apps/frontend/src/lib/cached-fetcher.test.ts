import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CachedFetcher } from './cached-fetcher';

describe('CachedFetcher', () => {
  let fetchFn: ReturnType<typeof vi.fn<() => Promise<unknown>>>;

  beforeEach(() => {
    fetchFn = vi.fn<() => Promise<unknown>>();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls fetch function on first load', async () => {
    fetchFn.mockResolvedValue({ value: 42 });
    const fetcher = new CachedFetcher({ fetch: fetchFn });

    const result = await fetcher.load();

    expect(result).toEqual({ value: 42 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('returns cached value on subsequent loads without re-fetching', async () => {
    fetchFn.mockResolvedValue({ value: 42 });
    const fetcher = new CachedFetcher({ fetch: fetchFn });

    await fetcher.load();
    const result = await fetcher.load();

    expect(result).toEqual({ value: 42 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent requests by sharing the pending promise', async () => {
    fetchFn.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ value: 42 }), 10)),
    );
    const fetcher = new CachedFetcher({ fetch: fetchFn });

    const [r1, r2, r3] = await Promise.all([fetcher.load(), fetcher.load(), fetcher.load()]);

    expect(r1).toEqual({ value: 42 });
    expect(r2).toEqual({ value: 42 });
    expect(r3).toEqual({ value: 42 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('get() returns null before load', () => {
    const fetcher = new CachedFetcher({ fetch: fetchFn });

    expect(fetcher.get()).toBeNull();
  });

  it('get() returns cached value after load', async () => {
    fetchFn.mockResolvedValue({ value: 42 });
    const fetcher = new CachedFetcher({ fetch: fetchFn });

    await fetcher.load();

    expect(fetcher.get()).toEqual({ value: 42 });
  });

  it('clear() resets cache so next load re-fetches', async () => {
    fetchFn.mockResolvedValueOnce({ value: 1 }).mockResolvedValueOnce({ value: 2 });
    const fetcher = new CachedFetcher({ fetch: fetchFn });

    await fetcher.load();
    fetcher.clear();
    const result = await fetcher.load();

    expect(result).toEqual({ value: 2 });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('clear() also resets get() to null', async () => {
    fetchFn.mockResolvedValue({ value: 42 });
    const fetcher = new CachedFetcher({ fetch: fetchFn });

    await fetcher.load();
    fetcher.clear();

    expect(fetcher.get()).toBeNull();
  });

  it('runs validation and caches on success', async () => {
    fetchFn.mockResolvedValue({ value: 42 });
    const validate = vi.fn().mockReturnValue(true);
    const fetcher = new CachedFetcher({ fetch: fetchFn, validate });

    const result = await fetcher.load();

    expect(result).toEqual({ value: 42 });
    expect(validate).toHaveBeenCalledWith({ value: 42 });
  });

  it('throws and does not cache when validation fails', async () => {
    fetchFn.mockResolvedValue({ value: -1 });
    const fetcher = new CachedFetcher({
      fetch: fetchFn,
      validate: () => false,
    });

    await expect(fetcher.load()).rejects.toThrow('Validation failed');
    expect(fetcher.get()).toBeNull();
  });

  it('allows retry after fetch failure', async () => {
    fetchFn.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce({ value: 42 });
    const fetcher = new CachedFetcher({ fetch: fetchFn });

    await expect(fetcher.load()).rejects.toThrow('Network error');
    const result = await fetcher.load();

    expect(result).toEqual({ value: 42 });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
