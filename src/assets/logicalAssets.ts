// デプロイ時にハッシュ付きで R2 に置くアセットの論理名（public/ からの相対パス）
export const BASEMAP_ASSET = "data/basemap.pmtiles";
export const CITIES_ASSET = "data/cities.json";
export const LOGICAL_ASSET_PATHS = [BASEMAP_ASSET, CITIES_ASSET] as const;
