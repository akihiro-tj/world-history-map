import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ControlBar } from './control-bar';

const meta = {
  title: 'ControlBar/ControlBar',
  component: ControlBar,
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
    onToggleProjection: fn(),
    onOpenLicense: fn(),
  },
} satisfies Meta<typeof ControlBar>;

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
