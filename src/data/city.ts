// 都市データの型と、JSON を読み込むときの実行時検証

export type City = {
  id: string;
  name: string;
  reading: string;
  type: "city";
  lon: number;
  lat: number;
  source: string;
};

const ID_PATTERN = /^[a-z][a-z0-9-]*$/;
// ひらがな・長音符。複数の読みは半角空白 1 つで区切る
const READING_PATTERN = /^[ぁ-ゖー]+(?: [ぁ-ゖー]+)*$/;
const KEYS = new Set(["id", "name", "reading", "type", "lon", "lat", "source"]);

function inRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function parseCity(item: unknown, index: number): City {
  const fail = (reason: string): never => {
    throw new Error(`都市データ ${index + 1} 件目: ${reason}`);
  };
  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    return fail("オブジェクトではありません");
  }
  for (const key of Object.keys(item)) {
    if (!KEYS.has(key)) {
      fail(`知らないキー ${key} があります`);
    }
  }
  const { id, name, reading, type, lon, lat, source } = item as Record<string, unknown>;
  if (typeof id !== "string" || !ID_PATTERN.test(id)) return fail("id が不正です");
  if (typeof name !== "string" || name.trim() === "") return fail("name が空です");
  if (typeof reading !== "string" || !READING_PATTERN.test(reading)) {
    return fail("reading はひらがな・長音符・半角空白だけで書きます");
  }
  if (type !== "city") return fail("type は city だけです");
  if (!inRange(lon, -180, 180)) return fail("lon が範囲外です");
  if (!inRange(lat, -90, 90)) return fail("lat が範囲外です");
  if (typeof source !== "string" || !source.startsWith("https://")) {
    return fail("source には https の URL を書きます");
  }
  return { id, name, reading, type, lon, lat, source };
}

export function parseCities(value: unknown): City[] {
  if (!Array.isArray(value)) {
    throw new Error("都市データは配列である必要があります");
  }
  const ids = new Set<string>();
  return value.map((item, index) => {
    const city = parseCity(item, index);
    if (ids.has(city.id)) {
      throw new Error(`都市データの id が重複しています: ${city.id}`);
    }
    ids.add(city.id);
    return city;
  });
}
