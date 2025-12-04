import type { Meta, StoryObj } from '@storybook/react-vite';
import { AppStateProvider } from '../../contexts/app-state-context';
import { YearLink } from './year-link';

const meta = {
  title: 'TerritoryInfo/YearLink',
  component: YearLink,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <AppStateProvider>
        <Story />
      </AppStateProvider>
    ),
  ],
} satisfies Meta<typeof YearLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    year: 1700,
  },
};

export const AncientYear: Story = {
  args: {
    year: -323,
  },
};

export const ModernYear: Story = {
  args: {
    year: 2000,
  },
};
