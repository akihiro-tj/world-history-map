import { useCallback, useEffect, useState } from 'react';
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

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <MapView />
      <TerritoryInfoPanel />
      {!isLoading && years.length > 0 && (
        <div className="absolute bottom-4 left-1/2 z-20 w-full max-w-2xl -translate-x-1/2 rounded-lg bg-white/95 shadow-lg backdrop-blur-sm dark:bg-gray-900/95">
          <YearSelector years={years} onYearSelect={handleYearSelect} />
        </div>
      )}
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
