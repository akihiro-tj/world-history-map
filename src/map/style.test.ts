import { describe, expect, it } from "vitest";
import { buildStyle, CITY_HIT_LAYER_ID, type MapColors, readMapColors } from "./style";

const colors: MapColors = {
  ocean: "#dce8f0",
  land: "#f5f3ec",
  coastline: "#8a9aa6",
  city: "#b4462b",
  citySelected: "#1f3a5f",
};

function fakeStyle(values: Record<string, string>) {
  return { getPropertyValue: (name: string) => values[name] ?? "" };
}

describe("readMapColors", () => {
  it("CSS 変数から地図の色を読む（前後の空白は除く）", () => {
    expect(
      readMapColors(
        fakeStyle({
          "--color-ocean": " #dce8f0",
          "--color-land": "#f5f3ec",
          "--color-coastline": "#8a9aa6",
          "--color-city": "#b4462b",
          "--color-city-selected": "#1f3a5f",
        }),
      ),
    ).toEqual(colors);
  });

  it("変数が空なら、どの変数かを示して例外にする", () => {
    expect(() => readMapColors(fakeStyle({ "--color-ocean": "#fff" }))).toThrow("--color-land");
  });
});

describe("buildStyle", () => {
  const style = buildStyle("https://example.com/tiles/world.abc.pmtiles", colors);

  it("ベースマップを pmtiles:// で参照する", () => {
    expect(style.sources.basemap).toEqual({
      type: "vector",
      url: "pmtiles://https://example.com/tiles/world.abc.pmtiles",
    });
  });

  it("文字を描かないので glyphs と symbol レイヤーを持たない", () => {
    expect(style.glyphs).toBeUndefined();
    expect(style.layers.some((layer) => layer.type === "symbol")).toBe(false);
  });

  it("都市のソースは id を feature id として使う", () => {
    expect(style.sources.cities).toMatchObject({ type: "geojson", promoteId: "id" });
  });

  it("海・陸・海岸線・都市・当たり判定の順に重ねる", () => {
    expect(style.layers.map((layer) => layer.id)).toEqual([
      "ocean",
      "land",
      "coastline",
      "cities",
      CITY_HIT_LAYER_ID,
    ]);
  });
});
