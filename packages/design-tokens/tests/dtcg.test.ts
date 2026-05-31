import { describe, expect, it } from 'vitest';
import { type DtcgDocument, dtcgToTokens } from '../src/build/dtcg.ts';

const DOC: DtcgDocument = {
  color: {
    $type: 'color',
    'role-selected': { $value: { hex: '#f73d62' } },
    'surface-panel': { $value: { hex: '#364153f2' } },
  },
  typography: {
    'panel-title': {
      $type: 'typography',
      $value: { fontSize: { value: 18, unit: 'px' }, fontWeight: 600, lineHeight: 28 },
    },
    'body-sm': {
      $type: 'typography',
      $value: { fontSize: { value: 14, unit: 'px' }, lineHeight: 20 },
    },
  } as DtcgDocument['typography'],
  spacing: {
    $type: 'dimension',
    unit: { $value: { value: 4, unit: 'px' } },
  } as DtcgDocument['spacing'],
};

describe('dtcgToTokens', () => {
  it('maps colors, skipping group metadata keys and preserving 8-digit hex', () => {
    expect(dtcgToTokens(DOC).colors).toEqual([
      { name: 'role-selected', hex: '#f73d62' },
      { name: 'surface-panel', hex: '#364153f2' },
    ]);
  });

  it('re-suffixes the unitless lineHeight with px and stringifies fontWeight', () => {
    expect(dtcgToTokens(DOC).typography).toEqual([
      { name: 'panel-title', fontSize: '18px', fontWeight: '600', lineHeight: '28px' },
      { name: 'body-sm', fontSize: '14px', lineHeight: '20px' },
    ]);
  });

  it('omits fontWeight when the token does not declare one', () => {
    const bodySm = dtcgToTokens(DOC).typography.find((token) => token.name === 'body-sm');
    expect(bodySm).not.toHaveProperty('fontWeight');
  });

  it('reconstructs the spacing unit from its dimension', () => {
    expect(dtcgToTokens(DOC).spacing).toEqual({ unit: '4px' });
  });

  it('throws when no colors are present', () => {
    const empty: DtcgDocument = { ...DOC, color: { $type: 'color' } };
    expect(() => dtcgToTokens(empty)).toThrow(/No colors/);
  });
});
