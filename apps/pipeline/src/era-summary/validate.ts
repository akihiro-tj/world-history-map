import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { ERA_SUMMARY_CONSTRAINTS } from '@/config.ts';
import { regionIdSchema } from '@/domain/era-summary/region-id.ts';
import { toTerritoryId } from '@/domain/territory/territory-id.ts';

const referenceSchema = z.object({
  kind: z.enum(['territory', 'year']),
  target: z.string().min(1),
  text: z.string().min(1),
});

const regionCardSchema = z.object({
  region: regionIdSchema,
  title: z.string().min(1).max(ERA_SUMMARY_CONSTRAINTS.TITLE_MAX_LENGTH),
  context: z
    .string()
    .min(1)
    .max(ERA_SUMMARY_CONSTRAINTS.CONTEXT_MAX_LENGTH)
    .refine((value) => value.trim().length > 0, { message: 'context must not be blank' }),
  references: z.array(referenceSchema).optional().default([]),
});

const eraSummaryFileSchema = z.object({
  year: z.number().int(),
  regions: z
    .array(regionCardSchema)
    .min(1)
    .max(ERA_SUMMARY_CONSTRAINTS.MAX_REGIONS_PER_ERA)
    .refine(
      (regions) => {
        const regionIds = regions.map((r) => r.region);
        return new Set(regionIds).size === regionIds.length;
      },
      { message: 'regions must not contain duplicate region identifiers' },
    ),
});

/**
 * The territories at a year from the two views a reference depends on:
 * `descriptionIds` are the kebab ids the description panel looks up (null when no
 * descriptions exist for the year); `geojsonNames` are the exact GeoJSON NAMEs the
 * map highlight matches on (null when the source geojson is unavailable, in which
 * case the NAME check is skipped). Injected so the validator stays decoupled from
 * how each source is stored.
 */
export interface YearTerritories {
  descriptionIds: ReadonlySet<string> | null;
  geojsonNames: ReadonlySet<string> | null;
}

export type YearTerritoriesResolver = (year: number) => YearTerritories;

const TERRITORY_REFERENCE_KIND = 'territory';

function territoryReferenceErrors(
  reference: { target: string },
  year: number,
  territories: YearTerritories,
  location: string,
): string[] {
  const errors: string[] = [];

  if (territories.descriptionIds === null) {
    errors.push(
      `${location}.target: no descriptions exist for year ${year}, so territory "${reference.target}" cannot be resolved`,
    );
  } else if (!territories.descriptionIds.has(toTerritoryId(reference.target))) {
    errors.push(`${location}.target: "${reference.target}" is not a territory at year ${year}`);
  }

  if (territories.geojsonNames !== null && !territories.geojsonNames.has(reference.target)) {
    errors.push(
      `${location}.target: "${reference.target}" is not an exact GeoJSON NAME at year ${year}, so the map highlight will not match`,
    );
  }

  return errors;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/**
 * Checks the cross-referential invariants the frontend silently depends on:
 * a reference whose `text` is absent from `context` is dropped at render time;
 * a territory `target` whose derived id has no description selects nothing; and a
 * `target` that is not an exact GeoJSON NAME never highlights on the map.
 *
 * Reads the raw parsed JSON defensively rather than the schema's typed output so
 * these errors surface in the same pass as schema errors instead of only after the
 * structure is fixed; anything too malformed to read is left to the schema.
 */
function collectReferenceErrors(
  raw: unknown,
  resolveYearTerritories: YearTerritoriesResolver | undefined,
): string[] {
  if (typeof raw !== 'object' || raw === null) return [];
  const { year, regions } = raw as { year?: unknown; regions?: unknown };
  if (!Array.isArray(regions)) return [];

  const numericYear = typeof year === 'number' ? year : null;
  const territories =
    resolveYearTerritories && numericYear !== null
      ? resolveYearTerritories(numericYear)
      : undefined;
  const errors: string[] = [];

  regions.forEach((region, regionIndex) => {
    if (typeof region !== 'object' || region === null) return;
    const context = asString((region as { context?: unknown }).context);
    const references = (region as { references?: unknown }).references;
    if (context === null || !Array.isArray(references)) return;

    references.forEach((reference, referenceIndex) => {
      if (typeof reference !== 'object' || reference === null) return;
      const text = asString((reference as { text?: unknown }).text);
      const target = asString((reference as { target?: unknown }).target);
      if (text === null || target === null) return;

      const location = `regions.${regionIndex}.references.${referenceIndex}`;
      if (!context.includes(text)) {
        errors.push(`${location}.text: "${text}" does not appear in context and will be dropped`);
      }

      const kind = (reference as { kind?: unknown }).kind;
      if (kind !== TERRITORY_REFERENCE_KIND || territories === undefined || numericYear === null) {
        return;
      }
      errors.push(...territoryReferenceErrors({ target }, numericYear, territories, location));
    });
  });

  return errors;
}

export interface EraSummaryValidationResult {
  filePath: string;
  valid: boolean;
  errors: string[];
}

export function validateEraSummaryFile(
  filePath: string,
  resolveYearTerritories?: YearTerritoriesResolver,
): EraSummaryValidationResult {
  const content = readFileSync(filePath, 'utf-8');
  const rawEraSummary = JSON.parse(content);
  const parsed = eraSummaryFileSchema.safeParse(rawEraSummary);

  const schemaErrors = parsed.success
    ? []
    : parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  const referenceErrors = collectReferenceErrors(rawEraSummary, resolveYearTerritories);
  const errors = [...schemaErrors, ...referenceErrors];

  return { filePath, valid: errors.length === 0, errors };
}
