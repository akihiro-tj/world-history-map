import { useCallback, useRef } from 'react';
import type { TerritoryDescription } from '@/domain/territory/types';
import type { HistoricalYear } from '@/domain/year/historical-year';
import { useCanScrollDown } from '@/hooks/use-can-scroll-down';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import { type RemoteData, toRemoteData } from '@/types/remote-data';
import { useAppState } from '../../contexts/app-state-context';
import { BottomSheet } from '../bottom-sheet/bottom-sheet';
import { CloseButton } from '../close-button/close-button';
import { RoleErrorMessage } from '../feedback/role-error-message';
import { RoleSpinner } from '../feedback/role-spinner';
import { ScrollFadeOverlay } from '../scroll-fade-overlay/scroll-fade-overlay';
import { useTerritoryDescription } from './hooks/use-territory-description';
import { SELECTED_ACCENT_CLASS, SelectedAccent } from './selected-accent';
import { SummaryNavStrip } from './summary-nav-strip';
import { TerritoryProfile } from './territory-profile';
import { TerritoryTimeline } from './territory-timeline';

interface ContentProps {
  description: TerritoryDescription | null;
  isLoading: boolean;
  error: string | null;
  selectedTerritory: string | null;
  selectedYear: HistoricalYear;
  onClose: () => void;
}

const FALLBACK_LOADING_LABEL = '読み込み中…';
const FALLBACK_PANEL_TITLE = '領土情報';

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
        'absolute left-4 top-4 z-30 w-96 max-w-[calc(100vw-2rem)] flex flex-col overflow-hidden rounded-lg bg-gray-700/95 shadow-xl backdrop-blur-sm',
        SELECTED_ACCENT_CLASS,
        scrollable && 'max-h-[calc(100vh-2rem)]',
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
}: {
  name: string;
  era?: string | undefined;
  onClose: () => void;
}) {
  return (
    <div className="border-b border-gray-600">
      <div className="flex items-start justify-between px-4 py-3">
        <div className="min-w-0 flex-1">
          <SummaryNavStrip />
          <h2 id="territory-info-title" className="mt-2.5 text-lg font-semibold text-white">
            {name}
          </h2>
          {era && <p className="mt-0.5 text-sm text-gray-300">{era}</p>}
        </div>
        <CloseButton aria-label="閉じる" onClick={onClose} />
      </div>
    </div>
  );
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
    <div data-testid="territory-description" className="space-y-3 px-4 py-4">
      <TerritoryProfile profile={description.profile} />
      {description.context && (
        <p className="text-sm leading-relaxed text-gray-300">{description.context}</p>
      )}
      <TerritoryTimeline keyEvents={description.keyEvents} selectedYear={selectedYear} />
    </div>
  );
}

function DesktopContent(props: ContentProps) {
  const { onClose, selectedYear, selectedTerritory } = props;
  const state = toRemoteData({
    data: props.description,
    isLoading: props.isLoading,
    error: props.error,
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoaded = state.kind === 'loaded';
  const canScrollDown = useCanScrollDown(scrollRef, isLoaded);

  switch (state.kind) {
    case 'loading':
      return (
        <PanelWrapper busy>
          <div className="shrink-0">
            <PanelHeader name={selectedTerritory ?? FALLBACK_LOADING_LABEL} onClose={onClose} />
          </div>
          <RoleSpinner />
        </PanelWrapper>
      );
    case 'error':
      return (
        <PanelWrapper>
          <div className="shrink-0">
            <PanelHeader name="エラー" onClose={onClose} />
          </div>
          <RoleErrorMessage>{state.message}</RoleErrorMessage>
        </PanelWrapper>
      );
    case 'empty':
      return (
        <PanelWrapper>
          <div className="shrink-0">
            <PanelHeader name={selectedTerritory ?? FALLBACK_PANEL_TITLE} onClose={onClose} />
          </div>
          <NoDescriptionBody />
        </PanelWrapper>
      );
    case 'loaded':
      return (
        <PanelWrapper scrollable>
          <div className="shrink-0">
            <PanelHeader name={state.data.name} era={state.data.era} onClose={onClose} />
          </div>
          <div ref={scrollRef} className="overflow-y-auto">
            <DescriptionBody description={state.data} selectedYear={selectedYear} />
          </div>
          <ScrollFadeOverlay show={canScrollDown} />
        </PanelWrapper>
      );
  }
}

function getHeaderLabel(
  state: RemoteData<TerritoryDescription>,
  selectedTerritory: string | null,
): { name: string; era: string | undefined } {
  switch (state.kind) {
    case 'loaded':
      return { name: state.data.name, era: state.data.era };
    case 'error':
      return { name: 'エラー', era: undefined };
    default:
      return { name: selectedTerritory ?? FALLBACK_PANEL_TITLE, era: undefined };
  }
}

function MobilePanelBody({
  state,
  selectedYear,
}: {
  state: RemoteData<TerritoryDescription>;
  selectedYear: HistoricalYear;
}) {
  switch (state.kind) {
    case 'loading':
      return <RoleSpinner />;
    case 'error':
      return <RoleErrorMessage>{state.message}</RoleErrorMessage>;
    case 'empty':
      return <NoDescriptionBody />;
    case 'loaded':
      return <DescriptionBody description={state.data} selectedYear={selectedYear} />;
  }
}

function MobileContent(props: ContentProps) {
  const { onClose, selectedYear, selectedTerritory } = props;
  const state = toRemoteData({
    data: props.description,
    isLoading: props.isLoading,
    error: props.error,
  });
  const { name: headerName, era: headerEra } = getHeaderLabel(state, selectedTerritory);

  return (
    <BottomSheet
      isOpen
      onClose={onClose}
      header={
        <div className="flex items-start border-b border-gray-600 pr-4">
          <div className="min-w-0 flex-1">
            <div className="pl-4 pr-2">
              <SummaryNavStrip />
            </div>
            <SelectedAccent className="mt-2 pl-3 pr-2 pb-1.5">
              <h2
                id="territory-info-title"
                className="leading-tight text-lg font-semibold text-white"
              >
                {headerName}
              </h2>
              {headerEra && <p className="leading-tight text-sm text-gray-300">{headerEra}</p>}
            </SelectedAccent>
          </div>
          <CloseButton aria-label="閉じる" onClick={onClose} className="shrink-0" />
        </div>
      }
      aria-labelledby="territory-info-title"
    >
      <MobilePanelBody state={state} selectedYear={selectedYear} />
    </BottomSheet>
  );
}

export function TerritoryInfoPanel() {
  const { state, actions } = useAppState();
  const { selectedYear, activePanel } = state;
  const isInfoPanelOpen = activePanel.kind === 'territory';
  const selectedTerritory = activePanel.kind === 'territory' ? activePanel.selectedTerritory : null;
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
