import { MAP_CONFIG } from '../styles/map-style';
import { createHistoricalYear, type HistoricalYear } from './historical-year';

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

export interface AppState {
  selectedYear: HistoricalYear;
  selectedTerritory: string | null;
  isInfoPanelOpen: boolean;
  mapView: MapViewState;
}

export const initialAppState: AppState = {
  selectedYear: createHistoricalYear(MAP_CONFIG.initialYear),
  selectedTerritory: null,
  isInfoPanelOpen: false,
  mapView: {
    longitude: MAP_CONFIG.initialLongitude,
    latitude: MAP_CONFIG.initialLatitude,
    zoom: MAP_CONFIG.initialZoom,
  },
};

export interface AppStateActions {
  setSelectedYear: (year: HistoricalYear) => void;
  selectTerritory: (territory: string) => void;
  clearSelection: () => void;
  setMapView: (view: MapViewState) => void;
}
