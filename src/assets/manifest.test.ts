import { describe, expect, it, vi } from "vitest";
import { fetchManifest, parseManifest, resolveAssetUrl } from "./manifest";

describe("parseManifest", () => {
  it("論理名から / で始まるパスへの対応を受け付ける", () => {
    expect(parseManifest({ "tiles/world.pmtiles": "/tiles/world.abc.pmtiles" })).toEqual({
      "tiles/world.pmtiles": "/tiles/world.abc.pmtiles",
    });
  });

  it("オブジェクトでなければ例外にする", () => {
    expect(() => parseManifest([])).toThrow();
    expect(() => parseManifest(null)).toThrow();
  });

  it("値が文字列でないか / で始まらなければ例外にする", () => {
    expect(() => parseManifest({ a: 1 })).toThrow();
    expect(() => parseManifest({ a: "https://evil.example/x" })).toThrow();
  });
});

describe("resolveAssetUrl", () => {
  const manifest = { "tiles/world.pmtiles": "/tiles/world.abc.pmtiles" };

  it("同じオリジンの絶対 URL にする", () => {
    expect(resolveAssetUrl(manifest, "tiles/world.pmtiles", "https://example.com")).toBe(
      "https://example.com/tiles/world.abc.pmtiles",
    );
  });

  it("論理名が無ければ例外にする", () => {
    expect(() => resolveAssetUrl(manifest, "data/cities.json", "https://example.com")).toThrow(
      "data/cities.json",
    );
  });
});

describe("fetchManifest", () => {
  it("キャッシュを検証して取得する", async () => {
    const fetchFn = vi.fn(async () => Response.json({ a: "/a" }));
    await expect(fetchManifest(fetchFn)).resolves.toEqual({ a: "/a" });
    expect(fetchFn).toHaveBeenCalledWith("/asset-manifest.json", { cache: "no-cache" });
  });

  it("HTTP エラーなら例外にする", async () => {
    const fetchFn = vi.fn(async () => new Response(null, { status: 404 }));
    await expect(fetchManifest(fetchFn)).rejects.toThrow("404");
  });
});
