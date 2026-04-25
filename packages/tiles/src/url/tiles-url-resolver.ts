import type { HashedFilename } from '../types.ts';

export interface TilesUrlResolver {
  resolve(filename: HashedFilename): string;
}

export class DevTilesUrlResolver implements TilesUrlResolver {
  // WHY: maplibre-gl dispatches URLs with the pmtiles:// scheme to the registered
  // protocol handler, which strips the scheme prefix and fetches the remainder as
  // a resource. The triple-slash form (pmtiles:///pmtiles/...) means empty authority
  // and absolute path, resolved by the Vite dev middleware at /pmtiles/*.
  resolve(filename: HashedFilename): string {
    return `pmtiles:///pmtiles/${filename}`;
  }
}

export class RemoteTilesUrlResolver implements TilesUrlResolver {
  private readonly normalizedBase: string;

  constructor(baseUrl: string) {
    this.normalizedBase = baseUrl.replace(/\/+$/, '');
  }

  // WHY: maplibre-gl strips the pmtiles:// prefix and passes the remainder
  // (https://...) to the pmtiles Protocol handler as the actual resource URL.
  resolve(filename: HashedFilename): string {
    return `pmtiles://${this.normalizedBase}/${filename}`;
  }
}

export function resolverFor(baseUrl: string): TilesUrlResolver {
  const trimmed = baseUrl.replace(/\/+$/, '');
  return trimmed === '' ? new DevTilesUrlResolver() : new RemoteTilesUrlResolver(baseUrl);
}
