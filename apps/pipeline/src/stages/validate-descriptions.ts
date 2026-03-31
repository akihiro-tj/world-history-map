import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { DESCRIPTION_CONSTRAINTS } from '@/config.ts';

const nonEmptyNoUnknown = z
  .string()
  .min(1)
  .refine((value) => value !== '不明', { message: 'Value must not be "不明"' });

const territoryProfileSchema = z
  .object({
    capital: nonEmptyNoUnknown.optional(),
    regime: nonEmptyNoUnknown.optional(),
    dynasty: nonEmptyNoUnknown.optional(),
    leader: nonEmptyNoUnknown.optional(),
    religion: nonEmptyNoUnknown.optional(),
  })
  .refine((profile) => Object.values(profile).some((value) => value !== undefined), {
    message: 'Profile must have at least one field (omit profile object if empty)',
  });

const keyEventSchema = z.object({
  year: z.number().int(),
  event: nonEmptyNoUnknown,
});

const territoryDescriptionSchema = z.object({
  name: nonEmptyNoUnknown,
  era: nonEmptyNoUnknown.optional(),
  profile: territoryProfileSchema.optional(),
  context: z
    .string()
    .min(DESCRIPTION_CONSTRAINTS.CONTEXT_MIN_LENGTH)
    .max(DESCRIPTION_CONSTRAINTS.CONTEXT_MAX_LENGTH)
    .refine((value) => value !== '不明', { message: 'Context must not be "不明"' })
    .optional(),
  keyEvents: z
    .array(keyEventSchema)
    .min(1)
    .refine(
      (events) =>
        events.every((event, index) => index === 0 || event.year >= (events[index - 1]?.year ?? 0)),
      { message: 'Key events must be sorted by year ascending' },
    )
    .optional(),
});

const yearDescriptionBundleSchema = z.record(z.string(), territoryDescriptionSchema);

export interface DescriptionValidationResult {
  filePath: string;
  valid: boolean;
  errors: string[];
}

export function validateDescriptionFile(filePath: string): DescriptionValidationResult {
  const content = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  const parsed = yearDescriptionBundleSchema.safeParse(data);

  if (parsed.success) {
    return { filePath, valid: true, errors: [] };
  }

  const errors = parsed.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return `${path}: ${issue.message}`;
  });

  return { filePath, valid: false, errors };
}

export async function validateAllDescriptions(dir: string): Promise<DescriptionValidationResult[]> {
  const files = readdirSync(dir).filter((file) => file.endsWith('.json'));
  return files.map((file) => validateDescriptionFile(path.join(dir, file)));
}
