import { describe, expect, it } from 'vitest';
import { TilesManifest } from '../../src/manifest/tiles-manifest.ts';
import { asHistoricalYearString } from '../../src/types.ts';

const FIXTURE = {
  '1600': 'world_1600.aabbccddeeff.pmtiles',
  '-1': 'world_-1.112233445566.pmtiles',
  '2000': 'world_2000.deadbeef1234.pmtiles',
};

describe('TilesManifest.fromRecord', () => {
  it('builds from plain string record', () => {
    const manifest = TilesManifest.fromRecord(FIXTURE);
    expect(manifest.filenameFor(asHistoricalYearString('1600'))).toBe(FIXTURE['1600']);
  });

  it('returns null for unknown year', () => {
    const manifest = TilesManifest.fromRecord(FIXTURE);
    expect(manifest.filenameFor(asHistoricalYearString('9999'))).toBeNull();
  });
});

describe('TilesManifest.has', () => {
  it('returns true for existing year', () => {
    const manifest = TilesManifest.fromRecord(FIXTURE);
    expect(manifest.has(asHistoricalYearString('1600'))).toBe(true);
  });

  it('returns false for missing year', () => {
    const manifest = TilesManifest.fromRecord(FIXTURE);
    expect(manifest.has(asHistoricalYearString('9999'))).toBe(false);
  });
});

describe('TilesManifest.availableYears', () => {
  it('returns years in numeric ascending order', () => {
    const manifest = TilesManifest.fromRecord(FIXTURE);
    expect(manifest.availableYears()).toEqual(['-1', '1600', '2000']);
  });

  it('returns empty array for empty manifest', () => {
    expect(TilesManifest.empty().availableYears()).toEqual([]);
  });
});

describe('TilesManifest.equals', () => {
  it('is true for same entries', () => {
    const a = TilesManifest.fromRecord(FIXTURE);
    const b = TilesManifest.fromRecord(FIXTURE);
    expect(a.equals(b)).toBe(true);
  });

  it('is false when keys differ', () => {
    const a = TilesManifest.fromRecord(FIXTURE);
    const b = TilesManifest.fromRecord({ '9999': 'world_9999.000000000000.pmtiles' });
    expect(a.equals(b)).toBe(false);
  });

  it('is false when values differ', () => {
    const a = TilesManifest.fromRecord(FIXTURE);
    const b = TilesManifest.fromRecord({ ...FIXTURE, '1600': 'world_1600.000000000000.pmtiles' });
    expect(a.equals(b)).toBe(false);
  });
});

describe('TilesManifest.toTypeScriptSource', () => {
  it('generates valid TypeScript with as const', () => {
    const manifest = TilesManifest.fromRecord({ '1600': 'world_1600.aabbccddeeff.pmtiles' });
    const source = manifest.toTypeScriptSource();
    expect(source).toBe(
      "export const manifest = {\n  '1600': 'world_1600.aabbccddeeff.pmtiles',\n} as const;\n",
    );
  });

  it('sorts entries numerically', () => {
    const manifest = TilesManifest.fromRecord(FIXTURE);
    const source = manifest.toTypeScriptSource();
    const lines = source.split('\n').filter((l) => l.includes('world_'));
    expect(lines[0]).toContain('-1');
    expect(lines[1]).toContain('1600');
    expect(lines[2]).toContain('2000');
  });

  it('escapes single quotes and backslashes in values', () => {
    const manifest = TilesManifest.fromRecord({ '1': "it's.pmtiles" });
    const source = manifest.toTypeScriptSource();
    expect(source).toContain("'it\\'s.pmtiles'");
  });

  it('escapes backslashes in values', () => {
    const manifest = TilesManifest.fromRecord({ '1': 'back\\slash.pmtiles' });
    const source = manifest.toTypeScriptSource();
    expect(source).toContain("'back\\\\slash.pmtiles'");
  });
});
