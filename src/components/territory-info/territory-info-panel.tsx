import { useCallback, useEffect } from 'react';
import { useAppState } from '../../contexts/app-state-context';
import { useTerritoryDescription } from '../../hooks/use-territory-description';
import { CloseButton } from '../ui/close-button';
import { AiNotice } from './ai-notice';
import { YearLink } from './year-link';

/**
 * Territory info panel component
 *
 * Displays detailed historical information about the selected territory.
 * Includes territory name, summary, background, key events, and related years.
 * Shows AI-generated content notice and supports keyboard accessibility.
 *
 * @example
 * ```tsx
 * <TerritoryInfoPanel />
 * ```
 */
export function TerritoryInfoPanel() {
  const { state, actions } = useAppState();
  const { selectedTerritory, selectedYear, isInfoPanelOpen } = state;

  const { description, isLoading, error } = useTerritoryDescription(
    selectedTerritory,
    selectedYear,
  );

  // Handle close
  const handleClose = useCallback(() => {
    actions.setInfoPanelOpen(false);
    actions.setSelectedTerritory(null);
  }, [actions]);

  // Handle Escape key
  useEffect(() => {
    if (!isInfoPanelOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isInfoPanelOpen, handleClose]);

  // Don't render if panel is closed
  if (!isInfoPanelOpen) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <aside
        data-testid="territory-info-panel"
        role="dialog"
        aria-labelledby="territory-info-title"
        aria-busy="true"
        className="absolute left-4 top-4 z-30 w-96 max-w-[calc(100vw-2rem)] rounded-lg bg-white/95 p-4 shadow-xl backdrop-blur-sm"
      >
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      </aside>
    );
  }

  // Error state
  if (error) {
    return (
      <aside
        data-testid="territory-info-panel"
        role="dialog"
        aria-labelledby="territory-info-title"
        className="absolute left-4 top-4 z-30 w-96 max-w-[calc(100vw-2rem)] rounded-lg bg-white/95 p-4 shadow-xl backdrop-blur-sm"
      >
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <h2 id="territory-info-title" className="text-lg font-semibold text-gray-900">
            エラー
          </h2>
          <CloseButton onClick={handleClose} aria-label="閉じる" />
        </div>
        <p className="mt-4 text-red-600">{error}</p>
      </aside>
    );
  }

  // No description available
  if (!description) {
    return (
      <aside
        data-testid="territory-info-panel"
        role="dialog"
        aria-labelledby="territory-info-title"
        className="absolute left-4 top-4 z-30 w-96 max-w-[calc(100vw-2rem)] rounded-lg bg-white/95 p-4 shadow-xl backdrop-blur-sm"
      >
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <h2 id="territory-info-title" className="text-lg font-semibold text-gray-900">
            {selectedTerritory ?? '領土情報'}
          </h2>
          <CloseButton onClick={handleClose} aria-label="閉じる" />
        </div>
        <div data-testid="no-description-message" className="mt-4 text-center text-gray-600">
          <p>この領土の詳細情報は準備中です。</p>
        </div>
      </aside>
    );
  }

  // Full description display
  return (
    <aside
      data-testid="territory-info-panel"
      role="dialog"
      aria-labelledby="territory-info-title"
      className="absolute left-4 top-4 z-30 max-h-[calc(100vh-2rem)] w-96 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg bg-white/95 p-4 shadow-xl backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <h2 id="territory-info-title" className="text-lg font-semibold text-gray-900">
          {description.name}
        </h2>
        <CloseButton onClick={handleClose} aria-label="閉じる" />
      </div>

      {/* Content */}
      <div data-testid="territory-description" className="mt-4 space-y-4">
        {/* Year badge */}
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
            {description.year}年
          </span>
        </div>

        {/* Summary */}
        <p className="text-sm text-gray-700">{description.summary}</p>

        {/* Background */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-900">歴史的背景</h3>
          <p className="text-sm leading-relaxed text-gray-600">{description.background}</p>
        </div>

        {/* Key Events */}
        {description.keyEvents.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-900">主な出来事</h3>
            <ul className="relative space-y-2.5 border-l-2 border-blue-200 pl-4">
              {[...description.keyEvents]
                .sort((a, b) => a.year - b.year)
                .map((keyEvent) => (
                  <li
                    key={`${keyEvent.year}-${keyEvent.event}`}
                    className="relative text-sm text-gray-600"
                  >
                    <span
                      className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-blue-400"
                      aria-hidden="true"
                    />
                    <span className="font-medium text-gray-700">{keyEvent.year}年</span>
                    <span className="mx-1.5 text-gray-400">—</span>
                    {keyEvent.event}
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* Related Years */}
        {description.relatedYears.length > 0 && (
          <div data-testid="related-years">
            <h3 className="mb-2 text-sm font-semibold text-gray-900">関連する年代</h3>
            <div className="flex flex-wrap gap-2">
              {description.relatedYears.map((year) => (
                <YearLink key={year} year={year} />
              ))}
            </div>
          </div>
        )}

        {/* AI Notice */}
        <AiNotice className="mt-4" />
      </div>
    </aside>
  );
}
