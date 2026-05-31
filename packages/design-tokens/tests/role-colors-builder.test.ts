import { describe, expect, it } from 'vitest';
import type { ColorEntry } from '../src/build/dtcg.ts';
import { RoleColorsEmitter } from '../src/build/role-colors-builder.ts';

const COLORS: ColorEntry[] = [
  { name: 'role-selected', hex: '#f73d62' },
  { name: 'role-label-text', hex: '#eeeeee' },
  { name: 'surface-panel', hex: '#2a2e33f2' },
  { name: 'text-primary', hex: '#ffffff' },
];

describe('RoleColorsEmitter', () => {
  const emitter = new RoleColorsEmitter();

  it('emits only role-* colors with the role- prefix stripped', () => {
    const source = emitter.emit(COLORS);
    expect(source).toContain("  selected: '#f73d62',");
    expect(source).not.toContain('surface-panel');
    expect(source).not.toContain('text-primary');
  });

  it('converts kebab-case role names to camelCase keys', () => {
    expect(emitter.emit(COLORS)).toContain("  labelText: '#eeeeee',");
  });

  it('emits a const object and a key type', () => {
    const source = emitter.emit(COLORS);
    expect(source).toContain('export const roleColors = {');
    expect(source).toContain('} as const;');
    expect(source).toContain('export type RoleColorKey = keyof typeof roleColors;');
  });

  it('throws when there are no role-* colors', () => {
    expect(() => emitter.emit([{ name: 'text-primary', hex: '#ffffff' }])).toThrow(
      'No role-* colors found',
    );
  });
});
