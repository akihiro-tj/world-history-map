import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AppStateProvider } from '../../contexts/app-state-context';
import { createHistoricalYear } from '../../types/historical-year';
import type { YearEntry } from '../../types/year';
import { YearSelector } from './year-selector';

const sampleYears: YearEntry[] = [
  { year: createHistoricalYear(-500), filename: 'world_-500.pmtiles', countries: [] },
  { year: createHistoricalYear(-323), filename: 'world_-323.pmtiles', countries: [] },
  { year: createHistoricalYear(-1), filename: 'world_-1.pmtiles', countries: [] },
  { year: createHistoricalYear(100), filename: 'world_100.pmtiles', countries: [] },
  { year: createHistoricalYear(500), filename: 'world_500.pmtiles', countries: [] },
  { year: createHistoricalYear(1000), filename: 'world_1000.pmtiles', countries: [] },
  { year: createHistoricalYear(1500), filename: 'world_1500.pmtiles', countries: [] },
  { year: createHistoricalYear(1650), filename: 'world_1650.pmtiles', countries: [] },
  { year: createHistoricalYear(1800), filename: 'world_1800.pmtiles', countries: [] },
  { year: createHistoricalYear(1900), filename: 'world_1900.pmtiles', countries: [] },
  { year: createHistoricalYear(2000), filename: 'world_2000.pmtiles', countries: [] },
];

const meta = {
  title: 'YearSelector/YearSelector',
  component: YearSelector,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <AppStateProvider
        initialState={{
          selectedYear: createHistoricalYear(1650),
          selectedTerritory: null,
          mapView: { longitude: 0, latitude: 30, zoom: 2 },
          isInfoPanelOpen: false,
        }}
      >
        <div className="bg-gray-700 p-4">
          <Story />
        </div>
      </AppStateProvider>
    ),
  ],
  args: {
    onYearSelect: fn(),
  },
} satisfies Meta<typeof YearSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    years: sampleYears,
  },
};

export const FewYears: Story = {
  args: {
    years: sampleYears.slice(0, 3),
  },
};

export const ManyYears: Story = {
  args: {
    years: sampleYears,
  },
  decorators: [
    (Story) => (
      <AppStateProvider
        initialState={{
          selectedYear: createHistoricalYear(-500),
          selectedTerritory: null,
          mapView: { longitude: 0, latitude: 30, zoom: 2 },
          isInfoPanelOpen: false,
        }}
      >
        <div className="bg-gray-700 p-4">
          <Story />
        </div>
      </AppStateProvider>
    ),
  ],
};
