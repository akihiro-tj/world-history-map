import { useCallback } from 'react';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import type { TerritoryDescription } from '@/types/territory';
import { useAppState } from '../../contexts/app-state-context';
import { BottomSheet } from '../bottom-sheet/bottom-sheet';
import { CloseButton } from '../close-button/close-button';
import { AiNotice } from './ai-notice';
import { useTerritoryDescription } from './hooks/use-territory-description';
import { TerritoryProfile } from './territory-profile';
import { TerritoryTimeline } from './territory-timeline';

interface PanelContentInput {
  description: TerritoryDescription | null;
  isLoading: boolean;
  error: string | null;
  selectedTerritory: string | null;
  selectedYear: number;
  onClose: () => void;
}

function PanelWrapper({
  children,
  scrollable,
  busy,
}: {
  children: React.ReactNode;
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

function LoadingContent({ input }: { input: PanelContentInput }) {
  const title = input.selectedTerritory ?? '読み込み中…';
  return (
    <PanelWrapper busy>
      <PanelHeader name={title} onClose={input.onClose} />
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-400 border-t-transparent" />
      </div>
    </PanelWrapper>
  );
}

function ErrorContent({ input }: { input: PanelContentInput }) {
  return (
    <PanelWrapper>
      <PanelHeader name="エラー" onClose={input.onClose} />
      <p className="p-4 text-red-400">{input.error}</p>
    </PanelWrapper>
  );
}

function NoDescriptionContent({ input }: { input: PanelContentInput }) {
  return (
    <PanelWrapper>
      <PanelHeader name={input.selectedTerritory ?? '領土情報'} onClose={input.onClose} />
      <div data-testid="no-description-message" className="p-4 text-center text-gray-300">
        <p>この領土の詳細情報は準備中です。</p>
      </div>
    </PanelWrapper>
  );
}

function DescriptionContent({ input }: { input: PanelContentInput }) {
  const { description } = input;
  if (!description) return null;
  return (
    <PanelWrapper scrollable>
      <PanelHeader name={description.name} era={description.era} onClose={input.onClose} />
      <div data-testid="territory-description" className="space-y-3 px-4 pt-2 pb-4">
        <TerritoryProfile profile={description.profile} />
        {description.context && (
          <p className="text-sm leading-relaxed text-gray-300">{description.context}</p>
        )}
        <TerritoryTimeline keyEvents={description.keyEvents} selectedYear={input.selectedYear} />
        <AiNotice className="mt-4" />
      </div>
    </PanelWrapper>
  );
}

function MobileLoadingContent({ input }: { input: PanelContentInput }) {
  const title = input.selectedTerritory ?? '読み込み中…';
  return (
    <BottomSheet
      isOpen
      onClose={input.onClose}
      header={
        <div className="px-4">
          <PanelHeader name={title} onClose={input.onClose} />
        </div>
      }
      aria-labelledby="territory-info-title"
    >
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-400 border-t-transparent" />
      </div>
    </BottomSheet>
  );
}

function MobileErrorContent({ input }: { input: PanelContentInput }) {
  return (
    <BottomSheet
      isOpen
      onClose={input.onClose}
      header={
        <div className="px-4">
          <PanelHeader name="エラー" onClose={input.onClose} />
        </div>
      }
      aria-labelledby="territory-info-title"
    >
      <p className="p-4 text-red-400">{input.error}</p>
    </BottomSheet>
  );
}

function MobileNoDescriptionContent({ input }: { input: PanelContentInput }) {
  return (
    <BottomSheet
      isOpen
      onClose={input.onClose}
      header={
        <div className="px-4">
          <PanelHeader name={input.selectedTerritory ?? '領土情報'} onClose={input.onClose} />
        </div>
      }
      aria-labelledby="territory-info-title"
    >
      <div data-testid="no-description-message" className="p-4 text-center text-gray-300">
        <p>この領土の詳細情報は準備中です。</p>
      </div>
    </BottomSheet>
  );
}

function MobileDescriptionContent({ input }: { input: PanelContentInput }) {
  const { description } = input;
  if (!description) return null;
  return (
    <BottomSheet
      isOpen
      onClose={input.onClose}
      header={
        <div className="px-4">
          <PanelHeader name={description.name} era={description.era} onClose={input.onClose} />
        </div>
      }
      aria-labelledby="territory-info-title"
    >
      <div data-testid="territory-description" className="space-y-3 px-4 pt-2 pb-4">
        <TerritoryProfile profile={description.profile} />
        {description.context && (
          <p className="text-sm leading-relaxed text-gray-300">{description.context}</p>
        )}
        <TerritoryTimeline keyEvents={description.keyEvents} selectedYear={input.selectedYear} />
        <AiNotice className="mt-4" />
      </div>
    </BottomSheet>
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
    actions.clearSelection();
  }, [actions]);

  useEscapeKey(isInfoPanelOpen && !isMobile, handleClose);

  if (!isInfoPanelOpen) {
    return null;
  }

  const input: PanelContentInput = {
    description,
    isLoading,
    error,
    selectedTerritory,
    selectedYear,
    onClose: handleClose,
  };

  if (isMobile) {
    if (isLoading) return <MobileLoadingContent input={input} />;
    if (error) return <MobileErrorContent input={input} />;
    if (!description) return <MobileNoDescriptionContent input={input} />;
    return <MobileDescriptionContent input={input} />;
  }

  if (isLoading) return <LoadingContent input={input} />;
  if (error) return <ErrorContent input={input} />;
  if (!description) return <NoDescriptionContent input={input} />;
  return <DescriptionContent input={input} />;
}
