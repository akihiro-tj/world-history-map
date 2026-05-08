import type { HistoricalYear } from '../year/historical-year';
import type { EraSummary } from './types';

export interface EraSummaryRepository {
  load(year: HistoricalYear): Promise<EraSummary | null>;
}
