interface CachedFetcherOptions<T> {
  fetch: () => Promise<T>;
  validate?: (data: T) => boolean;
  validationError?: string;
}

export class CachedFetcher<T> {
  private cache: T | null = null;
  private pending: Promise<T> | null = null;
  private readonly fetchFn: () => Promise<T>;
  private readonly validateFn?: (data: T) => boolean;
  private readonly validationError: string;

  constructor(options: CachedFetcherOptions<T>) {
    this.fetchFn = options.fetch;
    this.validateFn = options.validate;
    this.validationError = options.validationError ?? 'Validation failed';
  }

  async load(): Promise<T> {
    if (this.cache !== null) {
      return this.cache;
    }

    if (this.pending) {
      return this.pending;
    }

    this.pending = this.fetchFn().then((data) => {
      if (this.validateFn && !this.validateFn(data)) {
        throw new Error(this.validationError);
      }
      this.cache = data;
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
    this.pending = null;
  }
}
