import type { Meta, StoryObj } from '@storybook/react-vite';
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
    year: 1700,
  },
};

export const BCE: Story = {
  args: {
    year: -500,
  },
};

export const Year1: Story = {
  name: 'Year 1',
  args: {
    year: 1,
  },
};
