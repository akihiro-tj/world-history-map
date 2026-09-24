import type { City } from "../data/city";
import { normalizeForSearch } from "./normalize";

export { normalizeForSearch };

export const MAX_SUGGESTIONS = 10;

// 表示名と読みのどれかに一致する都市を、前方一致 → 部分一致の順に返す
export function searchCities(
  cities: readonly City[],
  query: string,
  limit = MAX_SUGGESTIONS,
): City[] {
  const normalizedQuery = normalizeForSearch(query);
  if (normalizedQuery === "") {
    return [];
  }
  const prefixMatches: City[] = [];
  const partialMatches: City[] = [];
  for (const city of cities) {
    const keys = [city.name, ...city.reading.split(" ")].map(normalizeForSearch);
    if (keys.some((key) => key.startsWith(normalizedQuery))) {
      prefixMatches.push(city);
    } else if (keys.some((key) => key.includes(normalizedQuery))) {
      partialMatches.push(city);
    }
  }
  return [...prefixMatches, ...partialMatches].slice(0, limit);
}
