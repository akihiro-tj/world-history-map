import "maplibre-gl/dist/maplibre-gl.css";
import { addProtocol, type GeoJSONSource, Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import { Protocol } from "pmtiles";
import { useEffect, useRef } from "react";
import type { City } from "../data/city";
import type { Bounds } from "./bounds";
import { citiesToGeoJSON } from "./citiesGeoJSON";
import {
  BASEMAP_SOURCE_ID,
  buildStyle,
  CITIES_SOURCE_ID,
  CITY_HIT_LAYER_ID,
  readMapColors,
} from "./style";

export type FocusRequest = { lon: number; lat: number; seq: number };

type MapViewProps = {
  tilesUrl: string;
  cities: readonly City[];
  initialBounds: Bounds;
  selectedId: string | null;
  focus: FocusRequest | null;
  onSelect: (id: string | null) => void;
  onTilesError: () => void;
  className?: string;
};

// 検索で選んだ都市へ移動するときの最小ズーム
const FOCUS_ZOOM = 5;

let pmtilesRegistered = false;
function registerPmtilesProtocol() {
  if (!pmtilesRegistered) {
    addProtocol("pmtiles", new Protocol().tile);
    if (import.meta.env.PROD) {
      // 本番ビルドでは Vite がワーカーの動的 URL 組み立てを解析できないため、
      // vite.config.ts (copyMaplibreWorker) が書き出した静的ファイルを直接指す
      setWorkerUrl(new URL(/* @vite-ignore */ "./maplibre-gl-worker.mjs", import.meta.url).href);
    }
    pmtilesRegistered = true;
  }
}

// スタイルの読み込みが終わってから地図を操作する
function whenStyleLoaded(map: MapLibreMap, action: () => void) {
  if (map.isStyleLoaded()) {
    action();
  } else {
    map.once("load", action);
  }
}

export function MapView({
  tilesUrl,
  cities,
  initialBounds,
  selectedId,
  focus,
  onSelect,
  onTilesError,
  className,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const selectedRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onSelect, onTilesError });
  callbacksRef.current = { onSelect, onTilesError };
  const initialBoundsRef = useRef(initialBounds);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    registerPmtilesProtocol();
    const map = new MapLibreMap({
      container,
      style: buildStyle(tilesUrl, readMapColors(getComputedStyle(document.documentElement))),
      bounds: initialBoundsRef.current,
      fitBoundsOptions: { padding: 48 },
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      maxPitch: 0,
    });
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();

    map.on("error", (event) => {
      if ((event as { sourceId?: string }).sourceId === BASEMAP_SOURCE_ID) {
        callbacksRef.current.onTilesError();
      }
    });
    map.on("click", (event) => {
      const [feature] = map.queryRenderedFeatures(event.point, { layers: [CITY_HIT_LAYER_ID] });
      const id = feature?.properties?.id;
      callbacksRef.current.onSelect(typeof id === "string" ? id : null);
    });
    map.on("mouseenter", CITY_HIT_LAYER_ID, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", CITY_HIT_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      selectedRef.current = null;
    };
  }, [tilesUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    whenStyleLoaded(map, () => {
      map.getSource<GeoJSONSource>(CITIES_SOURCE_ID)?.setData(citiesToGeoJSON(cities));
    });
  }, [cities]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    whenStyleLoaded(map, () => {
      const previous = selectedRef.current;
      if (previous !== null) {
        map.setFeatureState({ source: CITIES_SOURCE_ID, id: previous }, { selected: false });
      }
      if (selectedId !== null) {
        map.setFeatureState({ source: CITIES_SOURCE_ID, id: selectedId }, { selected: true });
      }
      selectedRef.current = selectedId;
    });
  }, [selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || focus === null) {
      return;
    }
    map.flyTo({ center: [focus.lon, focus.lat], zoom: Math.max(map.getZoom(), FOCUS_ZOOM) });
  }, [focus]);

  return <div ref={containerRef} className={className} />;
}
