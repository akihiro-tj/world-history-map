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
  context: z.string().min(1).max(ERA_SUMMARY_CONSTRAINTS.CONTEXT_MAX_LENGTH),
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

type EraSummaryFile = z.infer<typeof eraSummaryFileSchema>;

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

/**
 * Checks the cross-referential invariants the frontend silently depends on:
 * a reference whose `text` is absent from `context` is dropped at render time;
 * a territory `target` whose derived id has no description selects nothing; and a
 * `target` that is not an exact GeoJSON NAME never highlights on the map.
 */
function collectReferenceErrors(
  eraSummary: EraSummaryFile,
  resolveYearTerritories: YearTerritoriesResolver | undefined,
): string[] {
  const territories = resolveYearTerritories ? resolveYearTerritories(eraSummary.year) : undefined;
  const errors: string[] = [];

  eraSummary.regions.forEach((region, regionIndex) => {
    region.references.forEach((reference, referenceIndex) => {
      const location = `regions.${regionIndex}.references.${referenceIndex}`;

      if (!region.context.includes(reference.text)) {
        errors.push(
          `${location}.text: "${reference.text}" does not appear in context and will be dropped`,
        );
      }

      if (reference.kind !== TERRITORY_REFERENCE_KIND || territories === undefined) return;

      errors.push(...territoryReferenceErrors(reference, eraSummary.year, territories, location));
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

  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    return { filePath, valid: false, errors };
  }

  const referenceErrors = collectReferenceErrors(parsed.data, resolveYearTerritories);
  return { filePath, valid: referenceErrors.length === 0, errors: referenceErrors };
}
