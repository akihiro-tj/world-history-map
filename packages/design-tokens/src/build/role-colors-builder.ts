import { oklchToHex } from './oklch.ts';
import type { TextSource } from './text-source.ts';

const ROLE_COLOR_VAR_PREFIX = '--color-role-';
const TOKEN_NAME_PATTERN = /^[a-z]+(?:-[a-z]+)*$/;

function kebabToCamel(name: string): string {
  return name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export class RoleColorToken {
  readonly name: string;
  readonly value: string;

  constructor(name: string, value: string) {
    if (!TOKEN_NAME_PATTERN.test(name)) {
      throw new Error(
        `Invalid token name: "${name}". Token names must be lowercase letters separated by single hyphens.`,
      );
    }
    if (!value.trim()) {
      throw new Error('Token value must not be empty');
    }
    this.name = name;
    this.value = value;
  }
}

export class RoleColorTokenSet {
  private readonly tokens: ReadonlyArray<RoleColorToken>;

  constructor(tokens: RoleColorToken[]) {
    if (tokens.length === 0) {
      throw new Error('RoleColorTokenSet must contain at least one token');
    }
    const names = tokens.map((t) => t.name);
    if (new Set(names).size !== names.length) {
      throw new Error('Duplicate token names are not allowed in RoleColorTokenSet');
    }
    this.tokens = [...tokens];
  }

  toArray(): ReadonlyArray<RoleColorToken> {
    return this.tokens;
  }
}

export class RoleColorTokenParser {
  parse(css: string): RoleColorTokenSet {
    const pattern = new RegExp(
      `${ROLE_COLOR_VAR_PREFIX}([a-z]+(?:-[a-z]+)*)\\s*:\\s*([^;]+?)\\s*;`,
      'g',
    );
    const tokens: RoleColorToken[] = [];
    for (const match of css.matchAll(pattern)) {
      const [, name, value] = match;
      if (!name || !value) continue;
      tokens.push(new RoleColorToken(name, value));
    }
    if (tokens.length === 0) {
      throw new Error(`No ${ROLE_COLOR_VAR_PREFIX}* definitions found in CSS`);
    }
    return new RoleColorTokenSet(tokens);
  }
}

export class RoleColorModuleEmitter {
  emit(tokenSet: RoleColorTokenSet): string {
    const entries = tokenSet
      .toArray()
      .map((token) => `  ${kebabToCamel(token.name)}: '${oklchToHex(token.value)}',`)
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
}

export class RoleColorsBuilder {
  private readonly cssSource: TextSource;

  constructor(params: { cssSource: TextSource }) {
    this.cssSource = params.cssSource;
  }

  async generateSource(): Promise<string> {
    const css = await this.cssSource.read();
    const parser = new RoleColorTokenParser();
    const emitter = new RoleColorModuleEmitter();
    return emitter.emit(parser.parse(css));
  }

  isUpToDate(existing: string | null, generated: string): boolean {
    return existing === generated;
  }
}
