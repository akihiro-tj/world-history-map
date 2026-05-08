import { lazy, Suspense, useCallback, useEffect, useState } from 'react';

const LicenseDisclaimer = lazy(() =>
  import('./components/legal/license-disclaimer').then((m) => ({ default: m.LicenseDisclaimer })),
);

import { prefetchYearDescriptions } from '@/domain/territory/description-loader';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useYearIndex } from '@/hooks/use-year-index';
import { ControlBar } from './components/control-bar/control-bar';
import { EraSummaryPanel } from './components/era-summary-panel/era-summary-panel';
import { SummaryTrigger } from './components/era-summary-panel/summary-trigger';
import { MapView } from './components/map/map-view';
import { TerritoryInfoPanel } from './components/territory-info/territory-info-panel';
import { YearSelector } from './components/year-selector/year-selector';
import { AppStateProvider, useAppState } from './contexts/app-state-context';
import { ProjectionProvider } from './contexts/projection-context';
import { initialAppState } from './types/app-state';

function AppContent() {
  const { state } = useAppState();
  const { years } = useYearIndex();
  const isMobile = useIsMobile();
  const [isLicenseOpen, setIsLicenseOpen] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    prefetchYearDescriptions(state.selectedYear);
  }, [state.selectedYear]);

  const handleOpenLicense = useCallback(() => {
    setIsLicenseOpen(true);
  }, []);

  const handleCloseLicense = useCallback(() => {
    setIsLicenseOpen(false);
  }, []);

  const handleMapReady = useCallback(() => {
    setIsMapReady(true);
  }, []);

  return (
    <main className="relative h-dvh w-screen overflow-hidden select-none">
      <MapView onReady={handleMapReady} />
      {isMapReady && (
        <>
          <TerritoryInfoPanel />
          <EraSummaryPanel />
          {isMobile ? (
            <div className="absolute bottom-20 right-4 z-30">
              <SummaryTrigger />
            </div>
          ) : (
            <div className="absolute left-4 top-4 z-30">
              <SummaryTrigger />
            </div>
          )}
          <ControlBar onOpenLicense={handleOpenLicense} />
        </>
      )}
      {isMapReady && years.length > 0 && (
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
  const isMobile = useIsMobile();

  return (
    <AppStateProvider initialState={{ ...initialAppState, isSummaryPanelOpen: !isMobile }}>
      <ProjectionProvider>
        <AppContent />
      </ProjectionProvider>
    </AppStateProvider>
  );
}

export default App;
