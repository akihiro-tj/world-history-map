import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloseButton } from './close-button';

const meta = {
  title: 'UI/CloseButton',
  component: CloseButton,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'radio',
      options: ['sm', 'md'],
    },
  },
} satisfies Meta<typeof CloseButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    'aria-label': '閉じる',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    'aria-label': '閉じる',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    'aria-label': '閉じる',
  },
};
