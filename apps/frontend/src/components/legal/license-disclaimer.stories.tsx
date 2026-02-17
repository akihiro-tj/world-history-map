import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { LicenseDisclaimer } from './license-disclaimer';

const meta = {
  title: 'Legal/LicenseDisclaimer',
  component: LicenseDisclaimer,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  args: {
    onClose: fn(),
  },
} satisfies Meta<typeof LicenseDisclaimer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    isOpen: true,
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
  },
};
