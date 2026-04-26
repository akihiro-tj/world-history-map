import type { HashedFilename } from '@world-history-map/tiles';
import type { BucketName } from './bucket-name.ts';
import type { DeletionPlan } from './deletion-plan.ts';
import { computeDeletionCandidates, computeRetainedHashes } from './gc.ts';
import type { GcCliInputs } from './gc-cli-inputs.ts';
import type { GcExecution, GcExecutionResult } from './gc-execution.ts';
import type { ManifestHistoryRepository } from './manifest-history.ts';
import type { R2BucketRepository } from './r2-bucket.ts';

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
  readonly #r2Repo: R2BucketRepository;
  readonly #gcExecution: GcExecution;

  constructor(
    historyRepo: ManifestHistoryRepository,
    r2Repo: R2BucketRepository,
    gcExecution: GcExecution,
  ) {
    this.#historyRepo = historyRepo;
    this.#r2Repo = r2Repo;
    this.#gcExecution = gcExecution;
  }

  async run(inputs: GcCliInputs): Promise<GcRunOutcome> {
    const snapshots = await this.#historyRepo.recentSnapshots(inputs.windowSize);
    const retained = computeRetainedHashes(snapshots);

    const buckets: BucketGcOutcome[] = [];
    for (const bucket of inputs.target.buckets()) {
      const bucketObjects = await this.#r2Repo.listObjects(bucket);
      const plan = computeDeletionCandidates(retained, bucketObjects);
      const executionResult = await this.#gcExecution.execute(bucket, plan);
      buckets.push({ bucket, retained, plan, executionResult });
    }

    return { inputs, retained, buckets };
  }
}
