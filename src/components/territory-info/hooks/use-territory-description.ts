import { useEffect, useState } from 'react';
import type { TerritoryDescription } from '../../../types';

/**
 * Result of the useTerritoryDescription hook
 */
interface UseTerritoryDescriptionResult {
  /** Territory description data, null if not found or loading */
  description: TerritoryDescription | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message, null if no error */
  error: string | null;
}

/**
 * Converts a territory name to kebab-case for filename
 * e.g., "England and Ireland" -> "england-and-ireland"
 */
function toKebabCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Constructs the URL for fetching territory description
 */
function buildDescriptionUrl(territoryName: string, year: number): string {
  const kebabName = toKebabCase(territoryName);
  return `/data/descriptions/${year}/${kebabName}.json`;
}

/**
 * Hook to fetch and manage territory description data
 *
 * Fetches AI-generated historical description for a given territory
 * and year combination. Handles loading states and errors gracefully.
 *
 * @param territoryName - Name of the territory (null if none selected)
 * @param year - Year for the description
 * @returns Description data, loading state, and any error
 *
 * @example
 * ```tsx
 * function TerritoryPanel() {
 *   const { description, isLoading, error } = useTerritoryDescription('France', 1650);
 *
 *   if (isLoading) return <Spinner />;
 *   if (!description) return <NoDescriptionMessage />;
 *   return <TerritoryDetails data={description} />;
 * }
 * ```
 */
export function useTerritoryDescription(
  territoryName: string | null,
  year: number,
): UseTerritoryDescriptionResult {
  const [description, setDescription] = useState<TerritoryDescription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when territory is deselected
    if (!territoryName) {
      setDescription(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function fetchDescription(name: string) {
      setIsLoading(true);
      setError(null);

      try {
        const url = buildDescriptionUrl(name, year);
        const response = await fetch(url);

        if (cancelled) return;

        if (!response.ok) {
          if (response.status === 404) {
            // 404 is expected for territories without descriptions
            setDescription(null);
            setIsLoading(false);
            return;
          }
          throw new Error(`Failed to fetch description: ${response.status}`);
        }

        // Check content-type to ensure we got JSON (Vite dev server returns HTML for 404s as SPA fallback)
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          // Not JSON - treat as "no description available"
          setDescription(null);
          setIsLoading(false);
          return;
        }

        const data: TerritoryDescription = await response.json();

        if (cancelled) return;

        setDescription(data);
      } catch (err) {
        if (cancelled) return;

        console.error('Error fetching territory description:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setDescription(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchDescription(territoryName);

    return () => {
      cancelled = true;
    };
  }, [territoryName, year]);

  return { description, isLoading, error };
}
