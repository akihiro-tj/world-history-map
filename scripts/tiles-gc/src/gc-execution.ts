import type { BucketName } from './bucket-name.ts';
import type { DeletionPlan } from './deletion-plan.ts';
import type { R2ObjectDeleter } from './r2-object-deleter.ts';

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
  readonly #objectDeleter: R2ObjectDeleter;

  constructor(objectDeleter: R2ObjectDeleter) {
    this.#objectDeleter = objectDeleter;
  }

  async execute(bucket: BucketName, plan: DeletionPlan): Promise<GcExecutionResult> {
    for (const key of plan.candidates()) {
      await this.#objectDeleter.delete(bucket, key);
    }
    return { deleted: plan.size, mode: 'live' };
  }
}

export function gcExecutionFor(dryRun: boolean, objectDeleter: R2ObjectDeleter): GcExecution {
  return dryRun ? new DryRunGcExecution() : new LiveGcExecution(objectDeleter);
}
