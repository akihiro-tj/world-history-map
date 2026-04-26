import type { HashedFilename } from '@world-history-map/tiles';

export class DeletionPlan {
  readonly #keys: readonly HashedFilename[];

  private constructor(keys: readonly HashedFilename[]) {
    this.#keys = keys;
  }

  static empty(): DeletionPlan {
    return new DeletionPlan([]);
  }

  static fromCandidates(candidates: readonly HashedFilename[]): DeletionPlan {
    return new DeletionPlan([...candidates]);
  }

  get size(): number {
    return this.#keys.length;
  }

  candidates(): readonly HashedFilename[] {
    return [...this.#keys];
  }
}
