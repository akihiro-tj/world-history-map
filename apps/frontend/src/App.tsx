import { lazy, Suspense, useCallback, useEffect, useState } from 'react';

const LicenseDisclaimer = lazy(() =>
  import('./components/legal/license-disclaimer').then((m) => ({ default: m.LicenseDisclaimer })),
);

import { MapView } from './components/map/map-view';
import { prefetchYearDescriptions } from './components/territory-info/hooks/use-territory-description';
import { TerritoryInfoPanel } from './components/territory-info/territory-info-panel';
import { YearSelector } from './components/year-selector/year-selector';
import { AppStateProvider, useAppState } from './contexts/app-state-context';
import type { YearEntry } from './types/year';
import { loadYearIndex } from './utils/year-index';

/**
 * Main app content with year selector integration
 */
function AppContent() {
  const { state } = useAppState();
  const [years, setYears] = useState<YearEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLicenseOpen, setIsLicenseOpen] = useState(false);

  // Prefetch territory descriptions when year changes
  useEffect(() => {
    prefetchYearDescriptions(state.selectedYear);
  }, [state.selectedYear]);

  // Load year index on mount
  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const index = await loadYearIndex();
        if (isMounted) {
          setYears(index.years);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load year index:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenLicense = useCallback(() => {
    setIsLicenseOpen(true);
  }, []);

  const handleCloseLicense = useCallback(() => {
    setIsLicenseOpen(false);
  }, []);

  return (
    <main className="relative h-dvh w-screen overflow-hidden">
      <MapView />
      <TerritoryInfoPanel />
      {!isLoading && years.length > 0 && (
        <div className="absolute inset-x-4 bottom-4 z-20 mx-auto max-w-2xl overflow-hidden rounded-lg bg-gray-700/95 shadow-lg backdrop-blur-sm">
          <YearSelector years={years} />
        </div>
      )}

      {/* Footer links */}
      <footer className="absolute right-4 top-[4.5rem] z-20 flex flex-col gap-2 lg:bottom-4 lg:top-auto lg:flex-row lg:gap-1 lg:rounded-lg lg:bg-gray-700/95 lg:p-1.5 lg:shadow-lg lg:backdrop-blur-sm">
        <button
          type="button"
          data-testid="license-link"
          onClick={handleOpenLicense}
          className="rounded-lg bg-gray-700/95 p-3 text-gray-300 shadow-lg backdrop-blur-sm transition-colors hover:bg-gray-600 hover:text-white lg:rounded-md lg:bg-transparent lg:p-2 lg:shadow-none lg:backdrop-blur-none"
        >
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
            />
          </svg>
          <span className="sr-only">このサイトについて</span>
        </button>
        <a
          href="https://github.com/akihiro-tj/world-history-map"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="github-link"
          className="rounded-lg bg-gray-700/95 p-3 text-gray-300 shadow-lg backdrop-blur-sm transition-colors hover:bg-gray-600 hover:text-white lg:rounded-md lg:bg-transparent lg:p-2 lg:shadow-none lg:backdrop-blur-none"
        >
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
            />
          </svg>
          <span className="sr-only">ソースコードを見る</span>
        </a>
      </footer>

      {/* License disclaimer modal */}
      <Suspense fallback={null}>
        <LicenseDisclaimer isOpen={isLicenseOpen} onClose={handleCloseLicense} />
      </Suspense>
    </main>
  );
}

/**
 * Main application component
 *
 * Renders the interactive historical world map.
 * Default view shows territories from 1650.
 */
function App() {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  );
}

export default App;
