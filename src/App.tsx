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
        <div className="absolute inset-x-4 bottom-4 z-20 mx-auto max-w-2xl overflow-hidden rounded-lg bg-white/95 shadow-lg backdrop-blur-sm">
          <YearSelector years={years} onYearSelect={handleYearSelect} />
        </div>
      )}

      {/* Footer links */}
      <footer className="absolute right-4 top-4 z-20 md:bottom-4 md:top-auto">
        <div className="flex items-center gap-3 rounded-lg bg-white px-3 py-2.5 shadow-md">
          <button
            type="button"
            data-testid="license-link"
            onClick={handleOpenLicense}
            className="text-gray-600 transition-colors duration-200 hover:text-gray-900"
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
          <div className="h-5 w-px bg-gray-300" aria-hidden="true" />
          <a
            href="https://github.com/akihiro-tj/world-history-map"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="github-link"
            className="text-gray-600 transition-colors duration-200 hover:text-gray-900"
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
        </div>
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
