import type { BucketName } from './bucket-name.ts';
import type { DeletionPlan } from './deletion-plan.ts';
import type { R2BucketRepository } from './r2-bucket.ts';

export interface GcExecutionResult {
  readonly deleted: number;
  readonly mode: 'dry-run' | 'live';
}

export interface GcExecution {
  execute(bucket: BucketName, plan: DeletionPlan): Promise<GcExecutionResult>;
}

export class DryRunGcExecution implements GcExecution {
  async execute(_bucket: BucketName, _plan: DeletionPlan): Promise<GcExecutionResult> {
    return { deleted: 0, mode: 'dry-run' };
  }
}

export class LiveGcExecution implements GcExecution {
  readonly #r2Repo: R2BucketRepository;

  constructor(r2Repo: R2BucketRepository) {
    this.#r2Repo = r2Repo;
  }

  async execute(bucket: BucketName, plan: DeletionPlan): Promise<GcExecutionResult> {
    for (const key of plan.candidates()) {
      await this.#r2Repo.deleteObject(bucket, key);
    }
    return { deleted: plan.size, mode: 'live' };
  }
}

export function gcExecutionFor(dryRun: boolean, r2Repo: R2BucketRepository): GcExecution {
  return dryRun ? new DryRunGcExecution() : new LiveGcExecution(r2Repo);
}
