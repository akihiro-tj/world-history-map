interface Env {
  ALLOWED_ORIGINS?: string;
  BUCKET: R2Bucket;
}

function getAllowedOrigin(request: Request, env: Env): string {
  const requestOrigin = request.headers.get('Origin');
  if (typeof env.ALLOWED_ORIGINS === 'undefined' || !requestOrigin) {
    return '';
  }

  for (const pattern of env.ALLOWED_ORIGINS.split(',')) {
    if (pattern === '*') {
      return requestOrigin;
    }
    if (pattern === requestOrigin) {
      return requestOrigin;
    }
    if (pattern.includes('*')) {
      const regex: RegExp = new RegExp(`^${pattern.replace(/\./g, '\\.').replace('*', '[^.]+')}$`);
      if (regex.test(requestOrigin)) {
        return requestOrigin;
      }
    }
  }
  return '';
}

async function handleManifest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  cache: Cache,
): Promise<Response> {
  const allowedOrigin = getAllowedOrigin(request, env);

  const cached = await cache.match(request.url);
  if (cached) {
    const respHeaders = new Headers(cached.headers);
    if (allowedOrigin) respHeaders.set('Access-Control-Allow-Origin', allowedOrigin);
    respHeaders.set('Vary', 'Origin');
    return new Response(cached.body, { headers: respHeaders, status: cached.status });
  }

  const obj = await env.BUCKET.get('manifest.json');
  if (!obj) {
    const headers = new Headers();
    headers.set('Cache-Control', 'no-store');
    if (allowedOrigin) headers.set('Access-Control-Allow-Origin', allowedOrigin);
    headers.set('Vary', 'Origin');
    return new Response('Manifest not found', { headers, status: 404 });
  }

  const body = await obj.text();
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Cache-Control', 'public, max-age=300');

  const cacheable = new Response(body, { headers, status: 200 });
  ctx.waitUntil(cache.put(request.url, cacheable.clone()));

  if (allowedOrigin) headers.set('Access-Control-Allow-Origin', allowedOrigin);
  headers.set('Vary', 'Origin');

  return new Response(body, { headers, status: 200 });
}

async function handlePMTilesFile(request: Request, env: Env, filename: string): Promise<Response> {
  const allowedOrigin = getAllowedOrigin(request, env);

  const rangeHeader = request.headers.get('Range');
  let range: { offset: number; length: number } | undefined;

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
    if (match) {
      const start = Number.parseInt(match[1], 10);
      const end = match[2] ? Number.parseInt(match[2], 10) : undefined;
      range = {
        offset: start,
        length: end !== undefined ? end - start + 1 : 1,
      };
    }
  }

  const obj = await env.BUCKET.get(filename, range ? { range } : undefined);
  if (!obj) {
    const headers = new Headers();
    // Short cache for 404 to prevent abuse while allowing quick recovery
    headers.set('Cache-Control', 'public, max-age=60');
    if (allowedOrigin) headers.set('Access-Control-Allow-Origin', allowedOrigin);
    headers.set('Vary', 'Origin');
    return new Response('File not found', { headers, status: 404 });
  }

  const headers = new Headers();
  headers.set('Content-Type', 'application/octet-stream');
  headers.set('Accept-Ranges', 'bytes');
  // PMTiles files are immutable (hash-based filenames)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  if (allowedOrigin) headers.set('Access-Control-Allow-Origin', allowedOrigin);
  headers.set('Vary', 'Origin');

  if (rangeHeader && obj.range) {
    const r = obj.range as { offset: number; length: number };
    headers.set('Content-Range', `bytes ${r.offset}-${r.offset + r.length - 1}/${obj.size}`);
    headers.set('Content-Length', String(r.length));
    return new Response(obj.body, { headers, status: 206 });
  }

  headers.set('Content-Length', String(obj.size));
  return new Response(obj.body, { headers, status: 200 });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method.toUpperCase() === 'POST') return new Response(undefined, { status: 405 });

    const url = new URL(request.url);
    const cache = caches.default;

    if (url.pathname === '/manifest.json') {
      return handleManifest(request, env, ctx, cache);
    }

    const pmtilesMatch = url.pathname.match(/^\/(.+\.pmtiles)$/);
    if (pmtilesMatch) {
      return handlePMTilesFile(request, env, pmtilesMatch[1]);
    }

    return new Response('Not found', { status: 404 });
  },
};
