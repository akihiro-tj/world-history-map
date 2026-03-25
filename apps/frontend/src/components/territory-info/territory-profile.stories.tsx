import type { Meta, StoryObj } from '@storybook/react-vite';
import { TerritoryProfile } from './territory-profile';

const meta = {
  title: 'TerritoryInfo/TerritoryProfile',
  component: TerritoryProfile,
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
} satisfies Meta<typeof TerritoryProfile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllFields: Story = {
  args: {
    profile: {
      capital: 'パリ',
      regime: '絶対王政',
      dynasty: 'ブルボン朝',
      leader: 'ルイ14世',
      religion: 'カトリック',
    },
  },
};

export const PartialFields: Story = {
  args: {
    profile: {
      capital: 'ゴンダール',
    },
  },
};

export const NoProfile: Story = {
  args: {
    profile: undefined,
  },
};
