// R2 に置いたハッシュ付きアセット（ベースマップ・都市データ）を Range 対応で返す

const KEY_PATTERN = /^data\/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/;

export type ByteRange = { start: number; end: number };

export function keyFromPath(pathname: string): string | null {
  const key = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  return KEY_PATTERN.test(key) ? key : null;
}

export function resolveRange(range: R2Range | undefined, size: number): ByteRange | null {
  if (range === undefined || size === 0) {
    return null;
  }
  if ("suffix" in range) {
    const length = Math.min(range.suffix, size);
    return { start: size - length, end: size - 1 };
  }
  const start = range.offset ?? 0;
  const end = range.length === undefined ? size - 1 : Math.min(start + range.length, size) - 1;
  return { start, end };
}

function metadataHeaders(object: R2Object): Headers {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Accept-Ranges", "bytes");
  return headers;
}

export async function serveFromBucket(request: Request, bucket: R2Bucket): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  const key = keyFromPath(new URL(request.url).pathname);
  if (key === null) {
    return new Response(null, { status: 404 });
  }

  if (request.method === "HEAD") {
    const object = await bucket.head(key);
    if (object === null) {
      return new Response(null, { status: 404 });
    }
    const headers = metadataHeaders(object);
    headers.set("Content-Length", String(object.size));
    return new Response(null, { status: 200, headers });
  }

  const hasRange = request.headers.has("Range");
  let object: R2ObjectBody | R2Object | null;
  try {
    object = await bucket.get(key, { range: request.headers, onlyIf: request.headers });
  } catch (error) {
    // R2 は満たせない Range を例外で知らせるので、サイズを調べて 416 にする
    if (!hasRange) {
      throw error;
    }
    const head = await bucket.head(key);
    if (head === null) {
      return new Response(null, { status: 404 });
    }
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${head.size}` },
    });
  }
  if (object === null) {
    return new Response(null, { status: 404 });
  }

  const headers = metadataHeaders(object);
  if (!("body" in object)) {
    // onlyIf の条件を満たさなかったので本文が無い
    const notModified =
      request.headers.has("If-None-Match") || request.headers.has("If-Modified-Since");
    return new Response(null, { status: notModified ? 304 : 412, headers });
  }

  const range = hasRange ? resolveRange(object.range, object.size) : null;
  if (range === null) {
    headers.set("Content-Length", String(object.size));
    return new Response(object.body, { status: 200, headers });
  }
  headers.set("Content-Range", `bytes ${range.start}-${range.end}/${object.size}`);
  headers.set("Content-Length", String(range.end - range.start + 1));
  return new Response(object.body, { status: 206, headers });
}
