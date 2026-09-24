import { describe, expect, it } from "vitest";
import { loadAppData } from "./loadAppData";

const ORIGIN = "https://example.com";
const manifest = {
  "data/basemap.pmtiles": "/data/basemap.abc.pmtiles",
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
  it("manifest と都市データを読めたらベースマップの URL と都市を返す", async () => {
    const data = await loadAppData(
      fakeFetch({
        "/asset-manifest.json": () => Response.json(manifest),
        "/data/cities.def.json": () => Response.json(cities),
      }),
      ORIGIN,
    );
    expect(data).toEqual({
      basemapUrl: "https://example.com/data/basemap.abc.pmtiles",
      cities,
      basemapError: false,
      citiesError: false,
    });
  });

  it("manifest が読めなければ、両方をエラーにして例外は投げない", async () => {
    const data = await loadAppData(fakeFetch({}), ORIGIN);
    expect(data).toEqual({ basemapUrl: null, cities: null, basemapError: true, citiesError: true });
  });

  it("都市データが 404 なら都市だけをエラーにする", async () => {
    const data = await loadAppData(
      fakeFetch({
        "/asset-manifest.json": () => Response.json(manifest),
        "/data/cities.def.json": () => new Response(null, { status: 404 }),
      }),
      ORIGIN,
    );
    expect(data.basemapUrl).toBe("https://example.com/data/basemap.abc.pmtiles");
    expect(data.cities).toBeNull();
    expect(data.citiesError).toBe(true);
    expect(data.basemapError).toBe(false);
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
