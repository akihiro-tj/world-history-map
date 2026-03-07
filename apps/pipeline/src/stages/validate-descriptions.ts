import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const nonEmptyNoUnknown = z
  .string()
  .min(1)
  .refine((v) => v !== '不明', { message: 'Value must not be "不明"' });

const territoryProfileSchema = z
  .object({
    capital: nonEmptyNoUnknown.optional(),
    regime: nonEmptyNoUnknown.optional(),
    dynasty: nonEmptyNoUnknown.optional(),
    leader: nonEmptyNoUnknown.optional(),
    religion: nonEmptyNoUnknown.optional(),
  })
  .refine((p) => Object.values(p).some((v) => v !== undefined), {
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
    .min(50)
    .max(200)
    .refine((v) => v !== '不明', { message: 'Context must not be "不明"' })
    .optional(),
  keyEvents: z
    .array(keyEventSchema)
    .min(1)
    .refine((events) => events.every((e, i) => i === 0 || e.year >= (events[i - 1]?.year ?? 0)), {
      message: 'Key events must be sorted by year ascending',
    })
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
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  return files.map((f) => validateDescriptionFile(path.join(dir, f)));
}
