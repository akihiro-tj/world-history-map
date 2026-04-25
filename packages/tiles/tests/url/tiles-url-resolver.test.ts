import { describe, expect, it } from 'vitest';
import { asHashedFilename } from '../../src/types.ts';
import {
  DevTilesUrlResolver,
  RemoteTilesUrlResolver,
  resolverFor,
} from '../../src/url/tiles-url-resolver.ts';

const FILENAME = asHashedFilename('world_1600.aabbccddeeff.pmtiles');

describe('DevTilesUrlResolver', () => {
  it('returns pmtiles:///pmtiles/ URL', () => {
    const resolver = new DevTilesUrlResolver();
    expect(resolver.resolve(FILENAME)).toBe('pmtiles:///pmtiles/world_1600.aabbccddeeff.pmtiles');
  });
});

describe('RemoteTilesUrlResolver', () => {
  it('prepends pmtiles:// scheme before base URL', () => {
    const resolver = new RemoteTilesUrlResolver('https://tiles.example.com');
    expect(resolver.resolve(FILENAME)).toBe(
      'pmtiles://https://tiles.example.com/world_1600.aabbccddeeff.pmtiles',
    );
  });

  it('strips single trailing slash', () => {
    const resolver = new RemoteTilesUrlResolver('https://tiles.example.com/');
    expect(resolver.resolve(FILENAME)).toBe(
      'pmtiles://https://tiles.example.com/world_1600.aabbccddeeff.pmtiles',
    );
  });

  it('strips multiple trailing slashes', () => {
    const resolver = new RemoteTilesUrlResolver('https://tiles.example.com///');
    expect(resolver.resolve(FILENAME)).toBe(
      'pmtiles://https://tiles.example.com/world_1600.aabbccddeeff.pmtiles',
    );
  });
});

describe('resolverFor', () => {
  it('returns DevTilesUrlResolver for empty string', () => {
    expect(resolverFor('')).toBeInstanceOf(DevTilesUrlResolver);
  });

  it('returns DevTilesUrlResolver for trailing-slash-only string', () => {
    expect(resolverFor('///')).toBeInstanceOf(DevTilesUrlResolver);
  });

  it('returns RemoteTilesUrlResolver for non-empty base URL', () => {
    expect(resolverFor('https://tiles.example.com')).toBeInstanceOf(RemoteTilesUrlResolver);
  });
});
