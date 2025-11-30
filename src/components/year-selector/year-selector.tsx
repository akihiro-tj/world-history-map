import { type KeyboardEvent, useCallback, useEffect, useRef } from 'react';
import { useAppState } from '../../contexts/app-state-context';
import type { YearEntry } from '../../types';

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
  const sortedYears = [...years].sort((a, b) => a.year - b.year);

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
      className="flex items-center gap-1 overflow-x-auto px-2 py-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400"
    >
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
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isSelected
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {formatYear(yearEntry.year)}
          </button>
        );
      })}
    </nav>
  );
}
