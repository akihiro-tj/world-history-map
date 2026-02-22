import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock fetch before importing the hook
const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  clearDescriptionCache,
  prefetchYearDescriptions,
  useTerritoryDescription,
} from './use-territory-description';

/**
 * Helper to create mock headers
 */
function createMockHeaders(contentType: string | null) {
  return {
    get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null),
  };
}

/** Year bundle containing France and England descriptions */
const mockBundle1650 = {
  france: {
    id: 'France_1650',
    name: 'フランス王国',
    year: 1650,
    facts: ['首都: パリ', '君主: ルイ14世'],
    keyEvents: [{ year: 1643, event: 'ルイ14世の即位' }],
    aiGenerated: true,
  },
  england: {
    id: 'England_1650',
    name: 'イングランド',
    year: 1650,
    facts: ['首都: ロンドン'],
    keyEvents: [],
    aiGenerated: true,
  },
  'england-and-ireland': {
    id: 'England_and_Ireland_1650',
    name: 'イングランドとアイルランド',
    year: 1650,
    facts: ['首都: ロンドン'],
    keyEvents: [],
    aiGenerated: true,
  },
};

const mockBundle1700 = {
  france: {
    id: 'France_1700',
    name: 'フランス王国',
    year: 1700,
    facts: ['首都: パリ'],
    keyEvents: [],
    aiGenerated: true,
  },
};

function mockFetchBundle(bundle: Record<string, unknown>) {
  return mockFetch.mockResolvedValueOnce({
    ok: true,
    headers: createMockHeaders('application/json'),
    json: async () => bundle,
  });
}

describe('useTerritoryDescription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDescriptionCache();
  });

  it('returns null description when territoryName is null', () => {
    const { result } = renderHook(() => useTerritoryDescription(null, 1650));

    expect(result.current.description).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches year bundle and extracts territory description', async () => {
    mockFetchBundle(mockBundle1650);

    const { result } = renderHook(() => useTerritoryDescription('France', 1650));

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for fetch to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.description).toEqual(mockBundle1650.france);
    expect(result.current.error).toBeNull();
  });

  it('fetches year bundle URL in /{year}.json format', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: createMockHeaders(null),
    });

    renderHook(() => useTerritoryDescription('France', 1650));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string | undefined;
    expect(calledUrl).toBe('/data/descriptions/1650.json');
  });

  it('converts territory name to kebab-case for bundle key lookup', async () => {
    mockFetchBundle(mockBundle1650);

    const { result } = renderHook(() => useTerritoryDescription('England and Ireland', 1650));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.description).toEqual(mockBundle1650['england-and-ireland']);
  });

  it('returns null when territory is not found in bundle', async () => {
    mockFetchBundle(mockBundle1650);

    const { result } = renderHook(() => useTerritoryDescription('UnknownTerritory', 1650));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.description).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('handles 404 response (no bundle for year)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: createMockHeaders(null),
    });

    const { result } = renderHook(() => useTerritoryDescription('France', 9999));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.description).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('handles network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useTerritoryDescription('France', 1650));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.description).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it('uses cache for second territory in same year (no additional fetch)', async () => {
    mockFetchBundle(mockBundle1650);

    const { result: result1 } = renderHook(() => useTerritoryDescription('France', 1650));

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    expect(result1.current.description).toEqual(mockBundle1650.france);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second territory in same year should use cache
    const { result: result2 } = renderHook(() => useTerritoryDescription('England', 1650));

    await waitFor(() => {
      expect(result2.current.isLoading).toBe(false);
    });

    expect(result2.current.description).toEqual(mockBundle1650.england);
    // No additional fetch - used cache
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('fetches new bundle when year changes', async () => {
    mockFetchBundle(mockBundle1650);
    mockFetchBundle(mockBundle1700);

    const { result, rerender } = renderHook(
      ({ territory, year }) => useTerritoryDescription(territory, year),
      { initialProps: { territory: 'France', year: 1650 } },
    );

    await waitFor(() => {
      expect(result.current.description?.year).toBe(1650);
    });

    // Change year
    rerender({ territory: 'France', year: 1700 });

    await waitFor(() => {
      expect(result.current.description?.year).toBe(1700);
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('handles HTML response as no description (Vite SPA fallback)', async () => {
    // Vite dev server returns HTML for 404s as SPA fallback
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: createMockHeaders('text/html'),
    });

    const { result } = renderHook(() => useTerritoryDescription('France', 1650));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should treat as "no description available", not an error
    expect(result.current.description).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

describe('prefetchYearDescriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDescriptionCache();
  });

  it('prefetches year bundle so subsequent hook calls use cache', async () => {
    mockFetchBundle(mockBundle1650);

    // Prefetch
    prefetchYearDescriptions(1650);

    // Wait for prefetch to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Now use the hook - should use cache, no additional fetch
    const { result } = renderHook(() => useTerritoryDescription('France', 1650));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.description).toEqual(mockBundle1650.france);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('silently ignores prefetch errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    // Should not throw
    expect(() => prefetchYearDescriptions(1650)).not.toThrow();
  });
});
