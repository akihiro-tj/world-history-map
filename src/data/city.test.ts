import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCities } from "./city";

const valid = {
  id: "samarkand",
  name: "サマルカンド",
  reading: "さまるかんど",
  type: "city",
  lon: 66.9597,
  lat: 39.6542,
  source: "https://ja.wikipedia.org/wiki/サマルカンド",
};

describe("parseCities", () => {
  it("正しいデータをそのまま返す", () => {
    expect(parseCities([valid])).toEqual([valid]);
  });

  it("配列でなければ例外にする", () => {
    expect(() => parseCities({})).toThrow("配列");
  });

  it("id の重複を例外にする", () => {
    expect(() => parseCities([valid, valid])).toThrow("重複");
  });

  it("読みにカタカナが入っていたら例外にする", () => {
    expect(() => parseCities([{ ...valid, reading: "サマルカンド" }])).toThrow("reading");
  });

  it("読みは長音符と半角空白区切りを許す", () => {
    expect(parseCities([{ ...valid, reading: "えみーる" }])).toHaveLength(1);
    expect(parseCities([{ ...valid, reading: "くちゃ きじ" }])).toHaveLength(1);
  });

  it("経度・緯度の範囲外を例外にする", () => {
    expect(() => parseCities([{ ...valid, lon: 181 }])).toThrow("lon");
    expect(() => parseCities([{ ...valid, lat: -91 }])).toThrow("lat");
  });

  it("空の名前・出典なし・知らないキーを例外にする", () => {
    expect(() => parseCities([{ ...valid, name: " " }])).toThrow("name");
    expect(() => parseCities([{ ...valid, source: "" }])).toThrow("source");
    expect(() => parseCities([{ ...valid, note: "x" }])).toThrow("note");
  });

  it("type は city だけを許す", () => {
    expect(() => parseCities([{ ...valid, type: "river" }])).toThrow("type");
  });
});

describe("public/data/cities.json", () => {
  const cities = parseCities(JSON.parse(readFileSync("public/data/cities.json", "utf8")));

  it("MVP の 10 都市がそろっている", () => {
    expect(cities.map((city) => city.id).sort()).toEqual([
      "almaliq",
      "bukhara",
      "dadu",
      "dunhuang",
      "emil",
      "karakorum",
      "kucha",
      "samarkand",
      "sarai",
      "tabriz",
    ]);
  });

  it("表示名が spec §2 のとおり", () => {
    expect(Object.fromEntries(cities.map((city) => [city.id, city.name]))).toEqual({
      samarkand: "サマルカンド",
      bukhara: "ブハラ",
      dunhuang: "敦煌",
      kucha: "クチャ（亀茲）",
      karakorum: "カラコルム（和林）",
      dadu: "大都",
      emil: "エミール",
      almaliq: "アルマリク",
      sarai: "サライ",
      tabriz: "タブリーズ",
    });
  });
});
