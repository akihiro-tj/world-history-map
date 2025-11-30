import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { AppStateProvider } from '../../../src/contexts/app-state-context';
import { useYearNavigation } from '../../../src/hooks/use-year-navigation';
import type { YearEntry } from '../../../src/types';

const mockYears: YearEntry[] = [
  { year: 1600, filename: 'world_1600.pmtiles', countries: [] },
  { year: 1650, filename: 'world_1650.pmtiles', countries: [] },
  { year: 1700, filename: 'world_1700.pmtiles', countries: [] },
  { year: 1750, filename: 'world_1750.pmtiles', countries: [] },
  { year: 1800, filename: 'world_1800.pmtiles', countries: [] },
];

describe('useYearNavigation', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppStateProvider
      initialState={{
        selectedYear: 1650,
        selectedTerritory: null,
        isInfoPanelOpen: false,
        isDisclaimerOpen: false,
        mapView: { longitude: 0, latitude: 30, zoom: 2 },
        isLoading: false,
        error: null,
      }}
    >
      {children}
    </AppStateProvider>
  );

  it('should return current year from app state', () => {
    const { result } = renderHook(() => useYearNavigation(mockYears), { wrapper });

    expect(result.current.currentYear).toBe(1650);
  });

  it('should return available years sorted chronologically', () => {
    const { result } = renderHook(() => useYearNavigation(mockYears), { wrapper });

    expect(result.current.availableYears).toEqual(mockYears);
    // Verify sorting
    const years = result.current.availableYears.map((y) => y.year);
    for (let i = 1; i < years.length; i++) {
      const currentYear = years[i];
      const previousYear = years[i - 1];
      if (currentYear !== undefined && previousYear !== undefined) {
        expect(currentYear).toBeGreaterThan(previousYear);
      }
    }
  });

  it('should navigate to a specific year', async () => {
    const { result } = renderHook(() => useYearNavigation(mockYears), { wrapper });

    await act(async () => {
      result.current.navigateToYear(1700);
    });

    await waitFor(() => {
      expect(result.current.currentYear).toBe(1700);
    });
  });

  it('should navigate to next year', async () => {
    const { result } = renderHook(() => useYearNavigation(mockYears), { wrapper });

    await act(async () => {
      result.current.navigateToNextYear();
    });

    await waitFor(() => {
      expect(result.current.currentYear).toBe(1700);
    });
  });

  it('should navigate to previous year', async () => {
    const { result } = renderHook(() => useYearNavigation(mockYears), { wrapper });

    await act(async () => {
      result.current.navigateToPreviousYear();
    });

    await waitFor(() => {
      expect(result.current.currentYear).toBe(1600);
    });
  });

  it('should wrap to first year when navigating next from last year', async () => {
    const wrapperAtEnd = ({ children }: { children: ReactNode }) => (
      <AppStateProvider
        initialState={{
          selectedYear: 1800,
          selectedTerritory: null,
          isInfoPanelOpen: false,
          isDisclaimerOpen: false,
          mapView: { longitude: 0, latitude: 30, zoom: 2 },
          isLoading: false,
          error: null,
        }}
      >
        {children}
      </AppStateProvider>
    );

    const { result } = renderHook(() => useYearNavigation(mockYears), { wrapper: wrapperAtEnd });

    await act(async () => {
      result.current.navigateToNextYear();
    });

    await waitFor(() => {
      expect(result.current.currentYear).toBe(1600);
    });
  });

  it('should wrap to last year when navigating previous from first year', async () => {
    const wrapperAtStart = ({ children }: { children: ReactNode }) => (
      <AppStateProvider
        initialState={{
          selectedYear: 1600,
          selectedTerritory: null,
          isInfoPanelOpen: false,
          isDisclaimerOpen: false,
          mapView: { longitude: 0, latitude: 30, zoom: 2 },
          isLoading: false,
          error: null,
        }}
      >
        {children}
      </AppStateProvider>
    );

    const { result } = renderHook(() => useYearNavigation(mockYears), { wrapper: wrapperAtStart });

    await act(async () => {
      result.current.navigateToPreviousYear();
    });

    await waitFor(() => {
      expect(result.current.currentYear).toBe(1800);
    });
  });

  it('should indicate if there are next/previous years available', () => {
    const { result } = renderHook(() => useYearNavigation(mockYears), { wrapper });

    // At 1650 (middle), both should be true
    expect(result.current.hasNextYear).toBe(true);
    expect(result.current.hasPreviousYear).toBe(true);
  });

  it('should return current year index', () => {
    const { result } = renderHook(() => useYearNavigation(mockYears), { wrapper });

    // 1650 is at index 1 in the array
    expect(result.current.currentYearIndex).toBe(1);
  });

  it('should not navigate to unavailable year', async () => {
    const { result } = renderHook(() => useYearNavigation(mockYears), { wrapper });

    await act(async () => {
      result.current.navigateToYear(1999); // Not in available years
    });

    // Should remain at current year
    await waitFor(() => {
      expect(result.current.currentYear).toBe(1650);
    });
  });

  it('should set loading state during navigation', async () => {
    const { result } = renderHook(() => useYearNavigation(mockYears), { wrapper });

    await act(async () => {
      result.current.navigateToYear(1700);
    });

    // Loading should be false after navigation completes
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle empty years array gracefully', () => {
    const { result } = renderHook(() => useYearNavigation([]), { wrapper });

    expect(result.current.availableYears).toEqual([]);
    expect(result.current.hasNextYear).toBe(false);
    expect(result.current.hasPreviousYear).toBe(false);
  });

  it('should get year entry by year number', () => {
    const { result } = renderHook(() => useYearNavigation(mockYears), { wrapper });

    const entry = result.current.getYearEntry(1700);
    expect(entry).toEqual({ year: 1700, filename: 'world_1700.pmtiles', countries: [] });
  });

  it('should return undefined for non-existent year entry', () => {
    const { result } = renderHook(() => useYearNavigation(mockYears), { wrapper });

    const entry = result.current.getYearEntry(1999);
    expect(entry).toBeUndefined();
  });
});
