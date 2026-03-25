import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { BottomSheet } from './bottom-sheet';

const meta = {
  title: 'BottomSheet/BottomSheet',
  component: BottomSheet,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  args: {
    onClose: fn(),
    'aria-labelledby': 'sheet-title',
    header: (
      <div className="px-4 pb-3">
        <h2 id="sheet-title" className="text-lg font-semibold text-white">
          フランス王国
        </h2>
        <p className="text-sm text-gray-300">絶対王政期</p>
      </div>
    ),
    children: (
      <div className="space-y-3 px-4 pb-4 text-sm text-gray-300">
        <p>
          1700年のフランスはルイ14世の親政期にあり、ヨーロッパ最大の人口約2000万人を擁した。翌1701年にはスペイン継承戦争が勃発する。
        </p>
        <p>
          ヴェルサイユ宮殿を中心とした華麗な宮廷文化は、ヨーロッパ各国の宮廷に多大な影響を与えた。
        </p>
      </div>
    ),
  },
} satisfies Meta<typeof BottomSheet>;

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
