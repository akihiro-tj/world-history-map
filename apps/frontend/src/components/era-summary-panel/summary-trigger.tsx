import { useAppState } from '../../contexts/app-state-context';

function ListBulletIcon() {
  return (
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
  );
}

export function SummaryTrigger() {
  const { state, actions } = useAppState();

  if (state.activePanel.kind !== 'none') {
    return null;
  }

  return (
    <button
      type="button"
      aria-label="概要を開く"
      onClick={() => actions.openSummary()}
      className="flex items-center gap-1.5 rounded-full bg-gray-700/95 px-4 py-2.5 text-sm text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-gray-600/95"
    >
      <ListBulletIcon />
      <span>概要</span>
    </button>
  );
}
