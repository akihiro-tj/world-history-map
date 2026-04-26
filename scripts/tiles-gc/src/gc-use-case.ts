import type { HashedFilename } from '@world-history-map/tiles';
import type { BucketName } from './bucket-name.ts';
import type { DeletionPlan } from './deletion-plan.ts';
import { computeDeletionCandidates, computeRetainedHashes } from './gc.ts';
import type { GcCliInputs } from './gc-cli-inputs.ts';
import type { GcExecution, GcExecutionResult } from './gc-execution.ts';
import type { ManifestHistoryRepository } from './manifest-history.ts';
import type { R2ObjectLister } from './r2-object-lister.ts';

export interface BucketGcOutcome {
  readonly bucket: BucketName;
  readonly retained: ReadonlySet<HashedFilename>;
  readonly plan: DeletionPlan;
  readonly executionResult: GcExecutionResult;
}

export interface GcRunOutcome {
  readonly inputs: GcCliInputs;
  readonly retained: ReadonlySet<HashedFilename>;
  readonly buckets: readonly BucketGcOutcome[];
}

export class GcUseCase {
  readonly #historyRepo: ManifestHistoryRepository;
  readonly #objectLister: R2ObjectLister;
  readonly #gcExecution: GcExecution;

  constructor(
    historyRepo: ManifestHistoryRepository,
    objectLister: R2ObjectLister,
    gcExecution: GcExecution,
  ) {
    this.#historyRepo = historyRepo;
    this.#objectLister = objectLister;
    this.#gcExecution = gcExecution;
  }

  async run(inputs: GcCliInputs): Promise<GcRunOutcome> {
    const snapshots = await this.#historyRepo.recentSnapshots(inputs.windowSize);
    const retained = computeRetainedHashes(snapshots);

    const buckets: BucketGcOutcome[] = [];
    for (const bucket of inputs.target.buckets()) {
      const bucketObjects = await this.#objectLister.list(bucket);
      const plan = computeDeletionCandidates(retained, bucketObjects);
      const executionResult = await this.#gcExecution.execute(bucket, plan);
      buckets.push({ bucket, retained, plan, executionResult });
    }

    return { inputs, retained, buckets };
  }
}
