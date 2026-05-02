import { CachedFetcher } from '../../lib/cached-fetcher';
import type { HistoricalYear } from '../year/historical-year';
import type { TerritoryDescriptionRepository } from './territory-description-repository';
import type { TerritoryName } from './territory-name';
import type { TerritoryDescription, YearDescriptionBundle } from './types';

export interface DescriptionBundleSource {
  fetch(year: HistoricalYear): Promise<YearDescriptionBundle | null>;
}

export class HttpTerritoryDescriptionRepository implements TerritoryDescriptionRepository {
  private readonly fetchers = new Map<
    HistoricalYear,
    CachedFetcher<YearDescriptionBundle | null>
  >();
  private readonly source: DescriptionBundleSource;

  constructor(source: DescriptionBundleSource) {
    this.source = source;
  }

  async load(name: TerritoryName, year: HistoricalYear): Promise<TerritoryDescription | null> {
    const bundle = await this.fetcherFor(year).load();
    if (!bundle) return null;
    return bundle[name.toLookupKey()] ?? null;
  }

  prefetch(year: HistoricalYear): void {
    this.fetcherFor(year)
      .load()
      .catch(() => {});
  }

  clearCache(): void {
    this.fetchers.clear();
  }

  private fetcherFor(year: HistoricalYear): CachedFetcher<YearDescriptionBundle | null> {
    let fetcher = this.fetchers.get(year);
    if (fetcher) return fetcher;

    fetcher = new CachedFetcher<YearDescriptionBundle | null>({
      fetch: () => this.source.fetch(year),
    });
    this.fetchers.set(year, fetcher);
    return fetcher;
  }
}
