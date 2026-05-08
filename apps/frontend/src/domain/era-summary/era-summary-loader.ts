import type { HistoricalYear } from '../year/historical-year';
import { type EraSummarySource, HttpEraSummaryRepository } from './http-era-summary-repository';
import type { EraSummary } from './types';

class HttpEraSummarySource implements EraSummarySource {
  async fetch(year: HistoricalYear): Promise<EraSummary | null> {
    const response = await fetch(`/data/era-summaries/${year}.json`);

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch era summary: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) return null;

    return response.json() as Promise<EraSummary>;
  }
}

const repository = new HttpEraSummaryRepository(new HttpEraSummarySource());

export async function loadEraSummary(year: HistoricalYear): Promise<EraSummary | null> {
  return repository.load(year);
}

export function clearEraSummaryCache(): void {
  repository.clearCache();
}
