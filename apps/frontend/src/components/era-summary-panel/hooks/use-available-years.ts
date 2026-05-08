import { useMemo } from 'react';
import type { HistoricalYear } from '@/domain/year/historical-year';
import { useYearIndex } from '@/hooks/use-year-index';

export function useAvailableYears(): ReadonlySet<HistoricalYear> {
  const { years } = useYearIndex();
  return useMemo(() => new Set(years.map((yearEntry) => yearEntry.year)), [years]);
}
