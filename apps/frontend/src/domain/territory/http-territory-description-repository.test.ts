import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHistoricalYear } from '../year/historical-year';
import type { DescriptionBundleSource } from './http-territory-description-repository';
import { HttpTerritoryDescriptionRepository } from './http-territory-description-repository';
import { TerritoryName } from './territory-name';
import type { YearDescriptionBundle } from './types';

const bundle1650: YearDescriptionBundle = {
  france: { name: 'フランス王国' },
  england: { name: 'イングランド' },
  'england-and-ireland': { name: 'イングランドとアイルランド' },
};

const bundle1700: YearDescriptionBundle = {
  france: { name: 'フランス王国（絶対王政期）' },
};

function createMockSource(bundles: Record<number, YearDescriptionBundle | null>) {
  return {
    fetch: vi.fn(async (year: number) => bundles[year] ?? null),
  } satisfies DescriptionBundleSource;
}

describe('HttpTerritoryDescriptionRepository', () => {
  let source: ReturnType<typeof createMockSource>;
  let repository: HttpTerritoryDescriptionRepository;

  beforeEach(() => {
    source = createMockSource({ 1650: bundle1650, 1700: bundle1700 });
    repository = new HttpTerritoryDescriptionRepository(source);
  });

  describe('load', () => {
    it('returns the description for a matching territory', async () => {
      const result = await repository.load(new TerritoryName('France'), createHistoricalYear(1650));
      expect(result).toEqual(bundle1650['france']);
    });

    it('converts territory name to kebab-case for bundle lookup', async () => {
      const result = await repository.load(
        new TerritoryName('England and Ireland'),
        createHistoricalYear(1650),
      );
      expect(result).toEqual(bundle1650['england-and-ireland']);
    });

    it('returns null when territory is not in the bundle', async () => {
      const result = await repository.load(
        new TerritoryName('UnknownTerritory'),
        createHistoricalYear(1650),
      );
      expect(result).toBeNull();
    });

    it('returns null when bundle is null (year not found)', async () => {
      const result = await repository.load(new TerritoryName('France'), createHistoricalYear(9999));
      expect(result).toBeNull();
    });

    it('fetches the bundle only once per year across multiple loads', async () => {
      await repository.load(new TerritoryName('France'), createHistoricalYear(1650));
      await repository.load(new TerritoryName('England'), createHistoricalYear(1650));
      expect(source.fetch).toHaveBeenCalledTimes(1);
    });

    it('fetches separately for different years', async () => {
      await repository.load(new TerritoryName('France'), createHistoricalYear(1650));
      await repository.load(new TerritoryName('France'), createHistoricalYear(1700));
      expect(source.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('prefetch', () => {
    it('triggers a fetch so subsequent load uses cache', async () => {
      repository.prefetch(createHistoricalYear(1650));
      await vi.waitFor(() => expect(source.fetch).toHaveBeenCalledTimes(1));

      await repository.load(new TerritoryName('France'), createHistoricalYear(1650));
      expect(source.fetch).toHaveBeenCalledTimes(1);
    });

    it('does not throw on source error', () => {
      source.fetch.mockRejectedValueOnce(new Error('Network error'));
      expect(() => repository.prefetch(createHistoricalYear(1650))).not.toThrow();
    });
  });

  describe('clearCache', () => {
    it('causes next load to re-fetch from source', async () => {
      await repository.load(new TerritoryName('France'), createHistoricalYear(1650));
      expect(source.fetch).toHaveBeenCalledTimes(1);

      repository.clearCache();

      await repository.load(new TerritoryName('France'), createHistoricalYear(1650));
      expect(source.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
