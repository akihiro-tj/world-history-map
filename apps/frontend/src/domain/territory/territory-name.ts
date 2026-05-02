export class TerritoryName {
  private readonly value: string;

  constructor(value: string) {
    this.value = value;
  }

  toLookupKey(): string {
    return this.value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }
}
