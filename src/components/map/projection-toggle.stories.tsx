import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ProjectionToggle } from './projection-toggle';

const meta = {
  title: 'Map/ProjectionToggle',
  component: ProjectionToggle,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  argTypes: {
    projection: {
      control: 'radio',
      options: ['mercator', 'globe'],
    },
  },
  args: {
    onToggle: fn(),
  },
} satisfies Meta<typeof ProjectionToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mercator: Story = {
  args: {
    projection: 'mercator',
  },
};

export const Globe: Story = {
  args: {
    projection: 'globe',
  },
};
