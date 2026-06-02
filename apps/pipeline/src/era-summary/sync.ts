import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { NOTION_ERA_SUMMARY_PROPERTY, YearPaths } from '@/config.ts';
import type {
  EraSummary,
  EraSummaryReference,
  RegionCard,
} from '@/domain/era-summary/era-summary.ts';
import { isRegionId, REGION_IDS } from '@/domain/era-summary/region-id.ts';
import {
  validateEraSummaryFile,
  type YearTerritories,
  type YearTerritoriesResolver,
} from '@/era-summary/validate.ts';
import type { PipelineLogger } from '@/shared/logger.ts';

export interface RegionEntry {
  year: number;
  regionCard: RegionCard;
  order: number | null;
}

function extractPlainText(
  notionProperty: PageObjectResponse['properties'][string] | undefined,
): string | undefined {
  if (!notionProperty) return undefined;
  if (notionProperty.type === 'title') {
    const text = notionProperty.title.map((richTextItem) => richTextItem.plain_text).join('');
    return text || undefined;
  }
  if (notionProperty.type === 'rich_text') {
    const text = notionProperty.rich_text.map((richTextItem) => richTextItem.plain_text).join('');
    return text || undefined;
  }
  return undefined;
}

function extractNumber(
  notionProperty: PageObjectResponse['properties'][string] | undefined,
): number | null {
  if (notionProperty?.type === 'number') {
    return notionProperty.number;
  }
  return null;
}

function extractSelect(
  notionProperty: PageObjectResponse['properties'][string] | undefined,
): string | null {
  if (notionProperty?.type === 'select') {
    return notionProperty.select?.name ?? null;
  }
  return null;
}

function parseReferences(
  raw: string | undefined,
  pageId: string,
  logger: Pick<PipelineLogger, 'warn'>,
): EraSummaryReference[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as EraSummaryReference[];
  } catch {
    logger.warn('sync-era-summaries', `malformed References JSON on page ${pageId}, using []`);
    return [];
  }
}

export function transformNotionPage(
  page: PageObjectResponse,
  logger: Pick<PipelineLogger, 'warn'> = {
    warn: (_stage, message) => console.warn(message),
  },
): RegionEntry {
  const notionProperties = page.properties;

  const year = extractNumber(notionProperties[NOTION_ERA_SUMMARY_PROPERTY.YEAR]);
  if (year === null) throw new Error(`Page ${page.id} has no Year`);

  const regionRaw = extractSelect(notionProperties[NOTION_ERA_SUMMARY_PROPERTY.REGION]);
  if (!regionRaw) throw new Error(`Page ${page.id} has no Region`);
  if (!isRegionId(regionRaw)) throw new Error(`Page ${page.id} has invalid Region: ${regionRaw}`);

  const title = extractPlainText(notionProperties[NOTION_ERA_SUMMARY_PROPERTY.TITLE]);
  if (!title) throw new Error(`Page ${page.id} has no Title`);

  const context = extractPlainText(notionProperties[NOTION_ERA_SUMMARY_PROPERTY.CONTEXT]);
  if (!context) throw new Error(`Page ${page.id} has no Context`);

  const referencesRaw = extractPlainText(notionProperties[NOTION_ERA_SUMMARY_PROPERTY.REFERENCES]);
  const references = parseReferences(referencesRaw, page.id, logger);

  const order = extractNumber(notionProperties[NOTION_ERA_SUMMARY_PROPERTY.ORDER]);

  return {
    year,
    regionCard: { region: regionRaw, title, context, references },
    order,
  };
}

export class EraSummaryRegions {
  readonly #entriesByYear = new Map<number, RegionEntry[]>();

  add(entry: RegionEntry): void {
    const { year, regionCard } = entry;
    const existingEntries = this.#entriesByYear.get(year);
    const entries = existingEntries ?? [];

    const isDuplicate = entries.some(
      (existing) => existing.regionCard.region === regionCard.region,
    );
    if (isDuplicate) {
      throw new Error(`Duplicate Year×Region: year=${year}, region=${regionCard.region}`);
    }

    entries.push(entry);
    if (existingEntries === undefined) {
      this.#entriesByYear.set(year, entries);
    }
  }

  build(): EraSummary[] {
    return Array.from(this.#entriesByYear.entries()).map(([year, entries]) => ({
      year,
      regions: [...entries]
        .sort((a, b) => this.#compareEntries(a, b))
        .map((entry) => entry.regionCard),
    }));
  }

  /**
   * Cards with an explicit Order sort first (ascending), then cards without one
   * in canonical REGION_IDS order. Explicit cards always precede fallback cards
   * regardless of the Order value, and ties on equal Order break by canonical
   * order, so the result never depends on the nondeterministic Notion fetch order.
   */
  #compareEntries(a: RegionEntry, b: RegionEntry): number {
    if (a.order !== null && b.order !== null) {
      return a.order - b.order || this.#canonicalIndex(a) - this.#canonicalIndex(b);
    }
    if (a.order !== null) return -1;
    if (b.order !== null) return 1;
    return this.#canonicalIndex(a) - this.#canonicalIndex(b);
  }

  #canonicalIndex(entry: RegionEntry): number {
    return REGION_IDS.indexOf(entry.regionCard.region);
  }
}

