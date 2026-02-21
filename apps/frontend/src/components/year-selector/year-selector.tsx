import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useAppState } from '../../contexts/app-state-context';
import type { YearEntry } from '../../types/year';

/**
 * Props for YearSelector component
 */
interface YearSelectorProps {
  /** Array of available year entries */
  years: YearEntry[];
  /** Callback when a year is selected */
  onYearSelect?: (year: number) => void;
}

/**
 * Format year for display
 * Handles BCE notation for negative years using Japanese short format
 */
function formatYear(year: number): string {
  if (year < 0) {
    return `前${Math.abs(year)}`;
  }
  return String(year);
}

/**
 * Year selector component
 *
 * Displays a horizontally scrollable list of available years.
 * Supports keyboard navigation with arrow keys and wrap-around behavior.
 *
 * @example
 * ```tsx
 * <YearSelector
 *   years={availableYears}
 *   onYearSelect={(year) => console.log('Selected:', year)}
 * />
 * ```
 */
export function YearSelector({ years, onYearSelect }: YearSelectorProps) {
  const { state, actions } = useAppState();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const isInitialMount = useRef(true);

  // Sort years chronologically
  const sortedYears = useMemo(() => [...years].sort((a, b) => a.year - b.year), [years]);

  // Get current year index
  const currentIndex = sortedYears.findIndex((y) => y.year === state.selectedYear);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < sortedYears.length - 1;

  // Navigate to previous/next year
  const navigateYear = useCallback(
    (direction: 'prev' | 'next') => {
      const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
      const newYear = sortedYears[newIndex];
      if (newYear) {
        actions.setSelectedYear(newYear.year);
        onYearSelect?.(newYear.year);
      }
    },
    [currentIndex, sortedYears, actions, onYearSelect],
  );

  // Scroll selected year into view on mount and when selection changes
  // Use instant scroll on initial mount, smooth scroll afterwards
  useEffect(() => {
    const selectedButton = buttonRefs.current.get(state.selectedYear);
    if (selectedButton) {
      selectedButton.scrollIntoView({
        behavior: isInitialMount.current ? 'instant' : 'smooth',
        block: 'nearest',
        inline: 'center',
      });
      isInitialMount.current = false;
    }
  }, [state.selectedYear]);

  // Handle year selection
  const handleYearClick = useCallback(
    (year: number) => {
      actions.setSelectedYear(year);
      onYearSelect?.(year);
    },
    [actions, onYearSelect],
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      let nextIndex: number | null = null;

      switch (event.key) {
        case 'ArrowRight':
          nextIndex = (currentIndex + 1) % sortedYears.length;
          event.preventDefault();
          break;
        case 'ArrowLeft':
          nextIndex = currentIndex === 0 ? sortedYears.length - 1 : currentIndex - 1;
          event.preventDefault();
          break;
        case 'Home':
          nextIndex = 0;
          event.preventDefault();
          break;
        case 'End':
          nextIndex = sortedYears.length - 1;
          event.preventDefault();
          break;
        case 'Enter':
        case ' ': {
          const entry = sortedYears[currentIndex];
          if (entry) {
            handleYearClick(entry.year);
          }
          event.preventDefault();
          break;
        }
        default:
          return;
      }

      if (nextIndex !== null) {
        const nextEntry = sortedYears[nextIndex];
        if (nextEntry) {
          const nextButton = buttonRefs.current.get(nextEntry.year);
          nextButton?.focus();
        }
      }
    },
    [sortedYears, handleYearClick],
  );

  // Store button ref
  const setButtonRef = useCallback((year: number, element: HTMLButtonElement | null) => {
    if (element) {
      buttonRefs.current.set(year, element);
    } else {
      buttonRefs.current.delete(year);
    }
  }, []);

  return (
    <nav
      ref={containerRef}
      data-testid="year-selector"
      aria-label="年代選択"
      className="flex items-stretch"
    >
      {/* Previous year button */}
      <button
        type="button"
        onClick={() => navigateYear('prev')}
        disabled={!canGoPrev}
        aria-label="前の年代を選択"
        className={cn(
          'flex shrink-0 items-center border-r border-gray-600 px-3 py-2 transition-colors',
          canGoPrev
            ? 'text-gray-300 hover:bg-gray-600 hover:text-white'
            : 'cursor-not-allowed text-gray-500',
        )}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Scrollable year list */}
      <div className="flex flex-1 items-stretch overflow-x-auto scrollbar-none">
        {sortedYears.map((yearEntry, index) => {
          const isSelected = yearEntry.year === state.selectedYear;

          return (
            <button
              key={yearEntry.year}
              ref={(el) => setButtonRef(yearEntry.year, el)}
              type="button"
              data-testid={`year-button-${yearEntry.year}`}
              aria-label={`${formatYear(yearEntry.year)}年を選択`}
              aria-current={isSelected ? 'true' : undefined}
              onClick={() => handleYearClick(yearEntry.year)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                'flex shrink-0 items-center justify-center border-r border-gray-600 py-3 font-medium transition-colors last:border-r-0',
                isSelected
                  ? 'min-w-[5rem] bg-blue-600 px-5 text-xl text-white'
                  : 'min-w-[4rem] px-3 text-base text-gray-300 hover:bg-gray-600 hover:text-white',
              )}
            >
              {formatYear(yearEntry.year)}
            </button>
          );
        })}
      </div>

      {/* Next year button */}
      <button
        type="button"
        onClick={() => navigateYear('next')}
        disabled={!canGoNext}
        aria-label="次の年代を選択"
        className={cn(
          'flex shrink-0 items-center border-l border-gray-600 px-3 py-2 transition-colors',
          canGoNext
            ? 'text-gray-300 hover:bg-gray-600 hover:text-white'
            : 'cursor-not-allowed text-gray-500',
        )}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  );
}
