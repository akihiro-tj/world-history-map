import {
  asHashedFilename,
  asHistoricalYearString,
  type HashedFilename,
  type HistoricalYearString,
} from '../types.ts';

const SOURCE_FILENAME_PATTERN = /^world_(-?\d+)\.pmtiles$/;
const HASHED_FILENAME_PATTERN = /^world_(-?\d+)\.([0-9a-f]{12})\.pmtiles$/;
const HASH_TRUNCATE_LENGTH = 12;
const SOURCE_EXTENSION = '.pmtiles';

export class HashedTileFilename {
  private constructor(
    readonly year: HistoricalYearString,
    readonly hash: string,
  ) {}

  static get sourceExtension(): string {
    return SOURCE_EXTENSION;
  }

  static build(year: HistoricalYearString, fullHash: string): HashedTileFilename {
    return new HashedTileFilename(year, fullHash.slice(0, HASH_TRUNCATE_LENGTH));
  }

  static parseHashed(filename: string): HashedTileFilename | null {
    const [, yearStr, hashStr] = HASHED_FILENAME_PATTERN.exec(filename) ?? [];
    if (!yearStr || !hashStr) return null;
    return new HashedTileFilename(asHistoricalYearString(yearStr), hashStr);
  }

  static extractYearFromSource(filename: string): HistoricalYearString | null {
    const [, yearStr] = SOURCE_FILENAME_PATTERN.exec(filename) ?? [];
    if (!yearStr) return null;
    return asHistoricalYearString(yearStr);
  }

  toString(): HashedFilename {
    return asHashedFilename(`world_${this.year}.${this.hash}.pmtiles`);
  }
}