async function fetchAllPages(
  notion: Client,
  dataSourceId: string,
  yearFilter?: number,
): Promise<PageObjectResponse[]> {
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      ...(cursor !== undefined && { start_cursor: cursor }),
      ...(yearFilter !== undefined && {
        filter: { property: NOTION_ERA_SUMMARY_PROPERTY.YEAR, number: { equals: yearFilter } },
      }),
    });

    for (const page of response.results) {
      if (page.object === 'page' && 'properties' in page) {
        pages.push(page as PageObjectResponse);
      }
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return pages;
}

function transformPages(
  pages: PageObjectResponse[],
  logger: PipelineLogger,
): { entries: RegionEntry[]; errorCount: number } {
  const entries: RegionEntry[] = [];
  let errorCount = 0;

  for (const page of pages) {
    try {
      entries.push(transformNotionPage(page, logger));
    } catch (caughtError) {
      const errorMessage = caughtError instanceof Error ? caughtError.message : String(caughtError);
      errorCount++;
      logger.error('sync-era-summaries', errorMessage);
    }
  }

  return { entries, errorCount };
}

function readDescriptionIds(filePath: string): ReadonlySet<string> | null {
  if (!existsSync(filePath)) return null;
  return new Set(
    Object.keys(JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, unknown>),
  );
}

function readGeojsonNames(filePath: string): ReadonlySet<string> | null {
  if (!existsSync(filePath)) return null;

  const geojson = JSON.parse(readFileSync(filePath, 'utf-8')) as {
    features?: { properties?: Record<string, unknown> }[];
  };
  const names = new Set<string>();
  for (const feature of geojson.features ?? []) {
    const name = feature.properties?.['NAME'];
    if (typeof name === 'string') names.add(name);
  }
  return names;
}

function createYearTerritoriesResolver(): YearTerritoriesResolver {
  const cache = new Map<number, YearTerritories>();

  return (year) => {
    const cached = cache.get(year);
    if (cached !== undefined) return cached;

    const yearPaths = new YearPaths(year);
    const territories: YearTerritories = {
      descriptionIds: readDescriptionIds(yearPaths.descriptionsPath),
      geojsonNames: readGeojsonNames(yearPaths.mergedGeojsonPath),
    };

    cache.set(year, territories);
    return territories;
  };
}

function writeSummaries(
  summaries: EraSummary[],
  outputDir: string,
  resolveYearTerritories: YearTerritoriesResolver,
  logger: PipelineLogger,
): void {
  mkdirSync(outputDir, { recursive: true });

  let validationErrors = 0;

  for (const summary of summaries) {
    const filePath = path.join(outputDir, `${summary.year}.json`);
    writeFileSync(filePath, `${JSON.stringify(summary, null, 2)}\n`);

    const validation = validateEraSummaryFile(filePath, resolveYearTerritories);
    if (!validation.valid) {
      validationErrors++;
      for (const validationError of validation.errors) {
        logger.error('sync-era-summaries', `${summary.year}.json: ${validationError}`);
      }
    }
  }

  logger.info('sync-era-summaries', `Wrote ${summaries.length} year files to ${outputDir}`);

  if (validationErrors > 0) {
    throw new Error(`Validation failed for ${validationErrors} file(s). Check logs for details.`);
  }
}

export async function syncEraSummaries(
  outputDir: string,
  logger: PipelineLogger,
  options?: { year?: number },
): Promise<void> {
  const { NOTION } = await import('@/config.ts');
  const notion = new Client({ auth: NOTION.getToken() });
  const dataSourceId = NOTION.getEraSummaryDataSourceId();

  logger.info('sync-era-summaries', 'Fetching pages from Notion Era Summary data source...');
  const pages = await fetchAllPages(notion, dataSourceId, options?.year);
  logger.info('sync-era-summaries', `Fetched ${pages.length} pages`);

  const { entries, errorCount } = transformPages(pages, logger);
  if (errorCount > 0) {
    logger.warn('sync-era-summaries', `${errorCount} pages failed to transform`);
  }

  const regions = new EraSummaryRegions();
  for (const entry of entries) {
    regions.add(entry);
  }

  writeSummaries(regions.build(), outputDir, createYearTerritoriesResolver(), logger);
}
