import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CloudflareApiCredentials } from './src/cloudflare-credentials.ts';
import { GcCliInputs } from './src/gc-cli-inputs.ts';
import { gcExecutionFor } from './src/gc-execution.ts';
import { ConsoleGcReporter } from './src/gc-reporter.ts';
import { GcUseCase } from './src/gc-use-case.ts';
import { GitManifestHistoryRepository } from './src/manifest-history.ts';
import { WranglerObjectDeleter } from './src/r2-object-deleter.ts';
import { CloudflareApiObjectLister } from './src/r2-object-lister.ts';

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');

async function main(): Promise<void> {
  const inputs = GcCliInputs.fromEnv(process.env);
  const historyRepo = new GitManifestHistoryRepository(REPO_ROOT);
  const objectLister = new CloudflareApiObjectLister(CloudflareApiCredentials.fromEnv(process.env));
  const objectDeleter = new WranglerObjectDeleter(REPO_ROOT);
  const gcExecution = gcExecutionFor(inputs.dryRun, objectDeleter);
  const reporter = new ConsoleGcReporter();
  const useCase = new GcUseCase(historyRepo, objectLister, gcExecution);

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
