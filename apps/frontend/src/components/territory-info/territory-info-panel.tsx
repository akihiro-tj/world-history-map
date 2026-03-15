import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import type { TerritoryProfile as TerritoryProfileType } from '@/types/territory';
import { useAppState } from '../../contexts/app-state-context';
import { BottomSheet } from '../ui/bottom-sheet';
import { CloseButton } from '../ui/close-button';
import { AiNotice } from './ai-notice';
import { useTerritoryDescription } from './hooks/use-territory-description';
import { TerritoryContext } from './territory-context';
import { TerritoryProfile } from './territory-profile';
import { TerritoryTimeline } from './territory-timeline';

function PanelWrapper({
  children,
  scrollable,
  busy,
}: {
  children: ReactNode;
  scrollable?: boolean;
  busy?: boolean;
}) {
  return (
    <aside
      data-testid="territory-info-panel"
      role="dialog"
      aria-labelledby="territory-info-title"
      aria-busy={busy || undefined}
      className={cn(
        'absolute left-4 top-4 z-30 w-96 max-w-[calc(100vw-2rem)] rounded-lg bg-gray-700/95 p-4 shadow-xl backdrop-blur-sm',
        scrollable && 'max-h-[calc(100vh-2rem)] overflow-y-auto',
      )}
    >
      {children}
    </aside>
  );
}

function PanelHeader({
  name,
  era,
  onClose,
  className,
}: {
  name: string;
  era?: string | undefined;
  onClose: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn('flex items-start justify-between border-b border-gray-600 pb-3', className)}
    >
      <div className="min-w-0 flex-1">
        <h2 id="territory-info-title" className="text-lg font-semibold text-white">
          {name}
        </h2>
        {era && <p className="mt-0.5 text-sm text-gray-300">{era}</p>}
      </div>
      <CloseButton onClick={onClose} aria-label="閉じる" />
    </div>
  );
}

function DescriptionBody({
  profile,
  context,
  keyEvents,
  selectedYear,
}: {
  profile?: TerritoryProfileType;
  context?: string;
  keyEvents?: import('@/types/territory').KeyEvent[];
  selectedYear: number;
}) {
  return (
    <div data-testid="territory-description" className="space-y-3 px-4 pt-2 pb-4">
      <TerritoryProfile profile={profile} />
      <TerritoryContext context={context} />
      <TerritoryTimeline keyEvents={keyEvents} selectedYear={selectedYear} />
      <AiNotice className="mt-4" />
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-400 border-t-transparent" />
    </div>
  );
}

function buildPanelContent(
  description: import('@/types/territory').TerritoryDescription | null,
  isLoading: boolean,
  error: string | null,
  selectedTerritory: string | null,
  selectedYear: number,
  onClose: () => void,
): { header: ReactNode; body: ReactNode; busy: boolean; scrollable: boolean } {
  const title = isLoading
    ? (selectedTerritory ?? '読み込み中…')
    : error
      ? 'エラー'
      : (description?.name ?? selectedTerritory ?? '領土情報');

  if (isLoading) {
    return {
      header: <PanelHeader name={title} onClose={onClose} />,
      body: <LoadingSpinner />,
      busy: true,
      scrollable: false,
    };
  }

  if (error) {
    return {
      header: <PanelHeader name="エラー" onClose={onClose} />,
      body: <p className="p-4 text-red-400">{error}</p>,
      busy: false,
      scrollable: false,
    };
  }

  if (!description) {
    return {
      header: <PanelHeader name={selectedTerritory ?? '領土情報'} onClose={onClose} />,
      body: (
        <div data-testid="no-description-message" className="p-4 text-center text-gray-300">
          <p>この領土の詳細情報は準備中です。</p>
        </div>
      ),
      busy: false,
      scrollable: false,
    };
  }

  return {
    header: <PanelHeader name={description.name} era={description.era} onClose={onClose} />,
    body: (
      <DescriptionBody
        {...(description.profile !== undefined && { profile: description.profile })}
        {...(description.context !== undefined && { context: description.context })}
        {...(description.keyEvents !== undefined && { keyEvents: description.keyEvents })}
        selectedYear={selectedYear}
      />
    ),
    busy: false,
    scrollable: true,
  };
}

export function TerritoryInfoPanel() {
  const { state, actions } = useAppState();
  const { selectedTerritory, selectedYear, isInfoPanelOpen } = state;
  const isMobile = useIsMobile();

  const { description, isLoading, error } = useTerritoryDescription(
    selectedTerritory,
    selectedYear,
  );

  const handleClose = useCallback(() => {
    actions.clearSelection();
  }, [actions]);

  useEscapeKey(isInfoPanelOpen && !isMobile, handleClose);

  if (!isInfoPanelOpen) {
    return null;
  }

  const { header, body, busy, scrollable } = buildPanelContent(
    description,
    isLoading,
    error,
    selectedTerritory,
    selectedYear,
    handleClose,
  );

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isInfoPanelOpen}
        onClose={handleClose}
        header={<div className="px-4">{header}</div>}
        aria-labelledby="territory-info-title"
      >
        {body}
      </BottomSheet>
    );
  }

  return (
    <PanelWrapper scrollable={scrollable} busy={busy}>
      {header}
      {body}
    </PanelWrapper>
  );
}
