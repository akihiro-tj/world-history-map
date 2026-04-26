import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CloudflareApiCredentials } from './src/cloudflare-credentials.ts';
import { GcCliInputs } from './src/gc-cli-inputs.ts';
import { gcExecutionFor } from './src/gc-execution.ts';
import { ConsoleGcReporter } from './src/gc-reporter.ts';
import { GcUseCase } from './src/gc-use-case.ts';
import { GitManifestHistoryRepository } from './src/manifest-history.ts';
import { WranglerR2BucketRepository } from './src/r2-bucket.ts';

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');

async function main(): Promise<void> {
  const inputs = GcCliInputs.fromEnv(process.env);
  const historyRepo = new GitManifestHistoryRepository(REPO_ROOT);
  const r2Repo = new WranglerR2BucketRepository(
    REPO_ROOT,
    CloudflareApiCredentials.fromEnv(process.env),
  );
  const gcExecution = gcExecutionFor(inputs.dryRun, r2Repo);
  const reporter = new ConsoleGcReporter();
  const useCase = new GcUseCase(historyRepo, r2Repo, gcExecution);

  const outcome = await useCase.run(inputs);

  reporter.printHeader(inputs);
  reporter.printRetained(outcome);
  for (const bucketOutcome of outcome.buckets) {
    reporter.printBucketOutcome(bucketOutcome);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
