import { formatHistoricalYear } from '@/domain/year/historical-year';
import { useAppState } from '../../contexts/app-state-context';

export function SummaryNavStrip() {
  const { state, actions } = useAppState();
  const { selectedYear } = state;
  const yearLabel = formatHistoricalYear(selectedYear);

  return (
    <button
      type="button"
      aria-label={`${yearLabel}年の概観を開く`}
      onClick={() => actions.openSummary()}
      className="flex w-max items-center gap-1 rounded-sm text-caption text-text-secondary underline hover:no-underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-role-focus"
    >
      <svg
        className="h-3 w-3 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        />
      </svg>
      <span className="truncate">{yearLabel}年の概観</span>
    </button>
  );
}
