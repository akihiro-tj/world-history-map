import type { BucketName } from './bucket-name.ts';
import { DEV_BUCKET, PROD_BUCKET } from './bucket-name.ts';

export type TargetEnv = 'dev' | 'prod' | 'both';

const VALID_ENVS: readonly TargetEnv[] = ['dev', 'prod', 'both'];

const BUCKETS_BY_ENV: Record<TargetEnv, readonly BucketName[]> = {
  dev: [DEV_BUCKET],
  prod: [PROD_BUCKET],
  both: [DEV_BUCKET, PROD_BUCKET],
};

export class GcTarget {
  readonly #env: TargetEnv;

  private constructor(env: TargetEnv) {
    this.#env = env;
  }

  static parse(input: string): GcTarget {
    if (!VALID_ENVS.includes(input as TargetEnv)) {
      throw new Error(`Invalid GC target: "${input}". Must be one of: ${VALID_ENVS.join(', ')}`);
    }
    return new GcTarget(input as TargetEnv);
  }

  buckets(): readonly BucketName[] {
    return BUCKETS_BY_ENV[this.#env];
  }

  label(): TargetEnv {
    return this.#env;
  }
}
