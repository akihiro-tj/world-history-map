interface CachedFetcherOptions<T> {
  fetch: () => Promise<T>;
  validate?: (data: T) => boolean;
  validationError?: string;
}

export class CachedFetcher<T> {
  private cache: T | null = null;
  private hasCache = false;
  private pending: Promise<T> | null = null;
  private generation = 0;
  private readonly fetchFn: () => Promise<T>;
  private readonly validateFn: ((data: T) => boolean) | undefined;
  private readonly validationError: string;

  constructor(options: CachedFetcherOptions<T>) {
    this.fetchFn = options.fetch;
    this.validateFn = options.validate;
    this.validationError = options.validationError ?? 'Validation failed';
  }

  async load(): Promise<T> {
    if (this.hasCache) {
      return this.cache as T;
    }

    if (this.pending) {
      return this.pending;
    }

    const currentGeneration = this.generation;
    this.pending = this.fetchFn().then((data) => {
      if (this.generation !== currentGeneration) {
        throw new Error('Cache was cleared during fetch');
      }
      if (this.validateFn && !this.validateFn(data)) {
        throw new Error(this.validationError);
      }
      this.cache = data;
      this.hasCache = true;
      this.pending = null;
      return data;
    });

    this.pending.catch(() => {
      this.pending = null;
    });

    return this.pending;
  }

  get(): T | null {
    return this.cache;
  }

  clear(): void {
    this.cache = null;
    this.hasCache = false;
    this.pending = null;
    this.generation++;
  }
}
