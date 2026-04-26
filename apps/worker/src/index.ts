interface Env {
  ALLOWED_ORIGINS?: string;
  BUCKET: R2Bucket;
}

const NOT_FOUND_CACHE_CONTROL = 'public, max-age=60';
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

function matchesPattern(origin: string, pattern: string): boolean {
  if (pattern === '*' || pattern === origin) {
    return true;
  }
  if (pattern.includes('*')) {
    const regex = new RegExp(`^${pattern.replace(/\./g, '\\.').replace('*', '[^.]+')}$`);
    return regex.test(origin);
  }
  return false;
}

function getAllowedOrigin(request: Request, env: Env): string {
  const requestOrigin = request.headers.get('Origin');
  if (typeof env.ALLOWED_ORIGINS === 'undefined' || !requestOrigin) {
    return '';
  }

  const patterns = env.ALLOWED_ORIGINS.split(',');
  return patterns.some((pattern) => matchesPattern(requestOrigin, pattern)) ? requestOrigin : '';
}

function applyCorsHeaders(headers: Headers, allowedOrigin: string): void {
  if (allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', allowedOrigin);
  }
  headers.set('Vary', 'Origin');
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
    headers.set('Cache-Control', NOT_FOUND_CACHE_CONTROL);
    applyCorsHeaders(headers, allowedOrigin);
    return new Response('File not found', { headers, status: 404 });
  }

  const headers = new Headers();
  headers.set('Content-Type', 'application/octet-stream');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', IMMUTABLE_CACHE_CONTROL);
  applyCorsHeaders(headers, allowedOrigin);

  if (rangeHeader && obj.range) {
    const byteRange = obj.range as { offset: number; length: number };
    headers.set(
      'Content-Range',
      `bytes ${byteRange.offset}-${byteRange.offset + byteRange.length - 1}/${obj.size}`,
    );
    headers.set('Content-Length', String(byteRange.length));
    return new Response(obj.body, { headers, status: 206 });
  }

  headers.set('Content-Length', String(obj.size));
  return new Response(obj.body, { headers, status: 200 });
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (request.method.toUpperCase() === 'POST') return new Response(undefined, { status: 405 });

    const url = new URL(request.url);

    const pmtilesMatch = url.pathname.match(/^\/(.+\.pmtiles)$/);
    if (pmtilesMatch) {
      return handlePMTilesFile(request, env, pmtilesMatch[1]);
    }

    return new Response('Not found', { status: 404 });
  },
};
