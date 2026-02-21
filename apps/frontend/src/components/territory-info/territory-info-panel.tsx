import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { cn } from '@/lib/utils';
import { useAppState } from '../../contexts/app-state-context';
import { CloseButton } from '../ui/close-button';
import { AiNotice } from './ai-notice';
import { useTerritoryDescription } from './hooks/use-territory-description';
import { YearLink } from './year-link';

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

export function TerritoryInfoPanel() {
  const { state, actions } = useAppState();
  const { selectedTerritory, selectedYear, isInfoPanelOpen } = state;

  const { description, isLoading, error } = useTerritoryDescription(
    selectedTerritory,
    selectedYear,
  );

  const handleClose = useCallback(() => {
    actions.setInfoPanelOpen(false);
    actions.setSelectedTerritory(null);
  }, [actions]);

  useEscapeKey(isInfoPanelOpen, handleClose);

  const sortedKeyEvents = useMemo(
    () =>
      description?.keyEvents ? [...description.keyEvents].sort((a, b) => a.year - b.year) : [],
    [description?.keyEvents],
  );

  if (!isInfoPanelOpen) {
    return null;
  }

  if (isLoading) {
    return (
      <PanelWrapper busy>
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-400 border-t-transparent" />
        </div>
      </PanelWrapper>
    );
  }

  if (error) {
    return (
      <PanelWrapper>
        <div className="flex items-center justify-between border-b border-gray-600 pb-3">
          <h2 id="territory-info-title" className="text-lg font-semibold text-white">
            エラー
          </h2>
          <CloseButton onClick={handleClose} aria-label="閉じる" />
        </div>
        <p className="mt-4 text-red-400">{error}</p>
      </PanelWrapper>
    );
  }

  if (!description) {
    return (
      <PanelWrapper>
        <div className="flex items-center justify-between border-b border-gray-600 pb-3">
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
  }

  return (
    <PanelWrapper scrollable>
      <div className="flex items-center justify-between border-b border-gray-600 pb-3">
        <h2 id="territory-info-title" className="text-lg font-semibold text-white">
          {description.name}
        </h2>
        <CloseButton onClick={handleClose} aria-label="閉じる" />
      </div>

      <div data-testid="territory-description" className="mt-4 space-y-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-medium text-white">
            {description.year}年
          </span>
        </div>

        {description.facts.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-white">基本情報</h3>
            <ul className="space-y-1 text-sm text-gray-300">
              {description.facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </div>
        )}

        {sortedKeyEvents.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-white">主な出来事</h3>
            <ul className="relative space-y-2.5 border-l-2 border-blue-600 pl-4">
              {sortedKeyEvents.map((keyEvent) => (
                <li
                  key={`${keyEvent.year}-${keyEvent.event}`}
                  className="relative text-sm text-gray-300"
                >
                  <span
                    className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-blue-400"
                    aria-hidden="true"
                  />
                  <span className="font-medium text-gray-100">{keyEvent.year}年</span>
                  <span className="mx-1.5 text-gray-400">—</span>
                  {keyEvent.event}
                </li>
              ))}
            </ul>
          </div>
        )}

        {description.relatedYears && description.relatedYears.length > 0 && (
          <div data-testid="related-years">
            <h3 className="mb-2 text-sm font-semibold text-white">関連する年代</h3>
            <div className="flex flex-wrap gap-2">
              {description.relatedYears.map((year) => (
                <YearLink key={year} year={year} />
              ))}
            </div>
          </div>
        )}

        <AiNotice className="mt-4" />
      </div>
    </PanelWrapper>
  );
}
