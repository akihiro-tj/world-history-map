import { describe, expect, it, vi } from "vitest";
import { keyFromPath, resolveRange, serveFromBucket } from "./serve";

const CONTENT = "0123456789";
const SIZE = CONTENT.length;

type FakeOptions = { range?: R2Range; withBody?: boolean };

function fakeObject({ range, withBody = true }: FakeOptions = {}): R2Object | R2ObjectBody {
  const base = {
    key: "data/basemap.abc123abc123.pmtiles",
    size: SIZE,
    etag: "etag-1",
    httpEtag: '"etag-1"',
    range,
    writeHttpMetadata(headers: Headers) {
      headers.set("Content-Type", "application/vnd.pmtiles");
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    },
  };
  if (!withBody) {
    return base as unknown as R2Object;
  }
  const resolved = resolveRange(range, SIZE);
  const text = resolved ? CONTENT.slice(resolved.start, resolved.end + 1) : CONTENT;
  return { ...base, body: new Response(text).body } as unknown as R2ObjectBody;
}

type FakeBucket = { get: ReturnType<typeof vi.fn>; head: ReturnType<typeof vi.fn> };

function fakeBucket(overrides: Partial<FakeBucket> = {}): FakeBucket & R2Bucket {
  const bucket: FakeBucket = {
    get: vi.fn(async () => fakeObject()),
    head: vi.fn(async () => fakeObject({ withBody: false })),
    ...overrides,
  };
  return bucket as unknown as FakeBucket & R2Bucket;
}

function request(path: string, init: RequestInit = {}) {
  return new Request(`https://example.com${path}`, init);
}

describe("keyFromPath", () => {
  it("data/ 配下のファイル名だけをキーとして返す", () => {
    expect(keyFromPath("/data/basemap.abc123abc123.pmtiles")).toBe(
      "data/basemap.abc123abc123.pmtiles",
    );
    expect(keyFromPath("/data/cities.abc123abc123.json")).toBe("data/cities.abc123abc123.json");
  });

  it("それ以外のパスは null を返す", () => {
    expect(keyFromPath("/")).toBeNull();
    expect(keyFromPath("/index.html")).toBeNull();
    expect(keyFromPath("/data/")).toBeNull();
    expect(keyFromPath("/data/a/b.pmtiles")).toBeNull();
    expect(keyFromPath("/data/..pmtiles")).toBeNull();
    expect(keyFromPath("/tiles/world.abc123abc123.pmtiles")).toBeNull();
  });
});

describe("resolveRange", () => {
  it("offset と length から終端を計算する", () => {
    expect(resolveRange({ offset: 2, length: 3 }, SIZE)).toEqual({ start: 2, end: 4 });
  });

  it("length が無ければ末尾までにする", () => {
    expect(resolveRange({ offset: 7 }, SIZE)).toEqual({ start: 7, end: 9 });
  });

  it("suffix は末尾からの長さとして扱い、サイズを超えたら全体にする", () => {
    expect(resolveRange({ suffix: 4 }, SIZE)).toEqual({ start: 6, end: 9 });
    expect(resolveRange({ suffix: 100 }, SIZE)).toEqual({ start: 0, end: 9 });
  });

  it("length がサイズを超えたら末尾で切る", () => {
    expect(resolveRange({ offset: 8, length: 100 }, SIZE)).toEqual({ start: 8, end: 9 });
  });

  it("range が無いか、サイズが 0 なら null を返す", () => {
    expect(resolveRange(undefined, SIZE)).toBeNull();
    expect(resolveRange({ offset: 0, length: 1 }, 0)).toBeNull();
  });
});

