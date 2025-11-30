import { useCallback } from 'react';
import { useAppState } from '../../contexts/app-state-context';

/**
 * YearLink props
 */
interface YearLinkProps {
  /** Target year to navigate to */
  year: number;
  /** Optional additional className */
  className?: string;
}

/**
 * Clickable year link component
 *
 * Renders a button that navigates to a specific year when clicked.
 * Used within territory descriptions to link to related historical periods.
 *
 * @example
 * ```tsx
 * <YearLink year={1700} />
 * // Renders: "1700年"
 * ```
 */
export function YearLink({ year, className = '' }: YearLinkProps) {
  const { actions } = useAppState();

  const handleClick = useCallback(() => {
    // Navigate to the target year
    actions.setSelectedYear(year);
    // Close the info panel after navigation
    actions.setInfoPanelOpen(false);
    actions.setSelectedTerritory(null);
  }, [actions, year]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-testid="year-link"
      className={`inline-flex items-center rounded px-2 py-0.5 text-blue-600 underline hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:text-blue-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-300 ${className}`}
      aria-label={`${year}年に移動`}
    >
      {year}年
    </button>
  );
}
