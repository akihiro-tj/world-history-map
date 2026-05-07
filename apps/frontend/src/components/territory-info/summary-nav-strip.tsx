import { formatHistoricalYear } from '@/domain/year/historical-year';
import { useAppState } from '../../contexts/app-state-context';

export function SummaryNavStrip() {
  const { state, actions } = useAppState();
  const { selectedYear } = state;
  const yearLabel = formatHistoricalYear(selectedYear);

  return (
    <button
      type="button"
      aria-label={`${yearLabel}年の世界サマリーを開く`}
      onClick={() => actions.openSummary()}
      className="flex min-w-0 flex-1 items-center gap-1.5 px-4 py-2.5 truncate text-left text-sm text-gray-300 transition-colors hover:bg-gray-600/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-400"
    >
      <svg
        className="h-4 w-4 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6h16M4 10h16M4 14h16M4 18h16"
        />
      </svg>
      <span className="truncate">{yearLabel}年の世界を見る</span>
    </button>
  );
}
