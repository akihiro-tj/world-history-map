import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BottomSheet } from './bottom-sheet';

vi.mock('@/hooks/use-bottom-sheet-snap', () => ({
  useBottomSheetSnap: vi.fn(() => ({
    snap: 'half' as const,
    setSnap: vi.fn(),
    sheetStyle: { height: 320, willChange: 'height', transition: 'none' },
    isDragging: false,
  })),
}));

import { useBottomSheetSnap } from '@/hooks/use-bottom-sheet-snap';

const mockUseBottomSheetSnap = vi.mocked(useBottomSheetSnap);

describe('BottomSheet', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  function renderSheet(overrides?: { isOpen?: boolean; onClose?: () => void }) {
    const onClose = overrides?.onClose ?? vi.fn();
    return render(
      <BottomSheet
        isOpen={overrides?.isOpen ?? true}
        onClose={onClose}
        header={<div data-testid="sheet-header">Header</div>}
        aria-labelledby="title-id"
      >
        <p>Sheet content</p>
      </BottomSheet>,
    );
  }

  it('renders header and children when isOpen is true', () => {
    renderSheet();

    expect(screen.getByTestId('sheet-header')).toBeInTheDocument();
    expect(screen.getByText('Sheet content')).toBeInTheDocument();
  });

  it('renders nothing when isOpen is false', () => {
    renderSheet({ isOpen: false });

    expect(screen.queryByText('Sheet content')).not.toBeInTheDocument();
  });

  it('has role="dialog" and aria-labelledby', () => {
    renderSheet();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'title-id');
  });

  it('renders drag handle', () => {
    renderSheet();

    expect(screen.getByTestId('bottom-sheet-handle')).toBeInTheDocument();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    renderSheet({ onClose });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows backdrop only in expanded snap', () => {
    mockUseBottomSheetSnap.mockReturnValue({
      snap: 'half',
      setSnap: vi.fn(),
      sheetStyle: { height: 320, willChange: 'height', transition: 'none' },
      isDragging: false,
    });
    renderSheet();
    expect(screen.queryByTestId('bottom-sheet-backdrop')).not.toBeInTheDocument();

    cleanup();

    mockUseBottomSheetSnap.mockReturnValue({
      snap: 'expanded',
      setSnap: vi.fn(),
      sheetStyle: { height: 720, willChange: 'height', transition: 'none' },
      isDragging: false,
    });
    renderSheet();
    expect(screen.getByTestId('bottom-sheet-backdrop')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked in expanded state', () => {
    const onClose = vi.fn();
    mockUseBottomSheetSnap.mockReturnValue({
      snap: 'expanded',
      setSnap: vi.fn(),
      sheetStyle: { height: 720, willChange: 'height', transition: 'none' },
      isDragging: false,
    });
    render(
      <BottomSheet isOpen={true} onClose={onClose} header={<div>Header</div>}>
        <p>Content</p>
      </BottomSheet>,
    );

    fireEvent.click(screen.getByTestId('bottom-sheet-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('applies overflow-hidden when collapsed', () => {
    mockUseBottomSheetSnap.mockReturnValue({
      snap: 'collapsed',
      setSnap: vi.fn(),
      sheetStyle: { height: 76, willChange: 'height', transition: 'none' },
      isDragging: false,
    });
    renderSheet();

    const body = screen.getByText('Sheet content').parentElement;
    expect(body?.className).toContain('overflow-hidden');
  });

  it('applies overflow-y-auto when half or expanded', () => {
    for (const snap of ['half', 'expanded'] as const) {
      cleanup();
      mockUseBottomSheetSnap.mockReturnValue({
        snap,
        setSnap: vi.fn(),
        sheetStyle: { height: 320, willChange: 'height', transition: 'none' },
        isDragging: false,
      });
      renderSheet();

      const body = screen.getByText('Sheet content').parentElement;
      expect(body?.className).toContain('overflow-y-auto');
    }
  });
});
