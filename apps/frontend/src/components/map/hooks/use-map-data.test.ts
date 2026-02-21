import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../utils/year-index', () => ({
  loadYearIndex: vi.fn(),
}));
vi.mock('../../../utils/tiles-config', () => ({
  loadTilesManifest: vi.fn(),
  getTilesUrl: vi.fn(),
}));
vi.mock('../../../utils/color-scheme', () => ({
  loadColorScheme: vi.fn(),
}));

import { loadColorScheme } from '../../../utils/color-scheme';
import { getTilesUrl, loadTilesManifest } from '../../../utils/tiles-config';
import { loadYearIndex } from '../../../utils/year-index';
import { useMapData } from './use-map-data';

const mockLoadYearIndex = vi.mocked(loadYearIndex);
const mockLoadTilesManifest = vi.mocked(loadTilesManifest);
const mockGetTilesUrl = vi.mocked(getTilesUrl);
const mockLoadColorScheme = vi.mocked(loadColorScheme);

const mockYearIndex = {
  years: [{ year: 1650, filename: 'world_1650.pmtiles', countries: ['France'] }],
};

const mockManifest = {
  version: 'development',
  files: {},
};

describe('useMapData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadColorScheme.mockResolvedValue({});
  });

  it('starts in loading state', () => {
    mockLoadYearIndex.mockReturnValue(new Promise(() => {}));
    mockLoadTilesManifest.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useMapData(1650));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.pmtilesUrl).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('loads data and returns PMTiles URL', async () => {
    mockLoadYearIndex.mockResolvedValue(mockYearIndex);
    mockLoadTilesManifest.mockResolvedValue(mockManifest);
    mockGetTilesUrl.mockReturnValue('pmtiles:///pmtiles/world_1650.pmtiles');

    const { result } = renderHook(() => useMapData(1650));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pmtilesUrl).toBe('pmtiles:///pmtiles/world_1650.pmtiles');
    expect(result.current.yearIndex).toEqual(mockYearIndex);
    expect(result.current.tilesManifest).toEqual(mockManifest);
    expect(result.current.error).toBeNull();
  });

  it('sets error when year is not found', async () => {
    mockLoadYearIndex.mockResolvedValue(mockYearIndex);
    mockLoadTilesManifest.mockResolvedValue(mockManifest);
    mockGetTilesUrl.mockReturnValue(null);

    const { result } = renderHook(() => useMapData(9999));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pmtilesUrl).toBeNull();
    expect(result.current.error).toBe('Year 9999 not found');
  });

  it('handles load failure with Error instance', async () => {
    mockLoadYearIndex.mockRejectedValue(new Error('Network error'));
    mockLoadTilesManifest.mockResolvedValue(mockManifest);

    const { result } = renderHook(() => useMapData(1650));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
  });

  it('handles load failure with non-Error value', async () => {
    mockLoadYearIndex.mockRejectedValue('unknown failure');
    mockLoadTilesManifest.mockResolvedValue(mockManifest);

    const { result } = renderHook(() => useMapData(1650));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load data');
  });

  it('uses default initialYear of 1650', async () => {
    mockLoadYearIndex.mockResolvedValue(mockYearIndex);
    mockLoadTilesManifest.mockResolvedValue(mockManifest);
    mockGetTilesUrl.mockReturnValue('pmtiles:///pmtiles/world_1650.pmtiles');

    const { result } = renderHook(() => useMapData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetTilesUrl).toHaveBeenCalledWith(1650, mockManifest);
  });
});
