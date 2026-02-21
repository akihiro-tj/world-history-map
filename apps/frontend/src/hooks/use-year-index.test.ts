import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { YearIndex } from '../types/year';

vi.mock('../utils/year-index', () => ({
  loadYearIndex: vi.fn(),
}));

import { loadYearIndex } from '../utils/year-index';
import { useYearIndex } from './use-year-index';

const mockLoadYearIndex = vi.mocked(loadYearIndex);

const mockYearIndex: YearIndex = {
  years: [
    { year: 1650, filename: 'world_1650.pmtiles', countries: ['France', 'England'] },
    { year: 1700, filename: 'world_1700.pmtiles', countries: ['France'] },
  ],
};

describe('useYearIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state with empty years', () => {
    mockLoadYearIndex.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useYearIndex());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.years).toEqual([]);
  });

  it('loads year index and returns years', async () => {
    mockLoadYearIndex.mockResolvedValue(mockYearIndex);

    const { result } = renderHook(() => useYearIndex());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.years).toEqual(mockYearIndex.years);
  });

  it('handles load error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockLoadYearIndex.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useYearIndex());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.years).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load year index:', expect.any(Error));

    consoleSpy.mockRestore();
  });
});
