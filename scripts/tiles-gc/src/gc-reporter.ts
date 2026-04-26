import type { GcCliInputs } from './gc-cli-inputs.ts';
import type { BucketGcOutcome, GcRunOutcome } from './gc-use-case.ts';

export class ConsoleGcReporter {
  printHeader(inputs: GcCliInputs): void {
    console.log(
      `Tiles GC — dry_run=${inputs.dryRun}, window_size=${inputs.windowSize}, target=${inputs.target.label()}`,
    );
  }

  printRetained(outcome: GcRunOutcome): void {
    console.log(
      `\nRetained hashes from last ${outcome.inputs.windowSize} manifest commits: ${outcome.retained.size}`,
    );
  }

  printBucketOutcome(outcome: BucketGcOutcome): void {
    console.log(`\nBucket: ${outcome.bucket}`);
    console.log(`  Retained: ${outcome.retained.size} hashes referenced in window`);
    console.log(`  Candidates: ${outcome.plan.size}`);
    for (const key of outcome.plan.candidates()) {
      const label =
        outcome.executionResult.mode === 'dry-run' ? '[DRY RUN] would delete' : 'deleted';
      console.log(`    ${label}: ${key}`);
    }
    if (outcome.executionResult.mode === 'live') {
      console.log(`  Deleted: ${outcome.executionResult.deleted}`);
    }
  }
}
