// 起動時に manifest と都市データを読み込む。失敗しても例外は投げず、エラーの種類を返す
import { BASEMAP_ASSET, CITIES_ASSET } from "../assets/logicalAssets";
import { type AssetManifest, fetchManifest, resolveAssetUrl } from "../assets/manifest";
import { type City, parseCities } from "../data/city";

export type AppData = {
  basemapUrl: string | null;
  cities: City[] | null;
  basemapError: boolean;
  citiesError: boolean;
};

async function loadCities(
  fetchFn: typeof fetch,
  manifest: AssetManifest,
  origin: string,
): Promise<City[]> {
  const response = await fetchFn(resolveAssetUrl(manifest, CITIES_ASSET, origin));
  if (!response.ok) {
    throw new Error(`都市データの取得に失敗しました（${response.status}）`);
  }
  return parseCities(await response.json());
}

export async function loadAppData(fetchFn: typeof fetch, origin: string): Promise<AppData> {
  let manifest: AssetManifest;
  try {
    manifest = await fetchManifest(fetchFn);
  } catch (error) {
    console.error(error);
    return { basemapUrl: null, cities: null, basemapError: true, citiesError: true };
  }

  let basemapUrl: string | null = null;
  try {
    basemapUrl = resolveAssetUrl(manifest, BASEMAP_ASSET, origin);
  } catch (error) {
    console.error(error);
  }

  let cities: City[] | null = null;
  try {
    cities = await loadCities(fetchFn, manifest, origin);
  } catch (error) {
    console.error(error);
  }

  return { basemapUrl, cities, basemapError: basemapUrl === null, citiesError: cities === null };
}
