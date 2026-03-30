import { lazy, Suspense, useCallback, useEffect, useState } from 'react';

const LicenseDisclaimer = lazy(() =>
  import('./components/legal/license-disclaimer').then((m) => ({ default: m.LicenseDisclaimer })),
);

import { prefetchYearDescriptions } from '@/domain/territory/description-loader';
import { useYearIndex } from '@/hooks/use-year-index';
import { ControlBar } from './components/control-bar/control-bar';
import { MapView } from './components/map/map-view';
import { TerritoryInfoPanel } from './components/territory-info/territory-info-panel';
import { YearDisplay } from './components/year-display/year-display';
import { YearSelector } from './components/year-selector/year-selector';
import { AppStateProvider, useAppState } from './contexts/app-state-context';
import { ProjectionProvider } from './contexts/projection-context';

function AppContent() {
  const { state } = useAppState();
  const { years, isLoading } = useYearIndex();
  const [isLicenseOpen, setIsLicenseOpen] = useState(false);

  useEffect(() => {
    prefetchYearDescriptions(state.selectedYear);
  }, [state.selectedYear]);

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
      <div className="absolute top-4 left-1/2 z-20 -translate-x-1/2">
        <YearDisplay year={state.selectedYear} />
      </div>
      <ControlBar onOpenLicense={handleOpenLicense} />
      {!isLoading && years.length > 0 && (
        <div className="absolute inset-x-4 bottom-4 z-20 mx-auto max-w-2xl overflow-hidden rounded-lg bg-gray-700/95 shadow-lg backdrop-blur-sm">
          <YearSelector years={years} />
        </div>
      )}
      <Suspense fallback={null}>
        <LicenseDisclaimer isOpen={isLicenseOpen} onClose={handleCloseLicense} />
      </Suspense>
    </main>
  );
}

function App() {
  return (
    <AppStateProvider>
      <ProjectionProvider>
        <AppContent />
      </ProjectionProvider>
    </AppStateProvider>
  );
}

export default App;
