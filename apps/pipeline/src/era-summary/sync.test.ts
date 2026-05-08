import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { describe, expect, it, vi } from 'vitest';
import { EraSummaryRegions, transformNotionPage } from '@/era-summary/sync.ts';

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

function selectProp(value: string | null): PageObjectResponse['properties'][string] {
  return {
    id: 'prop',
    type: 'select' as const,
    select: value ? { id: 'opt-id', name: value, color: 'default' as const } : null,
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

describe('sync-era-summaries', () => {
  describe('transformNotionPage', () => {
    it('transforms a full Notion page into a TransformedRegionEntry', () => {
      const page = createNotionPage({
        Year: numberProp(1650),
        Region: selectProp('europe'),
        Title: titleProp('ヨーロッパ'),
        Context: richText('三十年戦争が終結し、主権国家体制が成立。'),
        References: richText('[{"kind":"territory","target":"france","text":"フランス"}]'),
      });

      const result = transformNotionPage(page);

      expect(result).toEqual({
        year: 1650,
        regionCard: {
          region: 'europe',
          title: 'ヨーロッパ',
          context: '三十年戦争が終結し、主権国家体制が成立。',
          references: [{ kind: 'territory', target: 'france', text: 'フランス' }],
        },
      });
    });

    it('throws when Title is empty', () => {
      const page = createNotionPage({
        Year: numberProp(1650),
        Region: selectProp('europe'),
        Title: titleProp(''),
        Context: richText('Some context.'),
        References: richText('[]'),
      });

      expect(() => transformNotionPage(page)).toThrow();
    });

    it('throws when Region is an invalid enum value', () => {
      const page = createNotionPage({
        Year: numberProp(1650),
        Region: selectProp('invalid-region'),
        Title: titleProp('テスト'),
        Context: richText('Some context.'),
        References: richText('[]'),
      });

      expect(() => transformNotionPage(page)).toThrow();
    });

    it('falls back to empty references and warns when References JSON is malformed', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const page = createNotionPage({
        Year: numberProp(1650),
        Region: selectProp('europe'),
        Title: titleProp('ヨーロッパ'),
        Context: richText('Some context.'),
        References: richText('not valid json {'),
      });

      const result = transformNotionPage(page);

      expect(result.regionCard.references).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('uses empty references when References field is empty', () => {
      const page = createNotionPage({
        Year: numberProp(1650),
        Region: selectProp('east-asia'),
        Title: titleProp('東アジア'),
        Context: richText('清が中国本土を支配。'),
        References: richText(''),
      });

      const result = transformNotionPage(page);

      expect(result.regionCard.references).toEqual([]);
    });
  });

  describe('EraSummaryRegions', () => {
    it('groups entries into EraSummary objects by year', () => {
      const regions = new EraSummaryRegions();
      regions.add({
        year: 1650,
        regionCard: { region: 'europe', title: 'ヨーロッパ', context: 'ctx', references: [] },
      });
      regions.add({
        year: 1650,
        regionCard: { region: 'east-asia', title: '東アジア', context: 'ctx', references: [] },
      });
      regions.add({
        year: 1700,
        regionCard: { region: 'europe', title: 'ヨーロッパ', context: 'ctx', references: [] },
      });

      const summaries = regions.build();

      expect(summaries).toHaveLength(2);
      const s1650 = summaries.find((s) => s.year === 1650);
      expect(s1650?.regions).toHaveLength(2);
    });

    it('throws when the same Year × Region combination appears more than once', () => {
      const regions = new EraSummaryRegions();
      regions.add({
        year: 1650,
        regionCard: { region: 'europe', title: 'ヨーロッパ A', context: 'ctx', references: [] },
      });

      expect(() =>
        regions.add({
          year: 1650,
          regionCard: { region: 'europe', title: 'ヨーロッパ B', context: 'ctx', references: [] },
        }),
      ).toThrow(/duplicate/i);
    });
  });
});
