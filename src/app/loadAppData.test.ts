import { describe, expect, it } from "vitest";
import { loadAppData } from "./loadAppData";

const ORIGIN = "https://example.com";
const manifest = {
  "tiles/world.pmtiles": "/tiles/world.abc.pmtiles",
  "data/cities.json": "/data/cities.def.json",
};
const cities = [
  {
    id: "bukhara",
    name: "ブハラ",
    reading: "ぶはら",
    type: "city",
    lon: 64.4286,
    lat: 39.7747,
    source: "https://ja.wikipedia.org/wiki/ブハラ",
  },
];

function fakeFetch(routes: Record<string, () => Response>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input).replace(ORIGIN, "");
    const route = routes[url];
    if (!route) {
      throw new TypeError(`ネットワークエラー: ${url}`);
    }
    return route();
  }) as typeof fetch;
}

describe("loadAppData", () => {
  it("manifest と都市データを読めたらタイル URL と都市を返す", async () => {
    const data = await loadAppData(
      fakeFetch({
        "/asset-manifest.json": () => Response.json(manifest),
        "/data/cities.def.json": () => Response.json(cities),
      }),
      ORIGIN,
    );
    expect(data).toEqual({
      tilesUrl: "https://example.com/tiles/world.abc.pmtiles",
      cities,
      tilesError: false,
      citiesError: false,
    });
  });

  it("manifest が読めなければ、両方をエラーにして例外は投げない", async () => {
    const data = await loadAppData(fakeFetch({}), ORIGIN);
    expect(data).toEqual({ tilesUrl: null, cities: null, tilesError: true, citiesError: true });
  });

  it("都市データが 404 なら都市だけをエラーにする", async () => {
    const data = await loadAppData(
      fakeFetch({
        "/asset-manifest.json": () => Response.json(manifest),
        "/data/cities.def.json": () => new Response(null, { status: 404 }),
      }),
      ORIGIN,
    );
    expect(data.tilesUrl).toBe("https://example.com/tiles/world.abc.pmtiles");
    expect(data.cities).toBeNull();
    expect(data.citiesError).toBe(true);
    expect(data.tilesError).toBe(false);
  });

  it("都市データの形式が不正なら都市だけをエラーにする", async () => {
    const data = await loadAppData(
      fakeFetch({
        "/asset-manifest.json": () => Response.json(manifest),
        "/data/cities.def.json": () => Response.json([{ id: "x" }]),
      }),
      ORIGIN,
    );
    expect(data.citiesError).toBe(true);
  });
});
