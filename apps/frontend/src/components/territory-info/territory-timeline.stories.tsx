import type { Meta, StoryObj } from '@storybook/react-vite';
import type { KeyEvent } from '@/domain/territory/types';
import { createHistoricalYear } from '@/domain/year/historical-year';
import { TerritoryTimeline } from './territory-timeline';

const sampleEvents: KeyEvent[] = [
  { year: 1643, event: 'ルイ14世即位' },
  { year: 1661, event: 'ルイ14世の親政開始' },
  { year: 1682, event: 'ヴェルサイユ宮殿に宮廷を移転' },
  { year: 1700, event: 'スペイン・ハプスブルク家断絶' },
  { year: 1701, event: 'スペイン継承戦争勃発' },
  { year: 1789, event: 'フランス革命' },
];

const meta = {
  title: 'TerritoryInfo/TerritoryTimeline',
  component: TerritoryTimeline,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TerritoryTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CurrentYearMatchesEvent: Story = {
  args: {
    keyEvents: sampleEvents,
    selectedYear: createHistoricalYear(1682),
  },
};

export const CurrentYearBetweenEvents: Story = {
  args: {
    keyEvents: sampleEvents,
    selectedYear: createHistoricalYear(1700),
  },
};

export const CurrentYearBeforeAll: Story = {
  args: {
    keyEvents: sampleEvents,
    selectedYear: createHistoricalYear(1600),
  },
};

export const CurrentYearAfterAll: Story = {
  args: {
    keyEvents: sampleEvents,
    selectedYear: createHistoricalYear(1900),
  },
};

export const KeyEventsEmpty: Story = {
  args: {
    keyEvents: [],
    selectedYear: createHistoricalYear(1700),
  },
};

export const KeyEventsUndefined: Story = {
  args: {
    keyEvents: undefined,
    selectedYear: createHistoricalYear(1700),
  },
};
