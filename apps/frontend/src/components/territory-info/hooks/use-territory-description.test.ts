import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  clearDescriptionCache,
  prefetchYearDescriptions,
} from '@/domain/territory/description-loader';
import { createHistoricalYear } from '@/domain/year/historical-year';
import { useTerritoryDescription } from './use-territory-description';

function createMockHeaders(contentType: string | null) {
  return {
    get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null),
  };
}

const mockBundle1650 = {
  france: {
    name: 'フランス王国',
    era: 'フロンドの乱後',
    profile: {
      capital: 'パリ',
      regime: '絶対王政',
      leader: 'ルイ14世',
    },
    context:
      '1650年のフランスはフロンドの乱の直後であり、幼少のルイ14世のもとマザラン枢機卿が実権を握っていた。',
    keyEvents: [{ year: 1643, event: 'ルイ14世の即位' }],
  },
  england: {
    name: 'イングランド',
    profile: {
      capital: 'ロンドン',
    },
  },
  'england-and-ireland': {
    name: 'イングランドとアイルランド',
    profile: {
      capital: 'ロンドン',
    },
  },
};

const mockBundle1700 = {
  france: {
    name: 'フランス王国',
    era: '絶対王政期',
    profile: {
      capital: 'パリ',
    },
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
    const { result } = renderHook(() => useTerritoryDescription(null, createHistoricalYear(1650)));

    expect(result.current.description).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches year bundle and extracts territory description', async () => {
    mockFetchBundle(mockBundle1650);

    const { result } = renderHook(() =>
      useTerritoryDescription('France', createHistoricalYear(1650)),
    );

    expect(result.current.isLoading).toBe(true);

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

    renderHook(() => useTerritoryDescription('France', createHistoricalYear(1650)));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string | undefined;
    expect(calledUrl).toBe('/data/descriptions/1650.json');
  });

  it('converts territory name to kebab-case for bundle key lookup', async () => {
    mockFetchBundle(mockBundle1650);

    const { result } = renderHook(() =>
      useTerritoryDescription('England and Ireland', createHistoricalYear(1650)),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.description).toEqual(mockBundle1650['england-and-ireland']);
  });

  it('returns null when territory is not found in bundle', async () => {
    mockFetchBundle(mockBundle1650);

    const { result } = renderHook(() =>
      useTerritoryDescription('UnknownTerritory', createHistoricalYear(1650)),
    );

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

    const { result } = renderHook(() =>
      useTerritoryDescription('France', createHistoricalYear(9999)),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.description).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('handles network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() =>
      useTerritoryDescription('France', createHistoricalYear(1650)),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.description).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it('uses cache for second territory in same year (no additional fetch)', async () => {
    mockFetchBundle(mockBundle1650);

    const { result: result1 } = renderHook(() =>
      useTerritoryDescription('France', createHistoricalYear(1650)),
    );

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    expect(result1.current.description).toEqual(mockBundle1650.france);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const { result: result2 } = renderHook(() =>
      useTerritoryDescription('England', createHistoricalYear(1650)),
    );

    await waitFor(() => {
      expect(result2.current.isLoading).toBe(false);
    });

    expect(result2.current.description).toEqual(mockBundle1650.england);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('fetches new bundle when year changes', async () => {
    mockFetchBundle(mockBundle1650);
    mockFetchBundle(mockBundle1700);

    const { result, rerender } = renderHook(
      ({ territory, year }: { territory: string; year: number }) =>
        useTerritoryDescription(territory, createHistoricalYear(year)),
      { initialProps: { territory: 'France', year: 1650 } },
    );

    await waitFor(() => {
      expect(result.current.description?.name).toBe('フランス王国');
    });

    rerender({ territory: 'France', year: 1700 });

    await waitFor(() => {
      expect(result.current.description?.era).toBe('絶対王政期');
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('handles HTML response as no description (Vite SPA fallback)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: createMockHeaders('text/html'),
    });

    const { result } = renderHook(() =>
      useTerritoryDescription('France', createHistoricalYear(1650)),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

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

    prefetchYearDescriptions(createHistoricalYear(1650));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    const { result } = renderHook(() =>
      useTerritoryDescription('France', createHistoricalYear(1650)),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.description).toEqual(mockBundle1650.france);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('silently ignores prefetch errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    expect(() => prefetchYearDescriptions(createHistoricalYear(1650))).not.toThrow();
  });
});
