import { CachedFetcher } from '../../lib/cached-fetcher';
import type { HistoricalYear } from '../year/historical-year';
import type { EraSummaryRepository } from './era-summary-repository';
import type { EraSummary } from './types';

export interface EraSummarySource {
  fetch(year: HistoricalYear): Promise<EraSummary | null>;
}

export class HttpEraSummaryRepository implements EraSummaryRepository {
  private readonly fetchers = new Map<HistoricalYear, CachedFetcher<EraSummary | null>>();
  private readonly source: EraSummarySource;

  constructor(source: EraSummarySource) {
    this.source = source;
  }

  async load(year: HistoricalYear): Promise<EraSummary | null> {
    return this.fetcherFor(year).load();
  }

  clearCache(): void {
    this.fetchers.clear();
  }

  private fetcherFor(year: HistoricalYear): CachedFetcher<EraSummary | null> {
    let fetcher = this.fetchers.get(year);
    if (fetcher) return fetcher;

    fetcher = new CachedFetcher<EraSummary | null>({
      fetch: () => this.source.fetch(year),
    });
    this.fetchers.set(year, fetcher);
    return fetcher;
  }
}
