import type { Meta, StoryObj } from '@storybook/react-vite';
import { createHistoricalYear } from '@/domain/year/historical-year';
import { AppStateProvider } from '../../contexts/app-state-context';
import { initialAppState } from '../../types/app-state';
import { EraSummaryPanel } from './era-summary-panel';

const mockSummary1650 = {
  year: 1650,
  regions: [
    {
      region: 'europe',
      title: 'ヨーロッパ',
      context:
        '三十年戦争が終結（1648 年ウェストファリア条約）し、主権国家体制が成立。フランスでは絶対王政が確立しつつあり、イングランドは内戦からピューリタン革命の只中。',
      references: [{ kind: 'year', target: '1648', text: '1648 年' }],
    },
    {
      region: 'east-asia',
      title: '東アジア',
      context:
        '明朝が李自成の乱と清軍の南下により滅亡（1644 年）、清が中国本土を支配。日本では江戸幕府が鎖国体制を確立。',
      references: [],
    },
    {
      region: 'south-asia',
      title: '南アジア',
      context: 'ムガル帝国がシャー・ジャハーンの治世下で最盛期を迎える。タージマハル建造の時代。',
      references: [],
    },
  ],
};

const openSummaryState = {
  ...initialAppState,
  selectedYear: createHistoricalYear(1650),
  isSummaryPanelOpen: true,
};

function mockFetchWithSummary() {
  global.fetch = async (url: string | Request | URL) => {
    if (url.toString().includes('/data/era-summaries/')) {
      return new Response(JSON.stringify(mockSummary1650), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(null, { status: 404 });
  };
}

function mockFetchWithNotFound() {
  global.fetch = async () => new Response(null, { status: 404 });
}

function mockFetchWithError() {
  global.fetch = async () => {
    throw new Error('Network error');
  };
}

const meta = {
  title: 'EraSummaryPanel/EraSummaryPanel',
  component: EraSummaryPanel,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="relative h-dvh w-screen overflow-hidden bg-gray-900">
        <AppStateProvider initialState={openSummaryState}>
          <Story />
        </AppStateProvider>
      </div>
    ),
  ],
} satisfies Meta<typeof EraSummaryPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  beforeEach: mockFetchWithSummary,
};

export const Empty: Story = {
  beforeEach: mockFetchWithNotFound,
};

export const Loading: Story = {
  beforeEach() {
    global.fetch = () => new Promise(() => {});
  },
};

export const FetchError: Story = {
  beforeEach: mockFetchWithError,
};

export const Mobile: Story = {
  beforeEach: mockFetchWithSummary,
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};
