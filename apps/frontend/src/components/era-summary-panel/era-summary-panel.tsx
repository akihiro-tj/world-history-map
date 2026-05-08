import { useCallback, useRef } from 'react';
import type { EraSummary } from '@/domain/era-summary/types';
import { formatHistoricalYear } from '@/domain/year/historical-year';
import { useCanScrollDown } from '@/hooks/use-can-scroll-down';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import { useAppState } from '../../contexts/app-state-context';
import { BottomSheet } from '../bottom-sheet/bottom-sheet';
import { CloseButton } from '../close-button/close-button';
import { RoleErrorMessage } from '../feedback/role-error-message';
import { RoleSpinner } from '../feedback/role-spinner';
import { ScrollFadeOverlay } from '../scroll-fade-overlay/scroll-fade-overlay';
import { useEraSummary } from './hooks/use-era-summary';
import { RegionCard } from './region-card';

type PanelState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'empty' }
  | { kind: 'loaded'; summary: EraSummary };

function derivePanelState({
  summary,
  isLoading,
  error,
}: {
  summary: EraSummary | null;
  isLoading: boolean;
  error: string | null;
}): PanelState {
  if (isLoading) return { kind: 'loading' };
  if (error) return { kind: 'error', message: error };
  if (!summary) return { kind: 'empty' };
  return { kind: 'loaded', summary };
}

interface ContentProps {
  state: PanelState;
  yearLabel: string;
  onClose: () => void;
}

function PanelHeader({ yearLabel, onClose }: { yearLabel: string; onClose: () => void }) {
  return (
    <div className="border-b border-gray-600">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 id="era-summary-title" className="text-lg font-semibold text-white">
          {yearLabel}年の世界
        </h2>
        <CloseButton onClick={onClose} aria-label="閉じる" />
      </div>
    </div>
  );
}

function PanelBody({ state }: { state: PanelState }) {
  switch (state.kind) {
    case 'loading':
      return <RoleSpinner />;
    case 'error':
      return <RoleErrorMessage>{state.message}</RoleErrorMessage>;
    case 'empty':
      return (
        <div role="status" className="py-6 text-center text-sm text-gray-300">
          この年代の概要は準備中です。
        </div>
      );
    case 'loaded':
      return (
        <div className="space-y-4">
          {state.summary.regions.map((regionCard) => (
            <RegionCard key={regionCard.region} regionCard={regionCard} />
          ))}
        </div>
      );
  }
}

function DesktopContent({ state, yearLabel, onClose }: ContentProps) {
  const isLoading = state.kind === 'loading';
  const isLoaded = state.kind === 'loaded';
  const scrollRef = useRef<HTMLDivElement>(null);
  const canScrollDown = useCanScrollDown(scrollRef, isLoaded);

  return (
    <aside
      data-testid="era-summary-panel"
      role="dialog"
      aria-labelledby="era-summary-title"
      aria-busy={isLoading || undefined}
      className={cn(
        'absolute left-4 top-4 z-30 w-96 max-w-[calc(100vw-2rem)] flex flex-col overflow-hidden rounded-lg bg-gray-700/95 shadow-xl backdrop-blur-sm',
        isLoaded && 'max-h-[calc(100vh-2rem)]',
      )}
    >
      <PanelHeader yearLabel={yearLabel} onClose={onClose} />
      {isLoaded ? (
        <div ref={scrollRef} className="overflow-y-auto px-4 py-4">
          <PanelBody state={state} />
        </div>
      ) : (
        <div className="px-4 py-4">
          <PanelBody state={state} />
        </div>
      )}
      {isLoaded && <ScrollFadeOverlay show={canScrollDown} />}
    </aside>
  );
}

function MobileContent({ state, yearLabel, onClose }: ContentProps) {
  return (
    <BottomSheet
      isOpen
      onClose={onClose}
      header={
        <div className="flex items-center justify-between border-b border-gray-600 px-4 pb-2">
          <h2 id="era-summary-title" className="text-lg font-semibold text-white">
            {yearLabel}年の世界
          </h2>
          <CloseButton aria-label="閉じる" onClick={onClose} />
        </div>
      }
      aria-labelledby="era-summary-title"
    >
      <div className="px-4 py-4">
        <PanelBody state={state} />
      </div>
    </BottomSheet>
  );
}

export function EraSummaryPanel() {
  const { state, actions } = useAppState();
  const { selectedYear, activePanel } = state;
  const isSummaryPanelOpen = activePanel.kind === 'summary';
  const isMobile = useIsMobile();

  const { summary, isLoading, error } = useEraSummary(selectedYear);

  const handleClose = useCallback(() => {
    actions.closePanel();
  }, [actions]);

  useEscapeKey(isSummaryPanelOpen && !isMobile, handleClose);

  if (!isSummaryPanelOpen) {
    return null;
  }

  const currentState = derivePanelState({ summary, isLoading, error });
  const yearLabel = formatHistoricalYear(selectedYear);

  if (isMobile) {
    return <MobileContent state={currentState} yearLabel={yearLabel} onClose={handleClose} />;
  }

  return <DesktopContent state={currentState} yearLabel={yearLabel} onClose={handleClose} />;
}
