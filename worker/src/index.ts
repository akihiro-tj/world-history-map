import {
  Compression,
  EtagMismatch,
  PMTiles,
  type RangeResponse,
  ResolvedValueCache,
  type Source,
  TileType,
} from 'pmtiles';

interface Env {
  ALLOWED_ORIGINS?: string;
  BUCKET: R2Bucket;
  PMTILES_PATH?: string;
  PUBLIC_HOSTNAME?: string;
}

// Utility functions (from protomaps/PMTiles/serverless/shared)
const pmtilesPath = (name: string, setting?: string): string => {
  if (setting) {
    return setting.replaceAll('{name}', name);
  }
  return `${name}.pmtiles`;
};

const TILE =
  /^\/(?<NAME>[0-9a-zA-Z\/!_.'()*-]+)\/(?<Z>\d+)\/(?<X>\d+)\/(?<Y>\d+).(?<EXT>[a-z]+)$/;

const TILESET = /^\/(?<NAME>[0-9a-zA-Z\/!_.'()*-]+).json$/;

const tilePath = (
  path: string,
): {
  ok: boolean;
  name: string;
  tile?: [number, number, number];
  ext: string;
} => {
  const tileMatch = path.match(TILE);

  if (tileMatch?.groups) {
    const g = tileMatch.groups;
    return { ok: true, name: g.NAME, tile: [+g.Z, +g.X, +g.Y], ext: g.EXT };
  }

  const tilesetMatch = path.match(TILESET);

  if (tilesetMatch?.groups) {
    const g = tilesetMatch.groups;
    return { ok: true, name: g.NAME, ext: 'json' };
  }

  return { ok: false, name: '', tile: [0, 0, 0], ext: '' };
};

class KeyNotFoundError extends Error {}

async function nativeDecompress(buf: ArrayBuffer, compression: Compression): Promise<ArrayBuffer> {
  if (compression === Compression.None || compression === Compression.Unknown) {
    return buf;
  }
  if (compression === Compression.Gzip) {
    const stream = new Response(buf).body;
    const result = stream?.pipeThrough(new DecompressionStream('gzip'));
    return new Response(result).arrayBuffer();
  }
  throw new Error('Compression method not supported');
}

const CACHE = new ResolvedValueCache(25, undefined, nativeDecompress);

class R2Source implements Source {
  env: Env;
  archiveName: string;

  constructor(env: Env, archiveName: string) {
    this.env = env;
    this.archiveName = archiveName;
  }

  getKey() {
    return this.archiveName;
  }

  async getBytes(
    offset: number,
    length: number,
    _signal?: AbortSignal,
    etag?: string,
  ): Promise<RangeResponse> {
    const resp = await this.env.BUCKET.get(pmtilesPath(this.archiveName, this.env.PMTILES_PATH), {
      range: { offset: offset, length: length },
      onlyIf: { etagMatches: etag },
    });
    if (!resp) {
      throw new KeyNotFoundError('Archive not found');
    }

    const o = resp as R2ObjectBody;

    if (!o.body) {
      throw new EtagMismatch();
    }

    const a = await o.arrayBuffer();
    return {
      data: a,
      etag: o.etag,
      cacheControl: o.httpMetadata?.cacheControl,
      expires: o.httpMetadata?.cacheExpiry?.toISOString(),
    };
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method.toUpperCase() === 'POST') return new Response(undefined, { status: 405 });

    const url = new URL(request.url);
    const { ok, name, tile, ext } = tilePath(url.pathname);

    const cache = caches.default;

    if (!ok) {
      return new Response('Invalid URL', { status: 404 });
    }

    let allowedOrigin = '';
    const requestOrigin = request.headers.get('Origin');
    if (typeof env.ALLOWED_ORIGINS !== 'undefined' && requestOrigin) {
      for (const pattern of env.ALLOWED_ORIGINS.split(',')) {
        if (pattern === '*') {
          allowedOrigin = requestOrigin;
          break;
        }
        if (pattern === requestOrigin) {
          allowedOrigin = requestOrigin;
          break;
        }
        // Support wildcard subdomain pattern (e.g., https://*.example.com)
        if (pattern.includes('*')) {
          const regex = new RegExp(`^${pattern.replace(/\./g, '\\.').replace('*', '[^.]+')}$`);
          if (regex.test(requestOrigin)) {
            allowedOrigin = requestOrigin;
            break;
          }
        }
      }
    }

    const cached = await cache.match(request.url);
    if (cached) {
      const respHeaders = new Headers(cached.headers);
      if (allowedOrigin) respHeaders.set('Access-Control-Allow-Origin', allowedOrigin);
      respHeaders.set('Vary', 'Origin');

      return new Response(cached.body, {
        headers: respHeaders,
        status: cached.status,
      });
    }

    const cacheableResponse = (
      body: ArrayBuffer | string | undefined,
      cacheableHeaders: Headers,
      status: number,
    ) => {
      // manifest.json is short-cached to allow updates to propagate
      // PMTiles files use immutable since URLs change with content hash
      const cacheControl =
        ext === 'json'
          ? 'public, max-age=300'
          : 'public, max-age=31536000, immutable';
      cacheableHeaders.set('Cache-Control', cacheControl);

      const cacheable = new Response(body, {
        headers: cacheableHeaders,
        status: status,
      });

      ctx.waitUntil(cache.put(request.url, cacheable));

      const respHeaders = new Headers(cacheableHeaders);
      if (allowedOrigin) respHeaders.set('Access-Control-Allow-Origin', allowedOrigin);
      respHeaders.set('Vary', 'Origin');
      return new Response(body, { headers: respHeaders, status: status });
    };

    const cacheableHeaders = new Headers();
    const source = new R2Source(env, name);
    const p = new PMTiles(source, CACHE, nativeDecompress);
    try {
      const pHeader = await p.getHeader();

      if (!tile) {
        cacheableHeaders.set('Content-Type', 'application/json');
        const t = await p.getTileJson(`https://${env.PUBLIC_HOSTNAME || url.hostname}/${name}`);
        return cacheableResponse(JSON.stringify(t), cacheableHeaders, 200);
      }

      if (tile[0] < pHeader.minZoom || tile[0] > pHeader.maxZoom) {
        return cacheableResponse(undefined, cacheableHeaders, 404);
      }

      for (const pair of [
        [TileType.Mvt, 'mvt'],
        [TileType.Png, 'png'],
        [TileType.Jpeg, 'jpg'],
        [TileType.Webp, 'webp'],
        [TileType.Avif, 'avif'],
      ]) {
        if (pHeader.tileType === pair[0] && ext !== pair[1]) {
          if (pHeader.tileType === TileType.Mvt && ext === 'pbf') {
            // Allow .pbf for backward compatibility
            continue;
          }
          return cacheableResponse(
            `Bad request: requested .${ext} but archive has type .${pair[1]}`,
            cacheableHeaders,
            400,
          );
        }
      }

      const tiledata = await p.getZxy(tile[0], tile[1], tile[2]);

      switch (pHeader.tileType) {
        case TileType.Mvt:
          cacheableHeaders.set('Content-Type', 'application/x-protobuf');
          break;
        case TileType.Png:
          cacheableHeaders.set('Content-Type', 'image/png');
          break;
        case TileType.Jpeg:
          cacheableHeaders.set('Content-Type', 'image/jpeg');
          break;
        case TileType.Webp:
          cacheableHeaders.set('Content-Type', 'image/webp');
          break;
      }

      if (tiledata) {
        return cacheableResponse(tiledata.data, cacheableHeaders, 200);
      }
      return cacheableResponse(undefined, cacheableHeaders, 204);
    } catch (e) {
      if (e instanceof KeyNotFoundError) {
        return cacheableResponse('Archive not found', cacheableHeaders, 404);
      }
      throw e;
    }
  },
};
