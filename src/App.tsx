import { useCallback, useEffect, useState } from 'react';
import { LicenseDisclaimer } from './components/legal/license-disclaimer';
import { MapView } from './components/map/map-view';
import { TerritoryInfoPanel } from './components/territory-info/territory-info-panel';
import { YearSelector } from './components/year-selector/year-selector';
import { AppStateProvider } from './contexts/app-state-context';
import type { YearEntry } from './types';
import { loadYearIndex } from './utils/year-index';

/**
 * Main app content with year selector integration
 */
function AppContent() {
  const [years, setYears] = useState<YearEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLicenseOpen, setIsLicenseOpen] = useState(false);

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

  const handleYearSelect = useCallback((year: number) => {
    console.log('Year selected:', year);
  }, []);

  const handleOpenLicense = useCallback(() => {
    setIsLicenseOpen(true);
  }, []);

  const handleCloseLicense = useCallback(() => {
    setIsLicenseOpen(false);
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <MapView />
      <TerritoryInfoPanel />
      {!isLoading && years.length > 0 && (
        <div className="absolute bottom-4 left-1/2 z-20 w-full max-w-2xl -translate-x-1/2 rounded-lg bg-white/95 shadow-lg backdrop-blur-sm dark:bg-gray-900/95">
          <YearSelector years={years} onYearSelect={handleYearSelect} />
        </div>
      )}

      {/* Footer links */}
      <footer className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
        <a
          href="https://github.com/akihiro-tj/world-history-map"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="github-link"
          className="flex items-center justify-center rounded-md bg-white/90 p-1.5 text-gray-600 shadow-md backdrop-blur-sm transition-colors hover:bg-white hover:text-gray-900 dark:bg-gray-800/90 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          <span className="sr-only">View source on GitHub</span>
        </a>
        <button
          type="button"
          data-testid="license-link"
          onClick={handleOpenLicense}
          className="flex items-center justify-center rounded-md bg-white/90 p-1.5 text-gray-600 shadow-md backdrop-blur-sm transition-colors hover:bg-white hover:text-gray-900 dark:bg-gray-800/90 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z"
              clipRule="evenodd"
            />
          </svg>
          <span className="sr-only">このサイトについて</span>
        </button>
      </footer>

      {/* License disclaimer modal */}
      <LicenseDisclaimer isOpen={isLicenseOpen} onClose={handleCloseLicense} />
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
