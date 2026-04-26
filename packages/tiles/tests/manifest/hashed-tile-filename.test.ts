import { describe, expect, it } from 'vitest';
import { HashedTileFilename } from '../../src/manifest/hashed-tile-filename.ts';
import { asHistoricalYearString } from '../../src/types.ts';

const FULL_SHA256 = 'a'.repeat(64);

describe('HashedTileFilename.build', () => {
  it('truncates hash to 12 chars', () => {
    const hashed = HashedTileFilename.build(asHistoricalYearString('1600'), FULL_SHA256);
    expect(hashed.toString()).toBe('world_1600.aaaaaaaaaaaa.pmtiles');
  });

  it('preserves year in filename', () => {
    const hashed = HashedTileFilename.build(asHistoricalYearString('-1'), FULL_SHA256);
    expect(hashed.toString()).toBe('world_-1.aaaaaaaaaaaa.pmtiles');
  });

  it('exposes year and hash', () => {
    const fullHash = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    const hashed = HashedTileFilename.build(asHistoricalYearString('1600'), fullHash);
    expect(hashed.year).toBe('1600');
    expect(hashed.hash).toBe('fedcba987654');
  });
});

describe('HashedTileFilename.parseHashed', () => {
  it('parses valid hashed filename', () => {
    const result = HashedTileFilename.parseHashed('world_-1.fedcba987654.pmtiles');
    expect(result).not.toBeNull();
    expect(result?.year).toBe('-1');
    expect(result?.hash).toBe('fedcba987654');
  });

  it('returns null for unhashed source filename', () => {
    expect(HashedTileFilename.parseHashed('world_1600.pmtiles')).toBeNull();
  });

  it('returns null for non-pmtiles filename', () => {
    expect(HashedTileFilename.parseHashed('invalid')).toBeNull();
    expect(HashedTileFilename.parseHashed('readme.txt')).toBeNull();
  });
});

describe('HashedTileFilename.extractYearFromSource', () => {
  it('extracts year from source filename', () => {
    expect(HashedTileFilename.extractYearFromSource('world_1600.pmtiles')).toBe('1600');
  });

  it('extracts negative year', () => {
    expect(HashedTileFilename.extractYearFromSource('world_-123000.pmtiles')).toBe('-123000');
  });

  it('returns null for non-matching filenames', () => {
    expect(HashedTileFilename.extractYearFromSource('readme.txt')).toBeNull();
    expect(HashedTileFilename.extractYearFromSource('world_1600.hash.pmtiles')).toBeNull();
  });
});

describe('HashedTileFilename.parseAll', () => {
  it('returns parsed instances for valid keys', () => {
    const result = HashedTileFilename.parseAll([
      'world_1600.fedcba987654.pmtiles',
      'world_-1.aaaaaaaaaaaa.pmtiles',
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]?.year).toBe('1600');
    expect(result[1]?.year).toBe('-1');
  });

  it('excludes keys that do not match the hashed pattern', () => {
    const result = HashedTileFilename.parseAll([
      'world_1600.pmtiles',
      'readme.txt',
      'world_1600.fedcba987654.pmtiles',
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.year).toBe('1600');
  });

  it('returns empty array for empty input', () => {
    expect(HashedTileFilename.parseAll([])).toEqual([]);
  });

  it('returns empty array when no keys match', () => {
    expect(HashedTileFilename.parseAll(['readme.txt', 'world_1600.pmtiles'])).toEqual([]);
  });
});

describe('HashedTileFilename.sourceExtension', () => {
  it('is .pmtiles', () => {
    expect(HashedTileFilename.sourceExtension).toBe('.pmtiles');
  });
});
