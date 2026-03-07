import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import { useAppState } from '../../contexts/app-state-context';
import { BottomSheet } from '../ui/bottom-sheet';
import { CloseButton } from '../ui/close-button';
import type { TerritoryProfile as TerritoryProfileType } from '@/types/territory';
import { AiNotice } from './ai-notice';
import { useTerritoryDescription } from './hooks/use-territory-description';
import { TerritoryProfile } from './territory-profile';

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
    <div className={cn('flex items-start justify-between border-b border-gray-600 pb-3', className)}>
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

function DescriptionBody({ profile }: { profile?: TerritoryProfileType }) {
  return (
    <div data-testid="territory-description" className="space-y-4 p-4">
      <TerritoryProfile profile={profile} />
      <AiNotice className="mt-4" />
    </div>
  );
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
    actions.setInfoPanelOpen(false);
    actions.setSelectedTerritory(null);
  }, [actions]);

  useEscapeKey(isInfoPanelOpen && !isMobile, handleClose);

  if (!isInfoPanelOpen) {
    return null;
  }

  const title = isLoading
    ? (selectedTerritory ?? '読み込み中…')
    : error
      ? 'エラー'
      : (description?.name ?? selectedTerritory ?? '領土情報');

  if (isMobile) {
    const header = description ? (
      <PanelHeader
        name={description.name}
        era={description.era}
        onClose={handleClose}
        className="px-4"
      />
    ) : (
      <div className="flex items-center justify-between border-b border-gray-600 px-4 pb-3">
        <h2 id="territory-info-title" className="text-lg font-semibold text-white">
          {title}
        </h2>
        <CloseButton onClick={handleClose} aria-label="閉じる" />
      </div>
    );

    let body: ReactNode;
    if (isLoading) {
      body = (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-400 border-t-transparent" />
        </div>
      );
    } else if (error) {
      body = <p className="p-4 text-red-400">{error}</p>;
    } else if (!description) {
      body = (
        <div data-testid="no-description-message" className="p-4 text-center text-gray-300">
          <p>この領土の詳細情報は準備中です。</p>
        </div>
      );
    } else {
      body = <DescriptionBody profile={description.profile} />;
    }

    return (
      <BottomSheet
        isOpen={isInfoPanelOpen}
        onClose={handleClose}
        header={header}
        aria-labelledby="territory-info-title"
      >
        {body}
      </BottomSheet>
    );
  }

  const loadingContent = (
    <PanelWrapper busy>
      <div className="flex items-start justify-between border-b border-gray-600 pb-3">
        <h2 id="territory-info-title" className="text-lg font-semibold text-white">
          {title}
        </h2>
      </div>
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-400 border-t-transparent" />
      </div>
    </PanelWrapper>
  );

  const errorContent = (
    <PanelWrapper>
      <div className="flex items-start justify-between border-b border-gray-600 pb-3">
        <h2 id="territory-info-title" className="text-lg font-semibold text-white">
          エラー
        </h2>
        <CloseButton onClick={handleClose} aria-label="閉じる" />
      </div>
      <p className="mt-4 text-red-400">{error}</p>
    </PanelWrapper>
  );

  const noDescriptionContent = (
    <PanelWrapper>
      <div className="flex items-start justify-between border-b border-gray-600 pb-3">
        <h2 id="territory-info-title" className="text-lg font-semibold text-white">
          {selectedTerritory ?? '領土情報'}
        </h2>
        <CloseButton onClick={handleClose} aria-label="閉じる" />
      </div>
      <div data-testid="no-description-message" className="mt-4 text-center text-gray-300">
        <p>この領土の詳細情報は準備中です。</p>
      </div>
    </PanelWrapper>
  );

  if (isLoading) return loadingContent;
  if (error) return errorContent;
  if (!description) return noDescriptionContent;

  return (
    <PanelWrapper scrollable>
      <PanelHeader
        name={description.name}
        era={description.era}
        onClose={handleClose}
      />
      <div data-testid="territory-description" className="mt-4 space-y-4">
        <TerritoryProfile profile={description.profile} />
        <AiNotice className="mt-4" />
      </div>
    </PanelWrapper>
  );
}
