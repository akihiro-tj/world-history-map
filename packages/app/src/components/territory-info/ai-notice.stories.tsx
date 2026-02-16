import type { Meta, StoryObj } from '@storybook/react-vite';
import { AiNotice } from './ai-notice';

const meta = {
  title: 'TerritoryInfo/AiNotice',
  component: AiNotice,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AiNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
