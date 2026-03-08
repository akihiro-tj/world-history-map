import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import type { PipelineLogger } from '@/stages/types.ts';
import { validateDescriptionFile } from '@/stages/validate-descriptions.ts';

interface TerritoryProfile {
  capital?: string;
  regime?: string;
  dynasty?: string;
  leader?: string;
  religion?: string;
}

interface KeyEvent {
  year: number;
  event: string;
}

interface TerritoryDescription {
  name: string;
  era?: string;
  profile?: TerritoryProfile;
  context?: string;
  keyEvents?: KeyEvent[];
}

type YearDescriptionBundle = Record<string, TerritoryDescription>;

export interface TransformedEntry {
  year: number;
  territoryId: string;
  description: TerritoryDescription;
}

export interface YearBundle {
  year: number;
  bundle: YearDescriptionBundle;
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

function parseYear(yearStr: string): number {
  const trimmed = yearStr.trim();
  if (trimmed.startsWith('前')) {
    return -Number(trimmed.slice(1));
  }
  return Number(trimmed);
}

export function parseKeyEvents(raw: string): KeyEvent[] | undefined {
  if (!raw) return undefined;

  const pairs = raw.split('|');
  return pairs.map((pair) => {
    const colonIndex = pair.indexOf(':');
    const yearStr = pair.substring(0, colonIndex);
    const event = pair.substring(colonIndex + 1);
    return { year: parseYear(yearStr), event };
  });
}

export function transformNotionPage(page: PageObjectResponse): TransformedEntry {
  const props = page.properties;

  const year = extractNumber(props['year']);
  if (year === null) throw new Error(`Page ${page.id} has no year`);

  const territoryId = extractPlainText(props['territory_id']);
  if (!territoryId) throw new Error(`Page ${page.id} has no territory_id`);

  const name = extractPlainText(props['name']);
  if (!name) throw new Error(`Page ${page.id} has no name`);

  const era = extractPlainText(props['era']);
  const capital = extractPlainText(props['capital']);
  const regime = extractPlainText(props['regime']);
  const dynasty = extractPlainText(props['dynasty']);
  const leader = extractPlainText(props['leader']);
  const religion = extractPlainText(props['religion']);
  const context = extractPlainText(props['context']);
  const keyEventsRaw = extractPlainText(props['key_events']);

  const profile: TerritoryProfile = {};
  if (capital) profile.capital = capital;
  if (regime) profile.regime = regime;
  if (dynasty) profile.dynasty = dynasty;
  if (leader) profile.leader = leader;
  if (religion) profile.religion = religion;

  const hasProfile = Object.keys(profile).length > 0;
  const keyEvents = keyEventsRaw ? parseKeyEvents(keyEventsRaw) : undefined;

  const description: TerritoryDescription = { name };
  if (era) description.era = era;
  if (hasProfile) description.profile = profile;
  if (context) description.context = context;
  if (keyEvents) description.keyEvents = keyEvents;

  return { year, territoryId, description };
}

export function groupByYear(entries: TransformedEntry[]): YearBundle[] {
  const map = new Map<number, YearDescriptionBundle>();

  for (const entry of entries) {
    if (!map.has(entry.year)) {
      map.set(entry.year, {});
    }
    const bundle = map.get(entry.year);
    if (bundle) bundle[entry.territoryId] = entry.description;
  }

  return Array.from(map.entries()).map(([year, bundle]) => ({ year, bundle }));
}

export async function syncDescriptions(
  outputDir: string,
  logger: PipelineLogger,
  options?: { year?: number },
): Promise<void> {
  const { NOTION } = await import('@/config.ts');
  const token = NOTION.getToken();
  const dataSourceId = NOTION.getDataSourceId();

  const notion = new Client({ auth: token });

  logger.info('sync-descriptions', 'Fetching pages from Notion data source...');

  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      ...(cursor !== undefined && { start_cursor: cursor }),
      ...(options?.year !== undefined && {
        filter: { property: 'year', number: { equals: options.year } },
      }),
    });

    for (const page of response.results) {
      if (page.object === 'page' && 'properties' in page) {
        pages.push(page as PageObjectResponse);
      }
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  logger.info('sync-descriptions', `Fetched ${pages.length} pages`);

  const entries: TransformedEntry[] = [];
  const transformErrors: string[] = [];

  for (const page of pages) {
    try {
      entries.push(transformNotionPage(page));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      transformErrors.push(msg);
      logger.error('sync-descriptions', msg);
    }
  }

  if (transformErrors.length > 0) {
    logger.warn('sync-descriptions', `${transformErrors.length} pages failed to transform`);
  }

  const bundles = groupByYear(entries);
  mkdirSync(outputDir, { recursive: true });

  let validationErrors = 0;

  for (const { year, bundle } of bundles) {
    const filePath = path.join(outputDir, `${year}.json`);
    writeFileSync(filePath, `${JSON.stringify(bundle, null, 2)}\n`);

    const validation = validateDescriptionFile(filePath);
    if (!validation.valid) {
      validationErrors++;
      for (const err of validation.errors) {
        logger.error('sync-descriptions', `${year}.json: ${err}`);
      }
    }
  }

  logger.info('sync-descriptions', `Wrote ${bundles.length} year files to ${outputDir}`);

  if (validationErrors > 0) {
    throw new Error(`Validation failed for ${validationErrors} file(s). Check logs for details.`);
  }
}
