import { MAP_CONFIG } from '../styles/map-style';

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

export interface AppState {
  selectedYear: number;
  selectedTerritory: string | null;
  isInfoPanelOpen: boolean;
  mapView: MapViewState;
  isLoading: boolean;
  error: string | null;
}

export const initialAppState: AppState = {
  selectedYear: MAP_CONFIG.initialYear,
  selectedTerritory: null,
  isInfoPanelOpen: false,
  mapView: {
    longitude: MAP_CONFIG.initialLongitude,
    latitude: MAP_CONFIG.initialLatitude,
    zoom: MAP_CONFIG.initialZoom,
  },
  isLoading: false,
  error: null,
};

export interface AppStateActions {
  setSelectedYear: (year: number) => void;
  selectTerritory: (territory: string) => void;
  clearSelection: () => void;
  setMapView: (view: MapViewState) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}
