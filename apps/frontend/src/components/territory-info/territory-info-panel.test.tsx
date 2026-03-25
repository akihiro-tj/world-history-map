import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TerritoryDescription } from '@/types/territory';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

const mockClearSelection = vi.fn();
const mockSelectTerritory = vi.fn();
const mockSetSelectedYear = vi.fn();

vi.mock('@/contexts/app-state-context', () => ({
  useAppState: () => ({
    state: {
      selectedYear: 1700,
      selectedTerritory: 'France',
      isInfoPanelOpen: true,
    },
    actions: {
      clearSelection: mockClearSelection,
      selectTerritory: mockSelectTerritory,
      setSelectedYear: mockSetSelectedYear,
    },
  }),
}));

const richDescription: TerritoryDescription = {
  name: 'フランス王国',
  era: '絶対王政期',
  profile: {
    capital: 'パリ',
    regime: '絶対王政',
    dynasty: 'ブルボン朝',
    leader: 'ルイ14世',
    religion: 'カトリック',
  },
  context:
    '1700年のフランスはルイ14世の親政期にあり、ヨーロッパ最大の人口約2000万人を擁した。翌1701年にはスペイン継承戦争が勃発する。',
  keyEvents: [
    { year: 1643, event: 'ルイ14世即位' },
    { year: 1661, event: 'ルイ14世の親政開始' },
    { year: 1682, event: 'ヴェルサイユ宮殿に宮廷を移転' },
    { year: 1789, event: 'フランス革命' },
  ],
};

const sparseDescription: TerritoryDescription = {
  name: 'エチオピア帝国',
  profile: {
    capital: 'ゴンダール',
  },
};

let mockDescriptionValue: TerritoryDescription | null = richDescription;
let mockIsLoading = false;
let mockError: string | null = null;

vi.mock('./hooks/use-territory-description', () => ({
  useTerritoryDescription: () => ({
    description: mockDescriptionValue,
    isLoading: mockIsLoading,
    error: mockError,
  }),
}));

import { TerritoryInfoPanel } from './territory-info-panel';

describe('TerritoryInfoPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDescriptionValue = richDescription;
    mockIsLoading = false;
    mockError = null;
  });

  it('renders territory name as heading', () => {
    render(<TerritoryInfoPanel />);

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('フランス王国');
  });

  it('renders AI-generated notice', () => {
    render(<TerritoryInfoPanel />);

    const aiNotice = screen.getByTestId('ai-notice');
    expect(aiNotice).toBeInTheDocument();
  });

  it('renders close button', () => {
    render(<TerritoryInfoPanel />);

    const closeButton = screen.getByRole('button', { name: /close|閉じる/i });
    expect(closeButton).toBeInTheDocument();
  });

  it('closes panel when close button is clicked', () => {
    render(<TerritoryInfoPanel />);

    const closeButton = screen.getByRole('button', { name: /close|閉じる/i });
    fireEvent.click(closeButton);

    expect(mockClearSelection).toHaveBeenCalled();
  });

  it('closes panel when Escape key is pressed', () => {
    render(<TerritoryInfoPanel />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockClearSelection).toHaveBeenCalled();
  });

  it('has proper accessibility attributes', () => {
    render(<TerritoryInfoPanel />);

    const panel = screen.getByTestId('territory-info-panel');
    expect(panel).toHaveAttribute('role', 'dialog');
    expect(panel).toHaveAttribute('aria-labelledby');
  });
});

describe('TerritoryInfoPanel - US-1: Header display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockError = null;
  });

  it('displays name and era for data-rich territory', () => {
    mockDescriptionValue = richDescription;
    render(<TerritoryInfoPanel />);

    expect(screen.getByText('フランス王国')).toBeInTheDocument();
    expect(screen.getByText('絶対王政期')).toBeInTheDocument();
  });

  it('displays name only for data-sparse territory (no era)', () => {
    mockDescriptionValue = sparseDescription;
    render(<TerritoryInfoPanel />);

    expect(screen.getByText('エチオピア帝国')).toBeInTheDocument();
    expect(screen.queryByText('絶対王政期')).not.toBeInTheDocument();
  });

  it('does not display "不明" anywhere in the header', () => {
    mockDescriptionValue = richDescription;
    render(<TerritoryInfoPanel />);

    const heading = screen.getByRole('heading', { level: 2 });
    const headerArea = heading.closest('div');
    expect(headerArea?.textContent).not.toContain('不明');
  });
});

describe('TerritoryInfoPanel - US-2: buildPanelContent states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays loading spinner and territory name while loading', () => {
    mockIsLoading = true;
    mockDescriptionValue = null;
    mockError = null;
    render(<TerritoryInfoPanel />);

    const panel = screen.getByTestId('territory-info-panel');
    expect(panel).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('France')).toBeInTheDocument();
  });

  it('displays error message when error occurs', () => {
    mockIsLoading = false;
    mockError = 'ネットワークエラーが発生しました';
    mockDescriptionValue = null;
    render(<TerritoryInfoPanel />);

    expect(screen.getByText('エラー')).toBeInTheDocument();
    expect(screen.getByText('ネットワークエラーが発生しました')).toBeInTheDocument();
  });

  it('displays no-description message when description is null', () => {
    mockIsLoading = false;
    mockError = null;
    mockDescriptionValue = null;
    render(<TerritoryInfoPanel />);

    expect(screen.getByTestId('no-description-message')).toBeInTheDocument();
    expect(screen.getByText('この領土の詳細情報は準備中です。')).toBeInTheDocument();
  });

  it('displays full description body on success', () => {
    mockIsLoading = false;
    mockError = null;
    mockDescriptionValue = richDescription;
    render(<TerritoryInfoPanel />);

    expect(screen.getByTestId('territory-description')).toBeInTheDocument();
    expect(screen.getByText('フランス王国')).toBeInTheDocument();
    expect(screen.getByText('絶対王政期')).toBeInTheDocument();
  });

  it('renders scrollable panel wrapper for successful description', () => {
    mockIsLoading = false;
    mockError = null;
    mockDescriptionValue = richDescription;
    render(<TerritoryInfoPanel />);

    const panel = screen.getByTestId('territory-info-panel');
    expect(panel.className).toContain('overflow-y-auto');
  });

  it('does not render scrollable panel for loading state', () => {
    mockIsLoading = true;
    mockDescriptionValue = null;
    mockError = null;
    render(<TerritoryInfoPanel />);

    const panel = screen.getByTestId('territory-info-panel');
    expect(panel.className).not.toContain('overflow-y-auto');
  });
});
