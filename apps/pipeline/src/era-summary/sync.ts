import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { NOTION_ERA_SUMMARY_PROPERTY } from '@/config.ts';
import { REGION_IDS, type RegionId } from '@/domain/era-summary/region-id.ts';
import { validateEraSummaryFile } from '@/era-summary/validate.ts';
import type { PipelineLogger } from '@/shared/logger.ts';

interface EraSummaryReference {
  kind: 'territory' | 'year';
  target: string;
  text: string;
}

interface RegionCard {
  region: RegionId;
  title: string;
  context: string;
  references: EraSummaryReference[];
}

interface EraSummary {
  year: number;
  regions: RegionCard[];
}

export interface RegionEntry {
  year: number;
  regionCard: RegionCard;
}

function extractPlainText(
  prop: PageObjectResponse['properties'][string] | undefined,
): string | undefined {
  if (!prop) return undefined;
  if (prop.type === 'title') {
    const text = prop.title.map((richTextItem) => richTextItem.plain_text).join('');
    return text || undefined;
  }
  if (prop.type === 'rich_text') {
    const text = prop.rich_text.map((richTextItem) => richTextItem.plain_text).join('');
    return text || undefined;
  }
  return undefined;
}

function extractNumber(prop: PageObjectResponse['properties'][string] | undefined): number | null {
  if (prop?.type === 'number') {
    return prop.number;
  }
  return null;
}

function extractSelect(prop: PageObjectResponse['properties'][string] | undefined): string | null {
  if (prop?.type === 'select') {
    return prop.select?.name ?? null;
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

function isValidRegionId(value: string): value is RegionId {
  return (REGION_IDS as readonly string[]).includes(value);
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
  if (!isValidRegionId(regionRaw))
    throw new Error(`Page ${page.id} has invalid Region: ${regionRaw}`);

  const title = extractPlainText(notionProperties[NOTION_ERA_SUMMARY_PROPERTY.TITLE]);
  if (!title) throw new Error(`Page ${page.id} has no Title`);

  const context = extractPlainText(notionProperties[NOTION_ERA_SUMMARY_PROPERTY.CONTEXT]);
  if (!context) throw new Error(`Page ${page.id} has no Context`);

  const referencesRaw = extractPlainText(notionProperties[NOTION_ERA_SUMMARY_PROPERTY.REFERENCES]);
  const references = parseReferences(referencesRaw, page.id, logger);

  return {
    year,
    regionCard: { region: regionRaw, title, context, references },
  };
}

export class EraSummaryRegions {
  readonly #cardsByYear = new Map<number, RegionCard[]>();

  add(entry: RegionEntry): void {
    const { year, regionCard } = entry;
    if (!this.#cardsByYear.has(year)) {
      this.#cardsByYear.set(year, []);
    }
    const cards = this.#cardsByYear.get(year);
    if (!cards) return;

    const isDuplicate = cards.some((card) => card.region === regionCard.region);
    if (isDuplicate) {
      throw new Error(`Duplicate Year×Region: year=${year}, region=${regionCard.region}`);
    }

    cards.push(regionCard);
  }

  build(): EraSummary[] {
    return Array.from(this.#cardsByYear.entries()).map(([year, regions]) => ({ year, regions }));
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
        filter: { property: 'Year', number: { equals: yearFilter } },
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

function writeSummaries(summaries: EraSummary[], outputDir: string, logger: PipelineLogger): void {
  mkdirSync(outputDir, { recursive: true });

  let validationErrors = 0;

  for (const summary of summaries) {
    const filePath = path.join(outputDir, `${summary.year}.json`);
    writeFileSync(filePath, `${JSON.stringify(summary, null, 2)}\n`);

    const validation = validateEraSummaryFile(filePath);
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

  writeSummaries(regions.build(), outputDir, logger);
}
