import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/domain/year/loader', () => ({
  loadYearIndex: vi.fn(),
}));
vi.mock('../tiles-config', () => ({
  getTilesUrl: vi.fn(),
}));
vi.mock('../color-scheme', () => ({
  loadColorScheme: vi.fn(),
}));

import { createHistoricalYear } from '@/domain/year/historical-year';
import { loadYearIndex } from '@/domain/year/loader';
import { loadColorScheme } from '../color-scheme';
import { getTilesUrl } from '../tiles-config';
import { useMapData } from './use-map-data';

const mockLoadYearIndex = vi.mocked(loadYearIndex);
const mockGetTilesUrl = vi.mocked(getTilesUrl);
const mockLoadColorScheme = vi.mocked(loadColorScheme);

const mockYearIndex = {
  years: [
    { year: createHistoricalYear(1650), filename: 'world_1650.pmtiles', countries: ['France'] },
  ],
};

describe('useMapData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadColorScheme.mockResolvedValue({});
  });

  it('starts in loading state', () => {
    mockLoadYearIndex.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useMapData(createHistoricalYear(1650)));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.pmtilesUrl).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('loads data and returns PMTiles URL', async () => {
    mockLoadYearIndex.mockResolvedValue(mockYearIndex);
    mockGetTilesUrl.mockReturnValue('pmtiles:///pmtiles/world_1650.pmtiles');

    const { result } = renderHook(() => useMapData(createHistoricalYear(1650)));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pmtilesUrl).toBe('pmtiles:///pmtiles/world_1650.pmtiles');
    expect(result.current.yearIndex).toEqual(mockYearIndex);
    expect(result.current.error).toBeNull();
  });

  it('sets error when year is not found', async () => {
    mockLoadYearIndex.mockResolvedValue(mockYearIndex);
    mockGetTilesUrl.mockReturnValue(null);

    const { result } = renderHook(() => useMapData(createHistoricalYear(9999)));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pmtilesUrl).toBeNull();
    expect(result.current.error).toBe('Year 9999 not found');
  });

  it('handles load failure with Error instance', async () => {
    mockLoadYearIndex.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMapData(createHistoricalYear(1650)));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
  });

  it('handles load failure with non-Error value', async () => {
    mockLoadYearIndex.mockRejectedValue('unknown failure');

    const { result } = renderHook(() => useMapData(createHistoricalYear(1650)));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load data');
  });

  it('calls getTilesUrl with the initial year', async () => {
    mockLoadYearIndex.mockResolvedValue(mockYearIndex);
    mockGetTilesUrl.mockReturnValue('pmtiles:///pmtiles/world_1650.pmtiles');

    const { result } = renderHook(() => useMapData(createHistoricalYear(1650)));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetTilesUrl).toHaveBeenCalledWith(createHistoricalYear(1650));
  });
});
