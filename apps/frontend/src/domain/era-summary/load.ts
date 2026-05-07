import type { HistoricalYear } from '../year/historical-year';
import type { EraSummary } from './types';

export async function loadEraSummary(year: HistoricalYear): Promise<EraSummary | null> {
  const response = await fetch(`/data/era-summaries/${year}.json`);

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch era summary: ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) return null;

  return response.json() as Promise<EraSummary>;
}
