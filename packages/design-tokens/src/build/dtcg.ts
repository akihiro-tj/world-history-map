// Token shapes consumed by the emitters, plus the mapping from the W3C DTCG
// document that `@google/design.md export --format dtcg` produces. `@google/design.md`
// parses and validates DESIGN.md; this module only reshapes its output into the
// flat token records the theme.css / role-colors emitters expect.

export interface ColorEntry {
  readonly name: string;
  readonly hex: string;
}

export interface TypographyEntry {
  readonly name: string;
  readonly fontSize: string;
  readonly fontWeight?: string;
  readonly lineHeight: string;
}

export interface SpacingTokens {
  readonly unit: string;
}

export interface DesignTokens {
  readonly colors: ColorEntry[];
  readonly typography: TypographyEntry[];
  readonly spacing: SpacingTokens;
}

interface DtcgDimension {
  readonly value: number;
  readonly unit: string;
}

interface DtcgColorToken {
  readonly $value: { readonly hex: string };
}

interface DtcgTypographyToken {
  readonly $value: {
    readonly fontSize: DtcgDimension;
    readonly fontWeight?: number;
    // DTCG emits lineHeight as a unitless number (e.g. 36); DESIGN.md uses px,
    // so it is re-suffixed with `px` below to keep the generated output stable.
    readonly lineHeight: number;
  };
}

export interface DtcgDocument {
  readonly color: Record<string, unknown>;
  readonly typography: Record<string, unknown>;
  readonly spacing: { readonly unit: { readonly $value: DtcgDimension } };
}

// DTCG groups carry sibling metadata keys such as `$type` alongside token
// entries; those are skipped when iterating.
function isTokenKey(key: string): boolean {
  return !key.startsWith('$');
}

function formatDimension(dimension: DtcgDimension): string {
  return `${dimension.value}${dimension.unit}`;
}

export function dtcgToTokens(doc: DtcgDocument): DesignTokens {
  const colors: ColorEntry[] = Object.entries(doc.color)
    .filter(([key]) => isTokenKey(key))
    .map(([name, token]) => ({ name, hex: (token as DtcgColorToken).$value.hex }));
  if (colors.length === 0) {
    throw new Error('No colors found in the @google/design.md dtcg export');
  }

  const typography: TypographyEntry[] = Object.entries(doc.typography)
    .filter(([key]) => isTokenKey(key))
    .map(([name, token]) => {
      const value = (token as DtcgTypographyToken).$value;
      return {
        name,
        fontSize: formatDimension(value.fontSize),
        lineHeight: `${value.lineHeight}px`,
        ...(value.fontWeight !== undefined ? { fontWeight: String(value.fontWeight) } : {}),
      };
    });
  if (typography.length === 0) {
    throw new Error('No typography tokens found in the @google/design.md dtcg export');
  }

  return { colors, typography, spacing: { unit: formatDimension(doc.spacing.unit.$value) } };
}
