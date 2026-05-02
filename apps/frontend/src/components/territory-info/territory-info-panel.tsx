import { useCallback } from 'react';
import type { TerritoryDescription } from '@/domain/territory/types';
import type { HistoricalYear } from '@/domain/year/historical-year';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import { useAppState } from '../../contexts/app-state-context';
import { BottomSheet } from '../bottom-sheet/bottom-sheet';
import { CloseButton } from '../close-button/close-button';
import { useTerritoryDescription } from './hooks/use-territory-description';
import { TerritoryProfile } from './territory-profile';
import { TerritoryTimeline } from './territory-timeline';

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

function LoadingBody() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-role-state border-t-transparent" />
    </div>
  );
}

function ErrorBody({ error }: { error: string | null }) {
  return <p className="m-3 rounded p-3 bg-role-error/10 text-role-error">{error}</p>;
}

function NoDescriptionBody() {
  return (
    <div data-testid="no-description-message" className="p-4 text-center text-gray-300">
      <p>この領土の詳細情報は準備中です。</p>
    </div>
  );
}

function DescriptionBody({
  description,
  selectedYear,
}: {
  description: TerritoryDescription;
  selectedYear: HistoricalYear;
}) {
  return (
    <div data-testid="territory-description" className="space-y-3 px-4 pt-2 pb-4">
      <TerritoryProfile profile={description.profile} />
      {description.context && (
        <p className="text-sm leading-relaxed text-gray-300">{description.context}</p>
      )}
      <TerritoryTimeline keyEvents={description.keyEvents} selectedYear={selectedYear} />
    </div>
  );
}

interface ContentProps {
  description: TerritoryDescription | null;
  isLoading: boolean;
  error: string | null;
  selectedTerritory: string | null;
  selectedYear: HistoricalYear;
  onClose: () => void;
}

function DesktopContent({
  description,
  isLoading,
  error,
  selectedTerritory,
  selectedYear,
  onClose,
}: ContentProps) {
  if (isLoading) {
    return (
      <PanelWrapper busy>
        <PanelHeader name={selectedTerritory ?? '読み込み中…'} onClose={onClose} />
        <LoadingBody />
      </PanelWrapper>
    );
  }
  if (error) {
    return (
      <PanelWrapper>
        <PanelHeader name="エラー" onClose={onClose} />
        <ErrorBody error={error} />
      </PanelWrapper>
    );
  }
  if (!description) {
    return (
      <PanelWrapper>
        <PanelHeader name={selectedTerritory ?? '領土情報'} onClose={onClose} />
        <NoDescriptionBody />
      </PanelWrapper>
    );
  }
  return (
    <PanelWrapper scrollable>
      <PanelHeader name={description.name} era={description.era} onClose={onClose} />
      <DescriptionBody description={description} selectedYear={selectedYear} />
    </PanelWrapper>
  );
}

function MobileContent({
  description,
  isLoading,
  error,
  selectedTerritory,
  selectedYear,
  onClose,
}: ContentProps) {
  const headerName = isLoading
    ? (selectedTerritory ?? '読み込み中…')
    : error
      ? 'エラー'
      : description
        ? description.name
        : (selectedTerritory ?? '領土情報');
  const headerEra = description && !isLoading && !error ? description.era : undefined;

  return (
    <BottomSheet
      isOpen
      onClose={onClose}
      header={
        <div className="px-4">
          <PanelHeader name={headerName} era={headerEra} onClose={onClose} />
        </div>
      }
      aria-labelledby="territory-info-title"
    >
      {isLoading ? (
        <LoadingBody />
      ) : error ? (
        <ErrorBody error={error} />
      ) : !description ? (
        <NoDescriptionBody />
      ) : (
        <DescriptionBody description={description} selectedYear={selectedYear} />
      )}
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

  const contentProps: ContentProps = {
    description,
    isLoading,
    error,
    selectedTerritory,
    selectedYear,
    onClose: handleClose,
  };

  if (isMobile) {
    return <MobileContent {...contentProps} />;
  }

  return <DesktopContent {...contentProps} />;
}
