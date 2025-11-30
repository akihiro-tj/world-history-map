import { MapView } from './components/map/map-view';
import { AppStateProvider } from './contexts/app-state-context';

/**
 * Main application component
 *
 * Renders the interactive historical world map.
 * Default view shows territories from 1650.
 */
function App() {
  return (
    <AppStateProvider>
      <main className="h-screen w-screen overflow-hidden">
        <MapView />
      </main>
    </AppStateProvider>
  );
}

export default App;
