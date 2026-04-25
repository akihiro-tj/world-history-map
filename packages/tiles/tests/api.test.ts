import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/manifest.ts', () => ({
  manifest: {
    '1600': 'world_1600.abc123def456.pmtiles',
    '-1': 'world_-1.fedcba987654.pmtiles',
    '2000': 'world_2000.112233445566.pmtiles',
  } as const,
}));

describe('getTilesUrl', () => {
  it('returns pmtiles URL with base URL for a known year', async () => {
    const { getTilesUrl } = await import('../src/index.ts');
    const url = getTilesUrl('1600', 'https://tiles.example.com');
    expect(url).toBe('pmtiles://https://tiles.example.com/world_1600.abc123def456.pmtiles');
  });

  it('returns null for an unknown year', async () => {
    const { getTilesUrl } = await import('../src/index.ts');
    expect(getTilesUrl('9999', 'https://tiles.example.com')).toBeNull();
  });

  it('normalizes trailing slashes in the base URL', async () => {
    const { getTilesUrl } = await import('../src/index.ts');
    const url = getTilesUrl('1600', 'https://tiles.example.com///');
    expect(url).toBe('pmtiles://https://tiles.example.com/world_1600.abc123def456.pmtiles');
  });

  it('returns a /pmtiles/ relative URL when base URL is empty (dev mode)', async () => {
    const { getTilesUrl } = await import('../src/index.ts');
    const url = getTilesUrl('1600', '');
    expect(url).toBe('pmtiles:///pmtiles/world_1600.abc123def456.pmtiles');
  });

  it('handles negative year keys (BC years)', async () => {
    const { getTilesUrl } = await import('../src/index.ts');
    const url = getTilesUrl('-1', 'https://tiles.example.com');
    expect(url).toBe('pmtiles://https://tiles.example.com/world_-1.fedcba987654.pmtiles');
  });
});

describe('availableYears', () => {
  it('is an array of year strings from the manifest', async () => {
    const { availableYears } = await import('../src/index.ts');
    expect(availableYears).toContain('1600');
    expect(availableYears).toContain('-1');
    expect(availableYears).toContain('2000');
  });

  it('is sorted numerically ascending', async () => {
    const { availableYears } = await import('../src/index.ts');
    const expected = [...availableYears].sort((a, b) => Number(a) - Number(b));
    expect([...availableYears]).toEqual(expected);
  });
});

describe('manifest', () => {
  it('is a Record mapping year strings to hashed filenames', async () => {
    const { manifest } = await import('../src/index.ts');
    expect(manifest['1600']).toBe('world_1600.abc123def456.pmtiles');
    expect(manifest['-1']).toBe('world_-1.fedcba987654.pmtiles');
  });
});
