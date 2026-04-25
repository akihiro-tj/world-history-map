import {
  asHashedFilename,
  asHistoricalYearString,
  type HashedFilename,
  type HistoricalYearString,
  type Manifest,
} from '../types.ts';

function toSingleQuotedLiteral(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

export class TilesManifest {
  private readonly entries: ReadonlyMap<HistoricalYearString, HashedFilename>;

  private constructor(entries: ReadonlyMap<HistoricalYearString, HashedFilename>) {
    this.entries = entries;
  }

  static fromRecord(record: Readonly<Record<string, string>>): TilesManifest {
    const map = new Map<HistoricalYearString, HashedFilename>();
    for (const [year, filename] of Object.entries(record)) {
      map.set(asHistoricalYearString(year), asHashedFilename(filename));
    }
    return new TilesManifest(map);
  }

  static empty(): TilesManifest {
    return new TilesManifest(new Map());
  }

  has(year: HistoricalYearString): boolean {
    return this.entries.has(year);
  }

  filenameFor(year: HistoricalYearString): HashedFilename | null {
    return this.entries.get(year) ?? null;
  }

  availableYears(): readonly HistoricalYearString[] {
    return [...this.entries.keys()].sort((a, b) => Number(a) - Number(b));
  }

  equals(other: TilesManifest): boolean {
    if (this.entries.size !== other.entries.size) return false;
    for (const [year, filename] of this.entries) {
      if (other.entries.get(year) !== filename) return false;
    }
    return true;
  }

  toRecord(): Manifest {
    return Object.fromEntries(this.entries) as unknown as Manifest;
  }

  toTypeScriptSource(): string {
    const sorted = [...this.entries.entries()].sort(([a], [b]) => Number(a) - Number(b));
    const body = sorted
      .map(
        ([year, filename]) =>
          `  ${toSingleQuotedLiteral(year)}: ${toSingleQuotedLiteral(filename)},`,
      )
      .join('\n');
    return `export const manifest = {\n${body}\n} as const;\n`;
  }
}
