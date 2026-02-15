import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock fetch before importing the hook
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { useTerritoryDescription } from '../../../src/components/territory-info/hooks/use-territory-description';

/**
 * Helper to create mock headers
 */
function createMockHeaders(contentType: string | null) {
  return {
    get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null),
  };
}

describe('useTerritoryDescription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null description when territoryName is null', () => {
    const { result } = renderHook(() => useTerritoryDescription(null, 1650));

    expect(result.current.description).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches description for valid territory and year', async () => {
    const mockDescription = {
      id: 'France_1650',
      name: 'フランス王国',
      year: 1650,
      facts: ['首都: パリ', '君主: ルイ14世'],
      keyEvents: [{ year: 1643, event: 'ルイ14世の即位' }],
      relatedYears: [1700],
      aiGenerated: true,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: createMockHeaders('application/json'),
      json: async () => mockDescription,
    });

    const { result } = renderHook(() => useTerritoryDescription('France', 1650));

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for fetch to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.description).toEqual(mockDescription);
    expect(result.current.error).toBeNull();
  });

  it('handles 404 response (no description available)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: createMockHeaders(null),
    });

    const { result } = renderHook(() => useTerritoryDescription('UnknownTerritory', 1650));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.description).toBeNull();
    // 404 should not be treated as an error - it's expected for territories without descriptions
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

  it('refetches when territory name changes', async () => {
    const mockDescriptionFrance = {
      id: 'France_1650',
      name: 'フランス王国',
      year: 1650,
      facts: ['首都: パリ'],
      keyEvents: [],
      relatedYears: [],
      aiGenerated: true,
    };

    const mockDescriptionEngland = {
      id: 'England_1650',
      name: 'イングランド',
      year: 1650,
      facts: ['首都: ロンドン'],
      keyEvents: [],
      relatedYears: [],
      aiGenerated: true,
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        headers: createMockHeaders('application/json'),
        json: async () => mockDescriptionFrance,
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: createMockHeaders('application/json'),
        json: async () => mockDescriptionEngland,
      });

    const { result, rerender } = renderHook(
      ({ territory, year }) => useTerritoryDescription(territory, year),
      { initialProps: { territory: 'France', year: 1650 } },
    );

    await waitFor(() => {
      expect(result.current.description?.name).toBe('フランス王国');
    });

    // Change territory
    rerender({ territory: 'England', year: 1650 });

    await waitFor(() => {
      expect(result.current.description?.name).toBe('イングランド');
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('refetches when year changes', async () => {
    const mockDescription1650 = {
      id: 'France_1650',
      name: 'フランス王国',
      year: 1650,
      facts: ['首都: パリ'],
      keyEvents: [],
      relatedYears: [],
      aiGenerated: true,
    };

    const mockDescription1700 = {
      id: 'France_1700',
      name: 'フランス王国',
      year: 1700,
      facts: ['首都: パリ'],
      keyEvents: [],
      relatedYears: [],
      aiGenerated: true,
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        headers: createMockHeaders('application/json'),
        json: async () => mockDescription1650,
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: createMockHeaders('application/json'),
        json: async () => mockDescription1700,
      });

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
  });

  it('handles HTML response as no description (Vite SPA fallback)', async () => {
    // Vite dev server returns HTML for 404s as SPA fallback
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: createMockHeaders('text/html'),
    });

    const { result } = renderHook(() => useTerritoryDescription('UnknownTerritory', 1650));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should treat as "no description available", not an error
    expect(result.current.description).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('constructs correct URL for description fetch', async () => {
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
    expect(calledUrl).toBe('/data/descriptions/1650/france.json');
  });

  it('converts territory name to kebab-case for URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: createMockHeaders(null),
    });

    renderHook(() => useTerritoryDescription('England and Ireland', 1650));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string | undefined;
    expect(calledUrl).toBe('/data/descriptions/1650/england-and-ireland.json');
  });
});
