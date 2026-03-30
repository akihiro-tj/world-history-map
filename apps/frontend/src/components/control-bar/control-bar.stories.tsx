import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ProjectionProvider } from '../../contexts/projection-context';
import { ControlBar } from './control-bar';

const meta = {
  title: 'ControlBar/ControlBar',
  component: ControlBar,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ProjectionProvider>
        <Story />
      </ProjectionProvider>
    ),
  ],
  args: {
    onOpenLicense: fn(),
  },
} satisfies Meta<typeof ControlBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
