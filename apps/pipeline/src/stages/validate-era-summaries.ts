import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { ERA_SUMMARY_CONSTRAINTS } from '@/config.ts';

const regionIdSchema = z.enum([
  'europe',
  'east-asia',
  'southeast-asia',
  'south-asia',
  'middle-east-north-africa',
  'sub-saharan-africa',
  'americas',
  'oceania',
]);

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

export interface EraSummaryValidationResult {
  filePath: string;
  valid: boolean;
  errors: string[];
}

export function validateEraSummaryFile(filePath: string): EraSummaryValidationResult {
  const content = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  const parsed = eraSummaryFileSchema.safeParse(data);

  if (parsed.success) {
    return { filePath, valid: true, errors: [] };
  }

  const errors = parsed.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return `${path}: ${issue.message}`;
  });

  return { filePath, valid: false, errors };
}
