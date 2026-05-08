import { z } from 'zod';

export const REGION_IDS = [
  'europe',
  'east-asia',
  'southeast-asia',
  'south-asia',
  'middle-east-north-africa',
  'sub-saharan-africa',
  'americas',
  'oceania',
] as const;

export type RegionId = (typeof REGION_IDS)[number];

export const regionIdSchema = z.enum(REGION_IDS);
