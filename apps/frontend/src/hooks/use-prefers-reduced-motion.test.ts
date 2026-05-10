import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePrefersReducedMotion } from './use-prefers-reduced-motion';

describe('usePrefersReducedMotion', () => {
  let listeners: ((e: MediaQueryListEvent) => void)[];
  let currentMatches: boolean;

  beforeEach(() => {
    listeners = [];
    currentMatches = false;

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn((query: string) => ({
        matches: currentMatches,
        media: query,
        addEventListener: (_: string, handler: (e: MediaQueryListEvent) => void) => {
          listeners.push(handler);
        },
        removeEventListener: (_: string, handler: (e: MediaQueryListEvent) => void) => {
          listeners = listeners.filter((l) => l !== handler);
        },
      })),
    });
  });

  afterEach(() => {
    listeners = [];
  });

  it('returns false when prefers-reduced-motion is not set', () => {
    currentMatches = false;
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when prefers-reduced-motion: reduce is active', () => {
    currentMatches = true;
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it('updates when the media query changes', () => {
    currentMatches = false;
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      for (const listener of listeners) {
        listener({ matches: true } as MediaQueryListEvent);
      }
    });
    expect(result.current).toBe(true);
  });
});
