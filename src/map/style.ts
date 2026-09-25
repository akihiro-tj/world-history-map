// MapLibre のスタイル。色は DESIGN.md から生成した CSS 変数から読む
import type { StyleSpecification } from "maplibre-gl";

export const BASEMAP_SOURCE_ID = "basemap";
export const CITIES_SOURCE_ID = "cities";
export const CITY_LAYER_ID = "cities";
// 見た目の点より広い、透明な当たり判定
export const CITY_HIT_LAYER_ID = "cities-hit";

export type MapColors = {
  ocean: string;
  land: string;
  coastline: string;
  boundary: string;
  city: string;
  citySelected: string;
};

const COLOR_VARIABLES: Record<keyof MapColors, string> = {
  ocean: "--color-ocean",
  land: "--color-land",
  coastline: "--color-coastline",
  boundary: "--color-boundary",
  city: "--color-city",
  citySelected: "--color-city-selected",
};

export function readMapColors(style: Pick<CSSStyleDeclaration, "getPropertyValue">): MapColors {
  const read = (name: string): string => {
    const value = style.getPropertyValue(name).trim();
    if (value === "") {
      throw new Error(`CSS 変数 ${name} が空です。pnpm tokens を実行したか確認してください`);
    }
    return value;
  };
  return {
    ocean: read(COLOR_VARIABLES.ocean),
    land: read(COLOR_VARIABLES.land),
    coastline: read(COLOR_VARIABLES.coastline),
    boundary: read(COLOR_VARIABLES.boundary),
    city: read(COLOR_VARIABLES.city),
    citySelected: read(COLOR_VARIABLES.citySelected),
  };
}

export function buildStyle(basemapUrl: string, colors: MapColors): StyleSpecification {
  return {
    version: 8,
    sources: {
      [BASEMAP_SOURCE_ID]: { type: "vector", url: `pmtiles://${basemapUrl}` },
      [CITIES_SOURCE_ID]: {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        promoteId: "id",
      },
    },
    layers: [
      { id: "ocean", type: "background", paint: { "background-color": colors.ocean } },
      {
        id: "land",
        type: "fill",
        source: BASEMAP_SOURCE_ID,
        "source-layer": "land",
        paint: { "fill-color": colors.land },
      },
      // 現在の国境線。係争線（disputed）は破線にする。disputed が無い線は実線で描く
      {
        id: "boundary",
        type: "line",
        source: BASEMAP_SOURCE_ID,
        "source-layer": "boundary",
        filter: ["!=", ["get", "disputed"], true],
        paint: { "line-color": colors.boundary, "line-width": 0.6 },
      },
      {
        id: "boundary-disputed",
        type: "line",
        source: BASEMAP_SOURCE_ID,
        "source-layer": "boundary",
        filter: ["==", ["get", "disputed"], true],
        paint: { "line-color": colors.boundary, "line-width": 0.6, "line-dasharray": [3, 2] },
      },
      {
        id: "coastline",
        type: "line",
        source: BASEMAP_SOURCE_ID,
        "source-layer": "coastline",
        paint: { "line-color": colors.coastline, "line-width": 0.8 },
      },
      {
        id: CITY_LAYER_ID,
        type: "circle",
        source: CITIES_SOURCE_ID,
        paint: {
          "circle-radius": ["case", ["boolean", ["feature-state", "selected"], false], 8, 5],
          "circle-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            colors.citySelected,
            colors.city,
          ],
          "circle-stroke-color": colors.land,
          "circle-stroke-width": 1.5,
        },
      },
      {
        id: CITY_HIT_LAYER_ID,
        type: "circle",
        source: CITIES_SOURCE_ID,
        paint: { "circle-radius": 16, "circle-opacity": 0 },
      },
    ],
  };
}
