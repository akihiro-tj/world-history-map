import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { devManifest, handleManifestRequest } from "./assetManifestDev";

describe("devManifest", () => {
  it("論理名をそのままローカルパスに対応させる", () => {
    expect(devManifest()).toEqual({
      "tiles/world.pmtiles": "/tiles/world.pmtiles",
      "data/cities.json": "/data/cities.json",
    });
  });
});

describe("handleManifestRequest", () => {
  function fakeResponse() {
    const headers: Record<string, string> = {};
    return {
      headers,
      body: "",
      setHeader(name: string, value: string) {
        headers[name] = value;
      },
      end(chunk: string) {
        this.body = chunk;
      },
    };
  }

  it("/asset-manifest.json に開発用の manifest を返す", () => {
    const res = fakeResponse();
    const next = vi.fn();
    handleManifestRequest(
      { url: "/asset-manifest.json?t=1" } as IncomingMessage,
      res as unknown as ServerResponse,
      next,
    );
    expect(next).not.toHaveBeenCalled();
    expect(JSON.parse(res.body)).toEqual(devManifest());
    expect(res.headers["Content-Type"]).toBe("application/json");
    expect(res.headers["Cache-Control"]).toBe("no-cache");
  });

  it("それ以外のパスは次のミドルウェアに渡す", () => {
    const next = vi.fn();
    handleManifestRequest(
      { url: "/index.html" } as IncomingMessage,
      fakeResponse() as unknown as ServerResponse,
      next,
    );
    expect(next).toHaveBeenCalledOnce();
  });
});
