import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { createHistoricalYear } from '../year/historical-year';
import { loadEraSummary } from './load';

function createMockHeaders(contentType: string | null) {
  return {
    get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null),
  };
}

const mockEraSummary1650 = {
  year: 1650,
  regions: [
    {
      region: 'europe',
      title: 'ヨーロッパ',
      context: 'ウェストファリア条約後の主権国家体制。',
      references: [{ kind: 'territory', target: 'france', text: 'フランス' }],
    },
  ],
};

describe('loadEraSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns EraSummary on successful fetch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders('application/json'),
      json: async () => mockEraSummary1650,
    });

    const result = await loadEraSummary(createHistoricalYear(1650));

    expect(result).toEqual(mockEraSummary1650);
    expect(mockFetch).toHaveBeenCalledWith('/data/era-summaries/1650.json');
  });

  it('returns null on 404', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: createMockHeaders(null),
    });

    const result = await loadEraSummary(createHistoricalYear(9999));

    expect(result).toBeNull();
  });

  it('returns null when content-type is not application/json', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders('text/html'),
    });

    const result = await loadEraSummary(createHistoricalYear(1650));

    expect(result).toBeNull();
  });

  it('throws on malformed JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: createMockHeaders('application/json'),
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    });

    await expect(loadEraSummary(createHistoricalYear(1650))).rejects.toThrow();
  });
});
