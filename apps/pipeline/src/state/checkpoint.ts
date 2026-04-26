import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import type { PipelineState, YearState } from '@/types/pipeline.ts';

type YearStageKey = keyof YearState;

const STAGE_ORDER: YearStageKey[] = ['source', 'merge', 'validate', 'convert'];

export class PipelineCheckpoint {
  private readonly state: PipelineState;
  private readonly filePath: string;

  private constructor(state: PipelineState, filePath: string) {
    this.state = state;
    this.filePath = filePath;
  }

  static create(filePath: string): PipelineCheckpoint {
    const now = new Date().toISOString();
    const suffix = randomBytes(2).toString('hex');
    return new PipelineCheckpoint(
      {
        version: 1,
        runId: `${now}-${suffix}`,
        startedAt: now,
        completedAt: null,
        status: 'running',
        stages: {},
        years: {},
      },
      filePath,
    );
  }

  static load(filePath: string): PipelineCheckpoint | null {
    if (!existsSync(filePath)) {
      return null;
    }
    try {
      const content = readFileSync(filePath, 'utf-8');
      const state = JSON.parse(content) as PipelineState;
      return new PipelineCheckpoint(state, filePath);
    } catch {
      return null;
    }
  }

  static loadOrCreate(filePath: string): PipelineCheckpoint {
    const loaded = PipelineCheckpoint.load(filePath);
    if (loaded && loaded.status !== 'completed' && loaded.status !== 'failed') {
      return loaded;
    }
    return PipelineCheckpoint.create(filePath);
  }

  get runId(): string {
    return this.state.runId;
  }

  get status(): PipelineState['status'] {
    return this.state.status;
  }

  get startedAt(): string {
    return this.state.startedAt;
  }

  get yearKeys(): string[] {
    return Object.keys(this.state.years);
  }

  getYearState(year: number): Readonly<YearState> | undefined {
    return this.state.years[String(year)];
  }

  get stages(): PipelineState['stages'] {
    return this.state.stages;
  }

  shouldProcess(year: number, stage: YearStageKey, sourceHash: string): boolean {
    const yearState = this.state.years[String(year)];

    if (!yearState) {
      return true;
    }

    if (yearState.source && yearState.source.hash !== sourceHash) {
      return true;
    }

    if (!yearState[stage]) {
      return true;
    }

    return false;
  }

  updateYear(year: number, stage: YearStageKey, data: NonNullable<YearState[typeof stage]>): void {
    const yearKey = String(year);
    if (!this.state.years[yearKey]) {
      this.state.years[yearKey] = {};
    }
    const yearState = this.state.years[yearKey];
    if (yearState) {
      (yearState[stage] as NonNullable<YearState[typeof stage]>) = data;
    }
  }

  invalidateDownstream(year: number, fromStage: YearStageKey): void {
    const yearState = this.state.years[String(year)];
    if (!yearState) return;

    const fromIndex = STAGE_ORDER.indexOf(fromStage);
    for (let i = fromIndex + 1; i < STAGE_ORDER.length; i++) {
      const key = STAGE_ORDER[i];
      if (key) {
        delete yearState[key];
      }
    }
  }

  setFetchStage(commitHash: string): void {
    this.state.stages.fetch = {
      completedAt: new Date().toISOString(),
      sourceCommitHash: commitHash,
    };
  }

  complete(): void {
    this.state.status = 'completed';
    this.state.completedAt = new Date().toISOString();
    this.persist();
  }

  fail(): void {
    this.state.status = 'failed';
    this.persist();
  }

  persist(): void {
    const tempPath = `${this.filePath}.tmp.${process.pid}`;
    writeFileSync(tempPath, JSON.stringify(this.state, null, 2));
    renameSync(tempPath, this.filePath);
  }
}
