import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePanelPadding } from './use-panel-padding';

function mockMatchMedia(isMobile: boolean) {
  const listeners: ((e: MediaQueryListEvent) => void)[] = [];
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn(() => ({
      matches: isMobile,
      addEventListener: (_: string, handler: (e: MediaQueryListEvent) => void) => {
        listeners.push(handler);
      },
      removeEventListener: (_: string, handler: (e: MediaQueryListEvent) => void) => {
        listeners.splice(listeners.indexOf(handler), 1);
      },
    })),
  });
  return listeners;
}

describe('usePanelPadding', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Desktop (useIsMobile === false)', () => {
    beforeEach(() => {
      mockMatchMedia(false);
    });

    it('returns Desktop padding with left=416 for TerritoryInfoPanel layout', () => {
      const { result } = renderHook(() => usePanelPadding());
      expect(result.current.top).toBe(24);
      expect(result.current.right).toBe(24);
      expect(result.current.bottom).toBe(24);
      expect(result.current.left).toBe(416);
    });

    it('updates when window is resized (does not change Desktop left padding)', () => {
      const { result } = renderHook(() => usePanelPadding());
      const initialLeft = result.current.left;

      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current.left).toBe(initialLeft);
    });
  });

  describe('Mobile (useIsMobile === true)', () => {
    beforeEach(() => {
      mockMatchMedia(true);
    });

    it('returns Mobile padding based on window.innerHeight and HALF_VIEWPORT_RATIO', () => {
      Object.defineProperty(window, 'innerHeight', { writable: true, value: 800 });
      const { result } = renderHook(() => usePanelPadding());
      expect(result.current.top).toBe(16);
      expect(result.current.right).toBe(16);
      expect(result.current.left).toBe(16);
      expect(result.current.bottom).toBeCloseTo(800 * 0.4 + 16);
    });

    it('updates bottom padding when window height changes', () => {
      Object.defineProperty(window, 'innerHeight', { writable: true, value: 800 });
      const { result } = renderHook(() => usePanelPadding());

      act(() => {
        Object.defineProperty(window, 'innerHeight', { writable: true, value: 1000 });
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current.bottom).toBeCloseTo(1000 * 0.4 + 16);
    });

    it('does not recalculate when BottomSheet snap state changes (FR-010)', () => {
      Object.defineProperty(window, 'innerHeight', { writable: true, value: 800 });
      const { result } = renderHook(() => usePanelPadding());
      const initialBottom = result.current.bottom;

      act(() => {
        window.dispatchEvent(new CustomEvent('bottomsheet-snap-change'));
      });

      expect(result.current.bottom).toBe(initialBottom);
    });
  });
});
