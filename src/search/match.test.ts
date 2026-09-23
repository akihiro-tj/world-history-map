import { describe, expect, it } from "vitest";
import type { City } from "../data/city";
import { MAX_SUGGESTIONS, normalizeForSearch, searchCities } from "./match";

function city(id: string, name: string, reading: string): City {
  return { id, name, reading, type: "city", lon: 0, lat: 0, source: "https://example.com" };
}

const cities = [
  city("samarkand", "サマルカンド", "さまるかんど"),
  city("bukhara", "ブハラ", "ぶはら"),
  city("kucha", "クチャ（亀茲）", "くちゃ きじ"),
  city("lhasa", "ラサ", "らさ"),
];

describe("normalizeForSearch", () => {
  it("ひらがなをカタカナにし、半角カナを全角にし、空白を除く", () => {
    expect(normalizeForSearch("さま")).toBe("サマ");
    expect(normalizeForSearch("ｻﾏ")).toBe("サマ");
    expect(normalizeForSearch(" サ　マ ")).toBe("サマ");
  });
});

describe("searchCities", () => {
  it("ひらがな・カタカナ・半角カナのどれでも同じ都市が見つかる", () => {
    for (const query of ["さま", "サマ", "ｻﾏ", " さま "]) {
      expect(searchCities(cities, query).map((c) => c.id)).toEqual(["samarkand"]);
    }
  });

  it("表示名に含まれる漢字でも見つかる", () => {
    expect(searchCities(cities, "亀").map((c) => c.id)).toEqual(["kucha"]);
  });

  it("2 つ目の読みでも見つかる", () => {
    expect(searchCities(cities, "きじ").map((c) => c.id)).toEqual(["kucha"]);
  });

  it("前方一致を部分一致より前に並べる", () => {
    expect(searchCities(cities, "ら").map((c) => c.id)).toEqual(["lhasa", "bukhara"]);
  });

  it("空・空白だけの入力は候補を返さない", () => {
    expect(searchCities(cities, "")).toEqual([]);
    expect(searchCities(cities, "　 ")).toEqual([]);
  });

  it("一致しなければ空配列を返す", () => {
    expect(searchCities(cities, "ろーま")).toEqual([]);
  });

  it(`候補は最大 ${MAX_SUGGESTIONS} 件`, () => {
    const many = Array.from({ length: 12 }, (_, i) => city(`c${i}`, `サ${i}`, "さ"));
    expect(searchCities(many, "さ")).toHaveLength(MAX_SUGGESTIONS);
  });
});
