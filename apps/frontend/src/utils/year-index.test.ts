import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { YearIndex } from '../types/year';
import { clearYearIndexCache, loadYearIndex } from './year-index';

const SAMPLE_INDEX: YearIndex = {
  years: [
    { year: -500, filename: 'world_-500.pmtiles', countries: ['Greece', 'Persia'] },
    { year: 200, filename: 'world_200.pmtiles', countries: ['Rome'] },
    { year: 1600, filename: 'world_1600.pmtiles', countries: ['Spain', 'England'] },
  ],
};

describe('loadYearIndex', () => {
  beforeEach(() => {
    clearYearIndexCache();
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(structuredClone(SAMPLE_INDEX)),
        }),
      ),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches and returns valid year index', async () => {
    const result = await loadYearIndex();
    expect(result).toEqual(SAMPLE_INDEX);
    expect(fetch).toHaveBeenCalledWith('/pmtiles/index.json');
  });

  it('returns cached result on subsequent calls', async () => {
    await loadYearIndex();
    await loadYearIndex();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('throws on fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' })),
    );
    await expect(loadYearIndex()).rejects.toThrow('Failed to load year index: 404 Not Found');
  });

  it('throws on invalid format - missing years field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) })),
    );
    await expect(loadYearIndex()).rejects.toThrow('Invalid year index format');
  });

  it('throws on invalid format - non-integer year', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              years: [{ year: 1.5, filename: 'world_1.pmtiles', countries: [] }],
            }),
        }),
      ),
    );
    await expect(loadYearIndex()).rejects.toThrow('Invalid year index format');
  });

  it('throws on invalid format - invalid filename pattern', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              years: [{ year: 200, filename: 'bad_name.pmtiles', countries: [] }],
            }),
        }),
      ),
    );
    await expect(loadYearIndex()).rejects.toThrow('Invalid year index format');
  });

  it('throws on invalid format - non-string country', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              years: [{ year: 200, filename: 'world_200.pmtiles', countries: [123] }],
            }),
        }),
      ),
    );
    await expect(loadYearIndex()).rejects.toThrow('Invalid year index format');
  });
});
