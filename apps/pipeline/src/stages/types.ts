import type { PipelineState } from '@/types/pipeline.ts';

export interface PipelineStage<TInput, TOutput> {
  name: string;
  execute(input: TInput, context: PipelineContext): Promise<TOutput>;
}

export interface PipelineContext {
  state: PipelineState;
  years: number[];
  logger: PipelineLogger;
  dryRun: boolean;
}

export interface PipelineLogger {
  info(stage: string, message: string): void;
  warn(stage: string, message: string): void;
  error(stage: string, message: string): void;
  timing(stage: string, durationMs: number): void;
}

export function createLogger(verbose: boolean): PipelineLogger {
  const timestamp = (): string => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return {
    info(stage: string, message: string): void {
      console.log(`[${timestamp()}] [${stage}] ${message}`);
    },
    warn(stage: string, message: string): void {
      console.warn(`[${timestamp()}] [${stage}] ⚠ ${message}`);
    },
    error(stage: string, message: string): void {
      console.error(`[${timestamp()}] [${stage}] ✗ ${message}`);
    },
    timing(stage: string, durationMs: number): void {
      if (verbose) {
        const seconds = (durationMs / 1000).toFixed(1);
        console.log(`[${timestamp()}] [${stage}] completed in ${seconds}s`);
      }
    },
  };
}
