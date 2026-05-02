import { readFile } from 'node:fs/promises';

const ROLE_COLOR_VAR_PREFIX = '--color-role-';

function oklchToHex(cssValue: string): string {
  const match = cssValue.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/);
  if (!match) throw new Error(`Cannot convert to hex: ${cssValue}`);

  const l = Number(match[1]);
  const c = Number(match[2]);
  const h = (Number(match[3]) * Math.PI) / 180;

  const a = c * Math.cos(h);
  const b = c * Math.sin(h);

  const lp = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mp = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sp = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const rLin = +4.0767416621 * lp - 3.3077115913 * mp + 0.2309699292 * sp;
  const gLin = -1.2684380046 * lp + 2.6097574011 * mp - 0.3413193965 * sp;
  const bLin = -0.0041960863 * lp - 0.7034186147 * mp + 1.707614701 * sp;

  const toSrgb = (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
  };

  const r = Math.round(toSrgb(rLin) * 255);
  const g = Math.round(toSrgb(gLin) * 255);
  const bv = Math.round(toSrgb(bLin) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bv.toString(16).padStart(2, '0')}`;
}

export type RoleColors = Readonly<Record<string, string>>;

export function extractRoleColors(css: string): RoleColors {
  const pattern = new RegExp(`${ROLE_COLOR_VAR_PREFIX}([a-z]+)\\s*:\\s*([^;]+?)\\s*;`, 'g');
  const colors: Record<string, string> = {};
  for (const match of css.matchAll(pattern)) {
    const [, name, value] = match;
    if (!name || !value) continue;
    colors[name] = value;
  }
  if (Object.keys(colors).length === 0) {
    throw new Error(`No ${ROLE_COLOR_VAR_PREFIX}* definitions found in CSS`);
  }
  return colors;
}

export function toTypeScriptSource(colors: RoleColors): string {
  const entries = Object.entries(colors)
    .map(([name, value]) => `  ${name}: '${oklchToHex(value)}',`)
    .join('\n');
  return [
    '// Generated from packages/design-tokens/src/theme.css. Do not edit by hand.',
    '// Run `pnpm --filter @world-history-map/design-tokens run build` to regenerate.',
    'export const roleColors = {',
    entries,
    '} as const;',
    '',
    'export type RoleColorKey = keyof typeof roleColors;',
    '',
  ].join('\n');
}

export class RoleColorsBuilder {
  private readonly cssPath: string;
  private readonly outputPath: string;

  constructor(paths: { cssPath: string; outputPath: string }) {
    this.cssPath = paths.cssPath;
    this.outputPath = paths.outputPath;
  }

  async generateSource(): Promise<string> {
    const css = await readFile(this.cssPath, 'utf-8');
    return toTypeScriptSource(extractRoleColors(css));
  }

  async isFresh(): Promise<boolean> {
    const newSource = await this.generateSource();
    const existingSource = await readFile(this.outputPath, 'utf-8').catch(() => null);
    return existingSource === newSource;
  }
}
