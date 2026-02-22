import { act, renderHook } from '@testing-library/react';
import type { RefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type SnapPoint, useBottomSheetSnap } from './use-bottom-sheet-snap';

const VIEWPORT_HEIGHT = 800;
const HEADER_HEIGHT = 56;
const HANDLE_AREA_HEIGHT = 20;
const COLLAPSED_HEIGHT = HEADER_HEIGHT + HANDLE_AREA_HEIGHT;
const HALF_HEIGHT = VIEWPORT_HEIGHT * 0.4;
const EXPANDED_HEIGHT = VIEWPORT_HEIGHT * 0.9;

function createEl(height: number): HTMLDivElement {
  const el = document.createElement('div');
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    height,
    width: 375,
    top: 0,
    left: 0,
    bottom: height,
    right: 375,
    x: 0,
    y: 0,
    toJSON: () => {},
  });
  document.body.appendChild(el);
  return el;
}

function touchStart(target: HTMLElement, clientY: number, timeStamp: number): void {
  const event = new Event('touchstart', { bubbles: true });
  Object.defineProperty(event, 'touches', { value: [{ clientY }] });
  Object.defineProperty(event, 'timeStamp', { value: timeStamp });
  target.dispatchEvent(event);
}

function touchMove(target: HTMLElement, clientY: number, timeStamp: number): void {
  const event = new Event('touchmove', { bubbles: true });
  Object.defineProperty(event, 'touches', { value: [{ clientY }] });
  Object.defineProperty(event, 'timeStamp', { value: timeStamp });
  target.dispatchEvent(event);
}

function touchEnd(target: HTMLElement, clientY: number, timeStamp: number): void {
  const event = new Event('touchend', { bubbles: true });
  Object.defineProperty(event, 'changedTouches', { value: [{ clientY }] });
  Object.defineProperty(event, 'timeStamp', { value: timeStamp });
  target.dispatchEvent(event);
}

describe('useBottomSheetSnap', () => {
  let headerEl: HTMLDivElement;
  let sheetEl: HTMLDivElement;
  let headerRef: RefObject<HTMLDivElement>;
  let sheetRef: RefObject<HTMLDivElement>;
  let onClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(VIEWPORT_HEIGHT);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });

    headerEl = createEl(COLLAPSED_HEIGHT);
    sheetEl = createEl(HALF_HEIGHT);
    headerRef = { current: headerEl } as RefObject<HTMLDivElement>;
    sheetRef = { current: sheetEl } as RefObject<HTMLDivElement>;
    onClose = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  function renderSnap(overrides?: { initialSnap?: SnapPoint; isActive?: boolean }) {
    return renderHook(() =>
      useBottomSheetSnap({
        isActive: overrides?.isActive ?? true,
        headerRef,
        sheetRef,
        onClose,
        initialSnap: overrides?.initialSnap,
      }),
    );
  }

  it('defaults to half snap with 40vh height', () => {
    const { result } = renderSnap();

    expect(result.current.snap).toBe('half');
    expect(result.current.sheetStyle.height).toBe(HALF_HEIGHT);
  });

  it('uses collapsed height from header measurement', () => {
    const { result } = renderSnap({ initialSnap: 'collapsed' });

    expect(result.current.snap).toBe('collapsed');
    expect(result.current.sheetStyle.height).toBe(COLLAPSED_HEIGHT);
  });

  it('uses 90vh for expanded snap', () => {
    const { result } = renderSnap({ initialSnap: 'expanded' });

    expect(result.current.snap).toBe('expanded');
    expect(result.current.sheetStyle.height).toBe(EXPANDED_HEIGHT);
  });

  it('transitions half → collapsed on downward swipe', () => {
    const { result } = renderSnap();

    act(() => {
      touchStart(headerEl, 400, 0);
      touchMove(headerEl, 500, 100);
      touchEnd(headerEl, 500, 200);
    });

    expect(result.current.snap).toBe('collapsed');
  });

  it('transitions half → expanded on upward swipe', () => {
    const { result } = renderSnap();

    act(() => {
      touchStart(headerEl, 400, 0);
      touchMove(headerEl, 300, 100);
      touchEnd(headerEl, 300, 200);
    });

    expect(result.current.snap).toBe('expanded');
  });

  it('transitions one step down on fast downward flick', () => {
    const { result } = renderSnap({ initialSnap: 'expanded' });

    act(() => {
      touchStart(headerEl, 200, 0);
      touchMove(headerEl, 230, 40);
      touchEnd(headerEl, 230, 50);
    });

    expect(result.current.snap).toBe('half');
  });

  it('transitions one step up on fast upward flick', () => {
    const { result } = renderSnap({ initialSnap: 'collapsed' });

    act(() => {
      touchStart(headerEl, 600, 0);
      touchMove(headerEl, 570, 40);
      touchEnd(headerEl, 570, 50);
    });

    expect(result.current.snap).toBe('half');
  });

  it('calls onClose on downward swipe from collapsed', () => {
    renderSnap({ initialSnap: 'collapsed' });

    act(() => {
      touchStart(headerEl, 600, 0);
      touchMove(headerEl, 700, 100);
      touchEnd(headerEl, 700, 200);
    });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('snaps back when swipe distance is insufficient', () => {
    const { result } = renderSnap();

    act(() => {
      touchStart(headerEl, 400, 0);
      touchMove(headerEl, 410, 500);
      touchEnd(headerEl, 410, 600);
    });

    expect(result.current.snap).toBe('half');
  });

  it('sets isDragging to true during drag', () => {
    const { result } = renderSnap();

    act(() => {
      touchStart(headerEl, 400, 0);
      touchMove(headerEl, 450, 50);
    });

    expect(result.current.isDragging).toBe(true);

    act(() => {
      touchEnd(headerEl, 450, 100);
    });

    expect(result.current.isDragging).toBe(false);
  });

  it('does not attach listeners when isActive is false', () => {
    const addSpy = vi.spyOn(headerEl, 'addEventListener');
    renderSnap({ isActive: false });

    expect(addSpy).not.toHaveBeenCalled();
  });

  it('cleans up listeners on unmount', () => {
    const { unmount } = renderSnap();
    unmount();

    act(() => {
      touchStart(headerEl, 400, 0);
      touchMove(headerEl, 500, 100);
      touchEnd(headerEl, 500, 200);
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('starts at height 0 and transitions to snap height on enter', () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });

    const { result } = renderSnap();
    expect(result.current.sheetStyle.height).toBe(0);

    act(() => {
      for (const cb of rafCallbacks) cb(0);
      rafCallbacks.length = 0;
    });

    act(() => {
      for (const cb of rafCallbacks) cb(0);
    });

    expect(result.current.sheetStyle.height).toBe(HALF_HEIGHT);
  });

  it('allows programmatic snap change via setSnap', () => {
    const { result } = renderSnap();

    act(() => {
      result.current.setSnap('expanded');
    });

    expect(result.current.snap).toBe('expanded');
    expect(result.current.sheetStyle.height).toBe(EXPANDED_HEIGHT);
  });
});
