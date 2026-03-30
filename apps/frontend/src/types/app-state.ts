import {
  createHistoricalYear,
  type HistoricalYear,
  INITIAL_YEAR,
} from '../domain/year/historical-year';
import { MAP_CONFIG } from '../styles/map-style';

export interface MapView {
  longitude: number;
  latitude: number;
  zoom: number;
}

export interface AppState {
  selectedYear: HistoricalYear;
  selectedTerritory: string | null;
  isInfoPanelOpen: boolean;
  mapView: MapView;
}

export const initialAppState: AppState = {
  selectedYear: createHistoricalYear(INITIAL_YEAR),
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
  setMapView: (view: MapView) => void;
}
