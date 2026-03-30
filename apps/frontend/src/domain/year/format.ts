export function formatYear(year: number): string {
  if (year < 0) {
    return `前${Math.abs(year)}`;
  }
  return String(year);
}
