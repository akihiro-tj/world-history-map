// 起動時に manifest と都市データを読み込む。失敗しても例外は投げず、エラーの種類を返す
import { CITIES_ASSET, TILES_ASSET } from "../assets/logicalAssets";
import { type AssetManifest, fetchManifest, resolveAssetUrl } from "../assets/manifest";
import { type City, parseCities } from "../data/city";

export type AppData = {
  tilesUrl: string | null;
  cities: City[] | null;
  tilesError: boolean;
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
    return { tilesUrl: null, cities: null, tilesError: true, citiesError: true };
  }

  let tilesUrl: string | null = null;
  try {
    tilesUrl = resolveAssetUrl(manifest, TILES_ASSET, origin);
  } catch (error) {
    console.error(error);
  }

  let cities: City[] | null = null;
  try {
    cities = await loadCities(fetchFn, manifest, origin);
  } catch (error) {
    console.error(error);
  }

  return { tilesUrl, cities, tilesError: tilesUrl === null, citiesError: cities === null };
}
