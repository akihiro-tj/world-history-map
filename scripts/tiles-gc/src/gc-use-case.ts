import type { BucketName } from './bucket-name.ts';
import type { DeletionPlan } from './deletion-plan.ts';
import { extractHashedTileFilenames } from './gc.ts';
import type { GcCliInputs } from './gc-cli-inputs.ts';
import type { GcExecution, GcExecutionResult } from './gc-execution.ts';
import type { ManifestHistoryRepository } from './manifest-history.ts';
import type { R2ObjectLister } from './r2-object-lister.ts';
import { RetainedHashes } from './retained-hashes.ts';

export interface BucketGcOutcome {
  readonly bucket: BucketName;
  readonly retained: RetainedHashes;
  readonly plan: DeletionPlan;
  readonly executionResult: GcExecutionResult;
}

export interface GcRunOutcome {
  readonly inputs: GcCliInputs;
  readonly retained: RetainedHashes;
  readonly buckets: readonly BucketGcOutcome[];
}

export class GcUseCase {
  readonly #historyRepository: ManifestHistoryRepository;
  readonly #objectLister: R2ObjectLister;
  readonly #gcExecution: GcExecution;

  constructor(
    historyRepository: ManifestHistoryRepository,
    objectLister: R2ObjectLister,
    gcExecution: GcExecution,
  ) {
    this.#historyRepository = historyRepository;
    this.#objectLister = objectLister;
    this.#gcExecution = gcExecution;
  }

  async run(inputs: GcCliInputs): Promise<GcRunOutcome> {
    const snapshots = await this.#historyRepository.recentSnapshots(inputs.windowSize);
    const retained = RetainedHashes.fromSnapshots(snapshots);

    const buckets: BucketGcOutcome[] = [];
    for (const bucket of inputs.target.buckets()) {
      const objectKeys = await this.#objectLister.list(bucket);
      const hashedTiles = extractHashedTileFilenames(objectKeys);
      const plan = retained.difference(hashedTiles);
      const executionResult = await this.#gcExecution.execute(bucket, plan);
      buckets.push({ bucket, retained, plan, executionResult });
    }

    return { inputs, retained, buckets };
  }
}
