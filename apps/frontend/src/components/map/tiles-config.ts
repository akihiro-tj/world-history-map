import { getTilesUrl as getTilesUrlFromPackage } from '@world-history-map/tiles';
import type { HistoricalYear } from '../../domain/year/historical-year';

function getTilesBaseUrl(): string {
  return (import.meta.env.VITE_TILES_BASE_URL || '').replace(/\/+$/, '');
}

export function getTilesUrl(year: HistoricalYear): string | null {
  return getTilesUrlFromPackage(String(year), getTilesBaseUrl());
}
