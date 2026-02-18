import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AppStateProvider } from '../../contexts/app-state-context';
import type { YearEntry } from '../../types';
import { YearSelector } from './year-selector';

const sampleYears: YearEntry[] = [
  { year: -500, filename: 'world_-500.pmtiles', countries: [] },
  { year: -323, filename: 'world_-323.pmtiles', countries: [] },
  { year: -1, filename: 'world_-1.pmtiles', countries: [] },
  { year: 100, filename: 'world_100.pmtiles', countries: [] },
  { year: 500, filename: 'world_500.pmtiles', countries: [] },
  { year: 1000, filename: 'world_1000.pmtiles', countries: [] },
  { year: 1500, filename: 'world_1500.pmtiles', countries: [] },
  { year: 1650, filename: 'world_1650.pmtiles', countries: [] },
  { year: 1800, filename: 'world_1800.pmtiles', countries: [] },
  { year: 1900, filename: 'world_1900.pmtiles', countries: [] },
  { year: 2000, filename: 'world_2000.pmtiles', countries: [] },
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
          selectedYear: 1650,
          selectedTerritory: null,
          mapView: { longitude: 0, latitude: 30, zoom: 2 },
          isLoading: false,
          isInfoPanelOpen: false,
          error: null,
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
          selectedYear: -500,
          selectedTerritory: null,
          mapView: { longitude: 0, latitude: 30, zoom: 2 },
          isLoading: false,
          isInfoPanelOpen: false,
          error: null,
        }}
      >
        <div className="bg-gray-700 p-4">
          <Story />
        </div>
      </AppStateProvider>
    ),
  ],
};
