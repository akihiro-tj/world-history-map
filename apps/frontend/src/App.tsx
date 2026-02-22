import { lazy, Suspense, useCallback, useEffect, useState } from 'react';

const LicenseDisclaimer = lazy(() =>
  import('./components/legal/license-disclaimer').then((m) => ({ default: m.LicenseDisclaimer })),
);

import { ControlBar } from './components/control-bar/control-bar';
import type { ProjectionType } from './components/map/map-view';
import { MapView } from './components/map/map-view';
import { prefetchYearDescriptions } from './components/territory-info/hooks/use-territory-description';
import { TerritoryInfoPanel } from './components/territory-info/territory-info-panel';
import { YearDisplay } from './components/year-display/year-display';
import { YearSelector } from './components/year-selector/year-selector';
import { AppStateProvider, useAppState } from './contexts/app-state-context';
import { useYearIndex } from './hooks/use-year-index';

function AppContent() {
  const { state } = useAppState();
  const { years, isLoading } = useYearIndex();
  const [isLicenseOpen, setIsLicenseOpen] = useState(false);
  const [projection, setProjection] = useState<ProjectionType>('mercator');
  const [setProjectionFn, setSetProjectionFn] = useState<((p: ProjectionType) => void) | null>(
    null,
  );

  useEffect(() => {
    prefetchYearDescriptions(state.selectedYear);
  }, [state.selectedYear]);

  const handleOpenLicense = useCallback(() => {
    setIsLicenseOpen(true);
  }, []);

  const handleCloseLicense = useCallback(() => {
    setIsLicenseOpen(false);
  }, []);

  const handleProjectionReady = useCallback(
    (proj: ProjectionType, setter: (p: ProjectionType) => void) => {
      setProjection(proj);
      setSetProjectionFn(() => setter);
    },
    [],
  );

  const handleToggleProjection = useCallback(
    (p: ProjectionType) => {
      setProjectionFn?.(p);
    },
    [setProjectionFn],
  );

  return (
    <main className="relative h-dvh w-screen overflow-hidden">
      <MapView onProjectionReady={handleProjectionReady} />
      <TerritoryInfoPanel />
      <div className="absolute top-4 left-1/2 z-20 -translate-x-1/2">
        <YearDisplay year={state.selectedYear} />
      </div>
      <ControlBar
        projection={projection}
        onToggleProjection={handleToggleProjection}
        onOpenLicense={handleOpenLicense}
      />
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
      <AppContent />
    </AppStateProvider>
  );
}

export default App;
