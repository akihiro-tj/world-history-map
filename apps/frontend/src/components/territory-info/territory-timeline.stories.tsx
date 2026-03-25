import type { Meta, StoryObj } from '@storybook/react-vite';
import type { KeyEvent } from '@/types/territory';
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

export const SelectedYearInMiddle: Story = {
  args: {
    keyEvents: sampleEvents,
    selectedYear: 1700,
  },
};

export const SelectedYearMatchesEvent: Story = {
  args: {
    keyEvents: sampleEvents,
    selectedYear: 1682,
  },
};

export const SelectedYearBeforeAll: Story = {
  args: {
    keyEvents: sampleEvents,
    selectedYear: 1600,
  },
};

export const SelectedYearAfterAll: Story = {
  args: {
    keyEvents: sampleEvents,
    selectedYear: 1900,
  },
};

export const NoEvents: Story = {
  args: {
    keyEvents: undefined,
    selectedYear: 1700,
  },
};
