import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contentTypeFor, hashedKey, IMMUTABLE_CACHE_CONTROL, R2_BUCKET } from "./assetKeys";

describe("hashedKey", () => {
  const content = new TextEncoder().encode("hello");
  const hash12 = createHash("sha256").update(content).digest("hex").slice(0, 12);

  it("拡張子の直前に sha256 の先頭 12 桁を挟む", () => {
    expect(hashedKey("tiles/world.pmtiles", content)).toBe(`tiles/world.${hash12}.pmtiles`);
    expect(hashedKey("data/cities.json", content)).toBe(`data/cities.${hash12}.json`);
  });

  it("内容が変わればキーも変わる", () => {
    const other = new TextEncoder().encode("hello!");
    expect(hashedKey("data/cities.json", other)).not.toBe(hashedKey("data/cities.json", content));
  });

  it("拡張子の無いパスは例外にする", () => {
    expect(() => hashedKey("tiles/world", content)).toThrow();
  });
});

describe("contentTypeFor", () => {
  it("拡張子から Content-Type を決める", () => {
    expect(contentTypeFor("tiles/world.pmtiles")).toBe("application/vnd.pmtiles");
    expect(contentTypeFor("data/cities.json")).toBe("application/json; charset=utf-8");
  });

  it("知らない拡張子は例外にする", () => {
    expect(() => contentTypeFor("data/cities.csv")).toThrow();
  });
});

describe("設定の整合", () => {
  it("R2 のキャッシュ設定は immutable の長期キャッシュ", () => {
    expect(IMMUTABLE_CACHE_CONTROL).toBe("public, max-age=31536000, immutable");
  });

  it("wrangler.jsonc のバケット名と一致する", () => {
    const wrangler = readFileSync("wrangler.jsonc", "utf8");
    expect(wrangler).toContain(`"bucket_name": "${R2_BUCKET}"`);
  });
});
