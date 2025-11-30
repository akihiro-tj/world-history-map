import { useCallback, useMemo } from 'react';
import { useAppState } from '../contexts/app-state-context';
import type { YearEntry } from '../types';

/**
 * Return type for useYearNavigation hook
 */
export interface UseYearNavigationReturn {
  /** Currently selected year */
  currentYear: number;
  /** Index of current year in the available years array */
  currentYearIndex: number;
  /** All available years sorted chronologically */
  availableYears: YearEntry[];
  /** Whether there is a next year available */
  hasNextYear: boolean;
  /** Whether there is a previous year available */
  hasPreviousYear: boolean;
  /** Loading state during year transitions */
  isLoading: boolean;
  /** Navigate to a specific year */
  navigateToYear: (year: number) => void;
  /** Navigate to the next year in chronological order */
  navigateToNextYear: () => void;
  /** Navigate to the previous year in chronological order */
  navigateToPreviousYear: () => void;
  /** Get year entry by year number */
  getYearEntry: (year: number) => YearEntry | undefined;
}

/**
 * Hook for managing year navigation
 *
 * Provides utilities for navigating between available years,
 * including keyboard navigation support with wrap-around behavior.
 *
 * @param years - Array of available year entries
 * @returns Year navigation state and functions
 *
 * @example
 * ```tsx
 * function YearNavigator() {
 *   const { currentYear, navigateToNextYear, navigateToPreviousYear } = useYearNavigation(years);
 *
 *   return (
 *     <div>
 *       <button onClick={navigateToPreviousYear}>Previous</button>
 *       <span>{currentYear}</span>
 *       <button onClick={navigateToNextYear}>Next</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useYearNavigation(years: YearEntry[]): UseYearNavigationReturn {
  const { state, actions } = useAppState();

  // Sort years chronologically
  const sortedYears = useMemo(() => {
    return [...years].sort((a, b) => a.year - b.year);
  }, [years]);

  // Find current year index
  const currentYearIndex = useMemo(() => {
    return sortedYears.findIndex((y) => y.year === state.selectedYear);
  }, [sortedYears, state.selectedYear]);

  // Navigation availability
  const hasNextYear = sortedYears.length > 0;
  const hasPreviousYear = sortedYears.length > 0;

  // Navigate to a specific year
  const navigateToYear = useCallback(
    (year: number) => {
      const yearExists = sortedYears.some((y) => y.year === year);
      if (yearExists) {
        actions.setSelectedYear(year);
      }
    },
    [sortedYears, actions],
  );

  // Navigate to next year with wrap-around
  const navigateToNextYear = useCallback(() => {
    if (sortedYears.length === 0) return;

    const nextIndex = (currentYearIndex + 1) % sortedYears.length;
    const nextEntry = sortedYears[nextIndex];
    if (nextEntry) {
      actions.setSelectedYear(nextEntry.year);
    }
  }, [sortedYears, currentYearIndex, actions]);

  // Navigate to previous year with wrap-around
  const navigateToPreviousYear = useCallback(() => {
    if (sortedYears.length === 0) return;

    const prevIndex = currentYearIndex <= 0 ? sortedYears.length - 1 : currentYearIndex - 1;
    const prevEntry = sortedYears[prevIndex];
    if (prevEntry) {
      actions.setSelectedYear(prevEntry.year);
    }
  }, [sortedYears, currentYearIndex, actions]);

  // Get year entry by year number
  const getYearEntry = useCallback(
    (year: number): YearEntry | undefined => {
      return sortedYears.find((y) => y.year === year);
    },
    [sortedYears],
  );

  return {
    currentYear: state.selectedYear,
    currentYearIndex,
    availableYears: sortedYears,
    hasNextYear,
    hasPreviousYear,
    isLoading: state.isLoading,
    navigateToYear,
    navigateToNextYear,
    navigateToPreviousYear,
    getYearEntry,
  };
}
