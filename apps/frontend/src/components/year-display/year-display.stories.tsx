import type { Meta, StoryObj } from '@storybook/react-vite';
import { createHistoricalYear } from '@/domain/year/historical-year';
import { YearDisplay } from './year-display';

const meta = {
  title: 'YearDisplay/YearDisplay',
  component: YearDisplay,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  argTypes: {
    year: { control: 'number' },
  },
} satisfies Meta<typeof YearDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CE: Story = {
  args: {
    year: createHistoricalYear(1700),
  },
};

export const BCE: Story = {
  args: {
    year: createHistoricalYear(-500),
  },
};

export const Year1: Story = {
  name: 'Year 1',
  args: {
    year: createHistoricalYear(1),
  },
};
