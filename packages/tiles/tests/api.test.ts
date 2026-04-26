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

describe('TilesManifest', () => {
  it('fromRecord creates a manifest with the expected years', async () => {
    const { TilesManifest } = await import('../src/index.ts');
    const tilesManifest = TilesManifest.fromRecord({
      '1600': 'world_1600.abc123def456.pmtiles',
      '1700': 'world_1700.112233445566.pmtiles',
    });
    expect(tilesManifest.availableYears()).toContain('1600');
    expect(tilesManifest.availableYears()).toContain('1700');
  });

  it('empty creates a manifest with no years', async () => {
    const { TilesManifest } = await import('../src/index.ts');
    const tilesManifest = TilesManifest.empty();
    expect(tilesManifest.availableYears()).toHaveLength(0);
  });

  it('filenameFor returns the hashed filename for a known year', async () => {
    const { TilesManifest, asHistoricalYearString } = await import('../src/index.ts');
    const tilesManifest = TilesManifest.fromRecord({
      '1600': 'world_1600.abc123def456.pmtiles',
    });
    expect(tilesManifest.filenameFor(asHistoricalYearString('1600'))).toBe(
      'world_1600.abc123def456.pmtiles',
    );
  });

  it('filenameFor returns null for an unknown year', async () => {
    const { TilesManifest, asHistoricalYearString } = await import('../src/index.ts');
    const tilesManifest = TilesManifest.fromRecord({ '1600': 'world_1600.abc123def456.pmtiles' });
    expect(tilesManifest.filenameFor(asHistoricalYearString('9999'))).toBeNull();
  });
});

describe('HashedTileFilename', () => {
  it('parseHashed parses a valid hashed filename', async () => {
    const { HashedTileFilename } = await import('../src/index.ts');
    const parsed = HashedTileFilename.parseHashed('world_1600.abc123def456.pmtiles');
    expect(parsed).not.toBeNull();
    expect(parsed?.year).toBe('1600');
    expect(parsed?.hash).toBe('abc123def456');
  });

  it('parseHashed returns null for an invalid filename', async () => {
    const { HashedTileFilename } = await import('../src/index.ts');
    expect(HashedTileFilename.parseHashed('world_1600.pmtiles')).toBeNull();
  });

  it('toString returns the hashed filename with a 12-character hash', async () => {
    const { HashedTileFilename, asHistoricalYearString } = await import('../src/index.ts');
    const filename = HashedTileFilename.build(asHistoricalYearString('1600'), 'abc123def456xxxx');
    expect(filename.toString()).toBe('world_1600.abc123def456.pmtiles');
  });
});

describe('asHashedFilename', () => {
  it('returns a branded HashedFilename from a plain string', async () => {
    const { asHashedFilename } = await import('../src/index.ts');
    const result = asHashedFilename('world_1600.abc123def456.pmtiles');
    expect(result).toBe('world_1600.abc123def456.pmtiles');
  });
});

describe('asHistoricalYearString', () => {
  it('returns a branded HistoricalYearString from a plain string', async () => {
    const { asHistoricalYearString } = await import('../src/index.ts');
    const result = asHistoricalYearString('1600');
    expect(result).toBe('1600');
  });

  it('handles negative year strings (BC years)', async () => {
    const { asHistoricalYearString } = await import('../src/index.ts');
    const result = asHistoricalYearString('-500');
    expect(result).toBe('-500');
  });
});
