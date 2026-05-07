import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import type { PipelineLogger } from '@/stages/types.ts';
import { validateEraSummaryFile } from '@/stages/validate-era-summaries.ts';

type RegionId =
  | 'europe'
  | 'east-asia'
  | 'southeast-asia'
  | 'south-asia'
  | 'middle-east-north-africa'
  | 'sub-saharan-africa'
  | 'americas'
  | 'oceania';

const VALID_REGION_IDS: readonly RegionId[] = [
  'europe',
  'east-asia',
  'southeast-asia',
  'south-asia',
  'middle-east-north-africa',
  'sub-saharan-africa',
  'americas',
  'oceania',
];

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

export interface TransformedRegionEntry {
  year: number;
  regionCard: RegionCard;
}

function extractPlainText(
  prop: PageObjectResponse['properties'][string] | undefined,
): string | undefined {
  if (!prop) return undefined;
  if (prop.type === 'title') {
    const text = prop.title.map((t) => t.plain_text).join('');
    return text || undefined;
  }
  if (prop.type === 'rich_text') {
    const text = prop.rich_text.map((t) => t.plain_text).join('');
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

function parseReferences(raw: string | undefined, pageId: string): EraSummaryReference[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as EraSummaryReference[];
  } catch {
    console.warn(`sync-era-summaries: malformed References JSON on page ${pageId}, using []`);
    return [];
  }
}

function isValidRegionId(value: string): value is RegionId {
  return (VALID_REGION_IDS as readonly string[]).includes(value);
}

export function transformNotionPage(page: PageObjectResponse): TransformedRegionEntry {
  const props = page.properties;

  const year = extractNumber(props['Year']);
  if (year === null) throw new Error(`Page ${page.id} has no Year`);

  const regionRaw = extractSelect(props['Region']);
  if (!regionRaw) throw new Error(`Page ${page.id} has no Region`);
  if (!isValidRegionId(regionRaw))
    throw new Error(`Page ${page.id} has invalid Region: ${regionRaw}`);

  const title = extractPlainText(props['Title']);
  if (!title) throw new Error(`Page ${page.id} has no Title`);

  const context = extractPlainText(props['Context']);
  if (!context) throw new Error(`Page ${page.id} has no Context`);

  const referencesRaw = extractPlainText(props['References']);
  const references = parseReferences(referencesRaw, page.id);

  return {
    year,
    regionCard: { region: regionRaw, title, context, references },
  };
}

export function groupByYear(entries: TransformedRegionEntry[]): EraSummary[] {
  const map = new Map<number, RegionCard[]>();

  for (const { year, regionCard } of entries) {
    if (!map.has(year)) {
      map.set(year, []);
    }
    const cards = map.get(year);
    if (!cards) continue;

    const isDuplicate = cards.some((c) => c.region === regionCard.region);
    if (isDuplicate) {
      throw new Error(`Duplicate Year×Region: year=${year}, region=${regionCard.region}`);
    }

    cards.push(regionCard);
  }

  return Array.from(map.entries()).map(([year, regions]) => ({ year, regions }));
}

export async function syncEraSummaries(
  outputDir: string,
  logger: PipelineLogger,
  options?: { year?: number },
): Promise<void> {
  const { NOTION } = await import('@/config.ts');
  const token = NOTION.getToken();
  const dataSourceId = NOTION.getEraSummaryDataSourceId();

  const notion = new Client({ auth: token });

  logger.info('sync-era-summaries', 'Fetching pages from Notion Era Summary data source...');

  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      ...(cursor !== undefined && { start_cursor: cursor }),
      ...(options?.year !== undefined && {
        filter: { property: 'Year', number: { equals: options.year } },
      }),
    });

    for (const page of response.results) {
      if (page.object === 'page' && 'properties' in page) {
        pages.push(page as PageObjectResponse);
      }
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  logger.info('sync-era-summaries', `Fetched ${pages.length} pages`);

  const entries: TransformedRegionEntry[] = [];
  const transformErrors: string[] = [];

  for (const page of pages) {
    try {
      entries.push(transformNotionPage(page));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      transformErrors.push(msg);
      logger.error('sync-era-summaries', msg);
    }
  }

  if (transformErrors.length > 0) {
    logger.warn('sync-era-summaries', `${transformErrors.length} pages failed to transform`);
  }

  const summaries = groupByYear(entries);
  mkdirSync(outputDir, { recursive: true });

  let validationErrors = 0;

  for (const summary of summaries) {
    const filePath = path.join(outputDir, `${summary.year}.json`);
    writeFileSync(filePath, `${JSON.stringify(summary, null, 2)}\n`);

    const validation = validateEraSummaryFile(filePath);
    if (!validation.valid) {
      validationErrors++;
      for (const err of validation.errors) {
        logger.error('sync-era-summaries', `${summary.year}.json: ${err}`);
      }
    }
  }

  logger.info('sync-era-summaries', `Wrote ${summaries.length} year files to ${outputDir}`);

  if (validationErrors > 0) {
    throw new Error(`Validation failed for ${validationErrors} file(s). Check logs for details.`);
  }
}
