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
 * Resolves the set of territory ids that exist at a given year. Returns null
 * when no descriptions exist for the year. Injected so the validator stays
 * decoupled from how descriptions are stored.
 */
export type TerritoryIdResolver = (year: number) => ReadonlySet<string> | null;

const TERRITORY_REFERENCE_KIND = 'territory';

/**
 * Checks the cross-referential invariants the frontend silently depends on:
 * a reference whose `text` is absent from `context` is dropped at render time,
 * and a territory reference whose `target` (a GeoJSON NAME) has no description at
 * this year selects nothing when clicked. The description id is derived from the
 * NAME the same way the frontend does, so the two stay aligned.
 */
function collectReferenceErrors(
  eraSummary: EraSummaryFile,
  resolveTerritoryIds: TerritoryIdResolver | undefined,
): string[] {
  const territoryIds = resolveTerritoryIds ? resolveTerritoryIds(eraSummary.year) : undefined;
  const errors: string[] = [];

  eraSummary.regions.forEach((region, regionIndex) => {
    region.references.forEach((reference, referenceIndex) => {
      const location = `regions.${regionIndex}.references.${referenceIndex}`;

      if (!region.context.includes(reference.text)) {
        errors.push(
          `${location}.text: "${reference.text}" does not appear in context and will be dropped`,
        );
      }

      if (reference.kind !== TERRITORY_REFERENCE_KIND || territoryIds === undefined) return;

      if (territoryIds === null) {
        errors.push(
          `${location}.target: no descriptions exist for year ${eraSummary.year}, so territory "${reference.target}" cannot be resolved`,
        );
      } else if (!territoryIds.has(toTerritoryId(reference.target))) {
        errors.push(
          `${location}.target: "${reference.target}" is not a territory at year ${eraSummary.year}`,
        );
      }
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
  resolveTerritoryIds?: TerritoryIdResolver,
): EraSummaryValidationResult {
  const content = readFileSync(filePath, 'utf-8');
  const rawEraSummary = JSON.parse(content);
  const parsed = eraSummaryFileSchema.safeParse(rawEraSummary);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    return { filePath, valid: false, errors };
  }

  const referenceErrors = collectReferenceErrors(parsed.data, resolveTerritoryIds);
  return { filePath, valid: referenceErrors.length === 0, errors: referenceErrors };
}
