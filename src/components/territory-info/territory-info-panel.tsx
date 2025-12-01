import { useCallback, useEffect } from 'react';
import { useAppState } from '../../contexts/app-state-context';
import { useTerritoryDescription } from '../../hooks/use-territory-description';
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
        className="absolute right-4 top-4 z-30 w-96 max-w-[calc(100vw-2rem)] rounded-lg bg-white/95 p-4 shadow-xl backdrop-blur-sm dark:bg-gray-900/95"
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
        className="absolute right-4 top-4 z-30 w-96 max-w-[calc(100vw-2rem)] rounded-lg bg-white/95 p-4 shadow-xl backdrop-blur-sm dark:bg-gray-900/95"
      >
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-700">
          <h2
            id="territory-info-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            エラー
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="閉じる"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <p className="mt-4 text-red-600 dark:text-red-400">{error}</p>
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
        className="absolute right-4 top-4 z-30 w-96 max-w-[calc(100vw-2rem)] rounded-lg bg-white/95 p-4 shadow-xl backdrop-blur-sm dark:bg-gray-900/95"
      >
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-700">
          <h2
            id="territory-info-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            {selectedTerritory ?? '領土情報'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="閉じる"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div
          data-testid="no-description-message"
          className="mt-4 text-center text-gray-600 dark:text-gray-400"
        >
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
      className="absolute right-4 top-4 z-30 max-h-[calc(100vh-2rem)] w-96 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg bg-white/95 p-4 shadow-xl backdrop-blur-sm dark:bg-gray-900/95"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-700">
        <h2
          id="territory-info-title"
          className="text-lg font-semibold text-gray-900 dark:text-white"
        >
          {description.name}
        </h2>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label="閉じる"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div data-testid="territory-description" className="mt-4 space-y-4">
        {/* Year badge */}
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
            {description.year}年
          </span>
        </div>

        {/* Summary */}
        <p className="text-sm text-gray-700 dark:text-gray-300">{description.summary}</p>

        {/* Background */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">歴史的背景</h3>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {description.background}
          </p>
        </div>

        {/* Key Events */}
        {description.keyEvents.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">主な出来事</h3>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              {description.keyEvents.map((event) => (
                <li key={event} className="flex items-start gap-2">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500"
                    aria-hidden="true"
                  />
                  <span>{event}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Related Years */}
        {description.relatedYears.length > 0 && (
          <div data-testid="related-years">
            <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
              関連する年代
            </h3>
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