describe("serveFromBucket", () => {
  it("GET と HEAD 以外は 405 を返す", async () => {
    const response = await serveFromBucket(
      request("/data/basemap.abc123abc123.pmtiles", { method: "POST" }),
      fakeBucket(),
    );
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET, HEAD");
  });

  it("対象外のパスは R2 を見ずに 404 を返す", async () => {
    const bucket = fakeBucket();
    const response = await serveFromBucket(request("/secret.txt"), bucket);
    expect(response.status).toBe(404);
    expect(bucket.get).not.toHaveBeenCalled();
  });

  it("Range が無い GET は 200 で全体を返す", async () => {
    const bucket = fakeBucket();
    const response = await serveFromBucket(request("/data/basemap.abc123abc123.pmtiles"), bucket);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(CONTENT);
    expect(response.headers.get("Content-Length")).toBe(String(SIZE));
    expect(response.headers.get("ETag")).toBe('"etag-1"');
    expect(response.headers.get("Accept-Ranges")).toBe("bytes");
    expect(response.headers.get("Content-Type")).toBe("application/vnd.pmtiles");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
  });

  it("リクエストヘッダーを range と onlyIf にそのまま渡す", async () => {
    const bucket = fakeBucket();
    const req = request("/data/basemap.abc123abc123.pmtiles", { headers: { Range: "bytes=0-3" } });
    await serveFromBucket(req, bucket);
    expect(bucket.get).toHaveBeenCalledWith("data/basemap.abc123abc123.pmtiles", {
      range: req.headers,
      onlyIf: req.headers,
    });
  });

  it("Range 付きの GET は 206 と Content-Range を返す", async () => {
    const bucket = fakeBucket({
      get: vi.fn(async () => fakeObject({ range: { offset: 0, length: 4 } })),
    });
    const response = await serveFromBucket(
      request("/data/basemap.abc123abc123.pmtiles", { headers: { Range: "bytes=0-3" } }),
      bucket,
    );
    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe(`bytes 0-3/${SIZE}`);
    expect(response.headers.get("Content-Length")).toBe("4");
    expect(await response.text()).toBe("0123");
  });

  it("suffix の Range も 206 で返す", async () => {
    const bucket = fakeBucket({ get: vi.fn(async () => fakeObject({ range: { suffix: 4 } })) });
    const response = await serveFromBucket(
      request("/data/basemap.abc123abc123.pmtiles", { headers: { Range: "bytes=-4" } }),
      bucket,
    );
    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe(`bytes 6-9/${SIZE}`);
  });

  it("R2 が Range を満たせず例外を投げたら 416 と全体サイズを返す", async () => {
    const bucket = fakeBucket({
      get: vi.fn(async () => {
        throw new Error("The requested range is not satisfiable");
      }),
    });
    const response = await serveFromBucket(
      request("/data/basemap.abc123abc123.pmtiles", { headers: { Range: "bytes=999-1000" } }),
      bucket,
    );
    expect(response.status).toBe(416);
    expect(response.headers.get("Content-Range")).toBe(`bytes */${SIZE}`);
  });

  it("Range が無いのに R2 が例外を投げたら、そのまま投げ直す", async () => {
    const bucket = fakeBucket({
      get: vi.fn(async () => {
        throw new Error("R2 の障害");
      }),
    });
    await expect(
      serveFromBucket(request("/data/basemap.abc123abc123.pmtiles"), bucket),
    ).rejects.toThrow("R2 の障害");
  });

  it("キーが無ければ 404 を返す", async () => {
    const bucket = fakeBucket({ get: vi.fn(async () => null) });
    const response = await serveFromBucket(request("/data/cities.abc123abc123.json"), bucket);
    expect(response.status).toBe(404);
  });

  it("If-None-Match の条件で本文が無ければ 304 を返す", async () => {
    const bucket = fakeBucket({ get: vi.fn(async () => fakeObject({ withBody: false })) });
    const response = await serveFromBucket(
      request("/data/basemap.abc123abc123.pmtiles", { headers: { "If-None-Match": '"etag-1"' } }),
      bucket,
    );
    expect(response.status).toBe(304);
    expect(response.headers.get("ETag")).toBe('"etag-1"');
  });

  it("If-Match の条件を満たさなければ 412 を返す", async () => {
    const bucket = fakeBucket({ get: vi.fn(async () => fakeObject({ withBody: false })) });
    const response = await serveFromBucket(
      request("/data/basemap.abc123abc123.pmtiles", { headers: { "If-Match": '"other"' } }),
      bucket,
    );
    expect(response.status).toBe(412);
  });

  it("HEAD は本文なしで 200 と Content-Length を返す", async () => {
    const bucket = fakeBucket();
    const response = await serveFromBucket(
      request("/data/basemap.abc123abc123.pmtiles", { method: "HEAD" }),
      bucket,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Length")).toBe(String(SIZE));
    expect(response.headers.get("Accept-Ranges")).toBe("bytes");
    expect(bucket.get).not.toHaveBeenCalled();
  });

  it("HEAD でキーが無ければ 404 を返す", async () => {
    const bucket = fakeBucket({ head: vi.fn(async () => null) });
    const response = await serveFromBucket(
      request("/data/basemap.abc123abc123.pmtiles", { method: "HEAD" }),
      bucket,
    );
    expect(response.status).toBe(404);
  });
});
