import { formatHistoricalYear, type HistoricalYear } from '../types/historical-year';

export function formatYear(year: HistoricalYear): string {
  return formatHistoricalYear(year);
}
