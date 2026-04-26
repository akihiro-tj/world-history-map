import { GcTarget } from './gc-target.ts';

export class GcCliInputs {
  readonly dryRun: boolean;
  readonly windowSize: number;
  readonly target: GcTarget;

  private constructor(dryRun: boolean, windowSize: number, target: GcTarget) {
    this.dryRun = dryRun;
    this.windowSize = windowSize;
    this.target = target;
  }

  static fromEnv(env: NodeJS.ProcessEnv): GcCliInputs {
    const dryRun = env['DRY_RUN'] !== 'false';

    const rawWindowSize = Number(env['WINDOW_SIZE'] ?? '3');
    if (!Number.isInteger(rawWindowSize) || rawWindowSize <= 0) {
      throw new Error(`Invalid WINDOW_SIZE: "${env['WINDOW_SIZE']}". Must be a positive integer.`);
    }

    const target = GcTarget.parse(env['TARGET_ENV'] ?? 'both');

    return new GcCliInputs(dryRun, rawWindowSize, target);
  }
}
