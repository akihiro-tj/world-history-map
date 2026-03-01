import { z } from 'zod';

const nonEmptyNoUnknown = z
  .string()
  .min(1)
  .refine((v) => v !== '不明', { message: 'Value must not be "不明"' });

const territoryProfileSchema = z
  .object({
    capital: nonEmptyNoUnknown.optional(),
    regime: nonEmptyNoUnknown.optional(),
    leader: nonEmptyNoUnknown.optional(),
    population: nonEmptyNoUnknown.optional(),
    religion: nonEmptyNoUnknown.optional(),
  })
  .refine((p) => Object.values(p).some((v) => v !== undefined), {
    message: 'Profile must have at least one field (omit profile object if empty)',
  });

const keyEventSchema = z.object({
  year: z.number().int(),
  event: nonEmptyNoUnknown,
});

export const territoryDescriptionSchema = z.object({
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
    .refine((events) => events.every((e, i) => i === 0 || e.year >= events[i - 1].year), {
      message: 'Key events must be sorted by year ascending',
    })
    .optional(),
});

export const yearDescriptionBundleSchema = z.record(z.string(), territoryDescriptionSchema);
