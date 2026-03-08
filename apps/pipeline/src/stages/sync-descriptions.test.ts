import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { describe, expect, it } from 'vitest';
import { groupByYear, parseKeyEvents, transformNotionPage } from '@/stages/sync-descriptions.ts';

function richText(content: string): PageObjectResponse['properties'][string] {
  return {
    id: 'prop',
    type: 'rich_text' as const,
    rich_text: content
      ? [
          {
            type: 'text' as const,
            text: { content, link: null },
            plain_text: content,
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: 'default' as const,
            },
            href: null,
          },
        ]
      : [],
  };
}

function titleProp(content: string): PageObjectResponse['properties'][string] {
  return {
    id: 'title',
    type: 'title' as const,
    title: content
      ? [
          {
            type: 'text' as const,
            text: { content, link: null },
            plain_text: content,
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: 'default' as const,
            },
            href: null,
          },
        ]
      : [],
  };
}

function numberProp(value: number | null): PageObjectResponse['properties'][string] {
  return {
    id: 'num',
    type: 'number' as const,
    number: value,
  };
}

function createNotionPage(
  props: Record<string, PageObjectResponse['properties'][string]>,
): PageObjectResponse {
  return {
    id: 'page-id',
    object: 'page',
    created_time: '2026-01-01T00:00:00.000Z',
    last_edited_time: '2026-01-01T00:00:00.000Z',
    created_by: { id: 'user', object: 'user' },
    last_edited_by: { id: 'user', object: 'user' },
    cover: null,
    icon: null,
    parent: { type: 'database_id', database_id: 'db-id' },
    archived: false,
    in_trash: false,
    url: 'https://notion.so/page',
    public_url: null,
    properties: props,
  } as unknown as PageObjectResponse;
}

describe('sync-descriptions', () => {
  describe('parseKeyEvents', () => {
    it('should parse pipe-separated year:event pairs', () => {
      const result = parseKeyEvents('1643:ルイ14世即位|1789:フランス革命');

      expect(result).toEqual([
        { year: 1643, event: 'ルイ14世即位' },
        { year: 1789, event: 'フランス革命' },
      ]);
    });

    it('should return undefined for empty string', () => {
      expect(parseKeyEvents('')).toBeUndefined();
    });

    it('should handle events with colons in description', () => {
      const result = parseKeyEvents('1700:説明:補足情報');

      expect(result).toEqual([{ year: 1700, event: '説明:補足情報' }]);
    });

    it('should parse BC years with 前 prefix as negative numbers', () => {
      const result = parseKeyEvents('前202:劉邦が漢を建国|前141:武帝即位|8:王莽が新を建国');

      expect(result).toEqual([
        { year: -202, event: '劉邦が漢を建国' },
        { year: -141, event: '武帝即位' },
        { year: 8, event: '王莽が新を建国' },
      ]);
    });
  });

  describe('transformNotionPage', () => {
    it('should transform a full Notion page to TerritoryDescription', () => {
      const page = createNotionPage({
        year: numberProp(1700),
        territory_id: richText('france'),
        name: titleProp('フランス王国'),
        era: richText('絶対王政期'),
        capital: richText('パリ'),
        regime: richText('絶対王政'),
        dynasty: richText('ブルボン朝'),
        leader: richText('ルイ14世'),
        religion: richText('カトリック'),
        context: richText(
          '1700年のフランスはルイ14世の親政期にあり、ヨーロッパ最大の人口約2000万人を擁した。翌1701年にはスペイン継承戦争が勃発する。',
        ),
        key_events: richText('1643:ルイ14世即位|1789:フランス革命'),
      });

      const result = transformNotionPage(page);

      expect(result).toEqual({
        year: 1700,
        territoryId: 'france',
        description: {
          name: 'フランス王国',
          era: '絶対王政期',
          profile: {
            capital: 'パリ',
            regime: '絶対王政',
            dynasty: 'ブルボン朝',
            leader: 'ルイ14世',
            religion: 'カトリック',
          },
          context:
            '1700年のフランスはルイ14世の親政期にあり、ヨーロッパ最大の人口約2000万人を擁した。翌1701年にはスペイン継承戦争が勃発する。',
          keyEvents: [
            { year: 1643, event: 'ルイ14世即位' },
            { year: 1789, event: 'フランス革命' },
          ],
        },
      });
    });

    it('should group multiple pages of the same year into one YearDescriptionBundle', () => {
      const entries = [
        {
          year: 1700,
          territoryId: 'france',
          description: { name: 'フランス王国' },
        },
        {
          year: 1700,
          territoryId: 'tokugawa-shogunate',
          description: { name: '江戸幕府' },
        },
      ];

      const bundles = groupByYear(entries);

      expect(bundles).toHaveLength(1);
      expect(bundles[0]?.year).toBe(1700);
      expect(Object.keys(bundles[0]?.bundle)).toEqual(['france', 'tokugawa-shogunate']);
    });

    it('should convert empty Notion properties to undefined', () => {
      const page = createNotionPage({
        year: numberProp(1700),
        territory_id: richText('ethiopia'),
        name: titleProp('エチオピア帝国'),
        era: richText(''),
        capital: richText('ゴンダール'),
        regime: richText(''),
        dynasty: richText(''),
        leader: richText(''),
        religion: richText(''),
        context: richText(''),
        key_events: richText(''),
      });

      const result = transformNotionPage(page);

      expect(result.description.era).toBeUndefined();
      expect(result.description.context).toBeUndefined();
      expect(result.description.keyEvents).toBeUndefined();
      expect(result.description.profile).toEqual({ capital: 'ゴンダール' });
    });

    it('should omit profile entirely when all profile fields are empty', () => {
      const page = createNotionPage({
        year: numberProp(1700),
        territory_id: richText('unknown-land'),
        name: titleProp('不明の地'),
        era: richText(''),
        capital: richText(''),
        regime: richText(''),
        dynasty: richText(''),
        leader: richText(''),
        religion: richText(''),
        context: richText(''),
        key_events: richText(''),
      });

      const result = transformNotionPage(page);

      expect(result.description.profile).toBeUndefined();
    });
  });

  describe('groupByYear', () => {
    it('should separate entries into different year bundles', () => {
      const entries = [
        { year: 1700, territoryId: 'france', description: { name: 'フランス王国' } },
        { year: 1800, territoryId: 'france', description: { name: 'フランス共和国' } },
      ];

      const bundles = groupByYear(entries);

      expect(bundles).toHaveLength(2);
      expect(bundles.map((b) => b.year).sort((a, b) => a - b)).toEqual([1700, 1800]);
    });
  });
});
