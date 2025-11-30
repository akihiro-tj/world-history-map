import type { StyleSpecification } from 'maplibre-gl';

/**
 * 地図のデフォルト設定
 */
export const MAP_CONFIG = {
  /** 初期経度 */
  initialLongitude: 0,
  /** 初期緯度 */
  initialLatitude: 30,
  /** 初期ズームレベル */
  initialZoom: 2,
  /** 最小ズームレベル */
  minZoom: 1,
  /** 最大ズームレベル */
  maxZoom: 10,
} as const;

/**
 * 領土レイヤーのID
 */
export const LAYER_IDS = {
  /** 領土塗りつぶしレイヤー */
  territoryFill: 'territory-fill',
  /** 領土境界線レイヤー */
  territoryBorder: 'territory-border',
  /** 領土ラベルレイヤー */
  territoryLabel: 'territory-label',
} as const;

/**
 * PMTilesのソースID
 */
export const SOURCE_ID = 'territories';

/**
 * ベース地図スタイルを生成
 *
 * historical-basemapsのPMTilesを表示するためのMapLibreスタイル。
 * 領土の塗りつぶしと境界線を含む。
 *
 * @param pmtilesUrl PMTilesファイルのURL（pmtiles://スキームを使用）
 * @returns MapLibreスタイル仕様
 *
 * @example
 * ```ts
 * const style = createMapStyle('pmtiles:///pmtiles/world_1650.pmtiles');
 * <Map mapStyle={style} />
 * ```
 */
export function createMapStyle(pmtilesUrl: string): StyleSpecification {
  return {
    version: 8,
    name: 'World History Atlas',
    sources: {
      [SOURCE_ID]: {
        type: 'vector',
        url: pmtilesUrl,
      },
    },
    layers: [
      // 背景色（海洋）
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': '#b3d1ff',
        },
      },
      // 領土塗りつぶし
      {
        id: LAYER_IDS.territoryFill,
        type: 'fill',
        source: SOURCE_ID,
        'source-layer': 'territories',
        paint: {
          // 暫定的な塗りつぶし色（color-scheme.tsで上書き予定）
          'fill-color': '#d4e6d4',
          'fill-opacity': 0.8,
        },
      },
      // 領土境界線
      {
        id: LAYER_IDS.territoryBorder,
        type: 'line',
        source: SOURCE_ID,
        'source-layer': 'territories',
        paint: {
          'line-color': '#666666',
          'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.5, 5, 1, 10, 2],
          'line-opacity': 0.7,
        },
      },
      // 領土ラベル
      {
        id: LAYER_IDS.territoryLabel,
        type: 'symbol',
        source: SOURCE_ID,
        'source-layer': 'territories',
        layout: {
          'text-field': ['get', 'NAME'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 2, 8, 5, 12, 10, 16],
          'text-max-width': 8,
          'text-anchor': 'center',
          'text-allow-overlap': false,
          'text-ignore-placement': false,
        },
        paint: {
          'text-color': '#333333',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
          'text-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.7, 5, 1],
        },
      },
    ],
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  };
}

/**
 * 地図の初期ビュー状態
 */
export const initialViewState = {
  longitude: MAP_CONFIG.initialLongitude,
  latitude: MAP_CONFIG.initialLatitude,
  zoom: MAP_CONFIG.initialZoom,
};
