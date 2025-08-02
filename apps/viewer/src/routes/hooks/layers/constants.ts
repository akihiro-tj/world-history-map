import type { Color } from "@deck.gl/core";
import { hexToRgb } from "../../utils/hex-to-rgb";

const ASSET_BASE_URL = "https://d1qn6pwkdv9f28.cloudfront.net";
const REVISION = "26f1901b-cec5-48fe-94d1-3abdd4c80dd0";

export const LAND_TILE_SOURCE_URL = `${ASSET_BASE_URL}/tiles/${REVISION}/land.pmtiles`;
export const LAKE_TILE_SOURCE_URL = `${ASSET_BASE_URL}/tiles/${REVISION}/lake.pmtiles`;
export const LAND_TILE_LAYER_ID = "land-tile-layer";
export const LAKE_TILE_LAYER_ID = "lake-tile-layer";

export const COLOR_TRANSPARENT: Color = [0, 0, 0, 0];
export const COLOR_FOREGROUND: Color = hexToRgb("#f1f5f9");
export const COLOR_BACKGROUND: Color = hexToRgb("#94a3b8");

export const FILL_OPACITY = 0.8;

export const MOUNTAIN_TILE_SOURCE_URL = `${ASSET_BASE_URL}/tiles/${REVISION}/mountain.pmtiles`;
export const PLATEAU_TILE_SOURCE_URL = `${ASSET_BASE_URL}/tiles/${REVISION}/plateau.pmtiles`;
export const DESERT_TILE_SOURCE_URL = `${ASSET_BASE_URL}/tiles/${REVISION}/desert.pmtiles`;
export const ISLAND_TILE_SOURCE_URL = `${ASSET_BASE_URL}/tiles/${REVISION}/island.pmtiles`;
export const PENINSULA_TILE_SOURCE_URL = `${ASSET_BASE_URL}/tiles/${REVISION}/peninsula.pmtiles`;

export const MOUNTAIN_TILE_LAYER_ID = "mountain-tile-layer";
export const PLATEAU_TILE_LAYER_ID = "plateau-tile-layer";
export const DESERT_TILE_LAYER_ID = "desert-tile-layer";
export const ISLAND_TILE_LAYER_ID = "island-tile-layer";
export const PENINSULA_TILE_LAYER_ID = "peninsula-tile-layer";

export const COLOR_MOUNTAIN: Color = hexToRgb("#10b981");
export const COLOR_PLATEAU: Color = hexToRgb("#84cc16");
export const COLOR_DESERT: Color = hexToRgb("#f59e0b");
export const COLOR_ISLAND: Color = hexToRgb("#3b82f6");
export const COLOR_PENINSULA: Color = hexToRgb("#6366f1");
