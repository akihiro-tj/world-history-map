import { renderHook } from '@testing-library/react';
import { createRef, type RefObject } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useFocusTrap } from './use-focus-trap';

function createContainer(...focusableElements: HTMLElement[]): HTMLDivElement {
  const container = document.createElement('div');
  for (const el of focusableElements) {
    container.appendChild(el);
  }
  document.body.appendChild(container);
  return container;
}

function createButton(label: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = label;
  return btn;
}

function cleanupBody(): void {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
}

describe('useFocusTrap', () => {
  afterEach(() => {
    cleanupBody();
  });

  it('wraps focus from last to first element on Tab', () => {
    const btn1 = createButton('first');
    const btn2 = createButton('last');
    const container = createContainer(btn1, btn2);
    const ref = { current: container } as RefObject<HTMLDivElement>;

    renderHook(() => useFocusTrap(true, ref));

    btn2.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    container.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(btn1);
  });

  it('wraps focus from first to last element on Shift+Tab', () => {
    const btn1 = createButton('first');
    const btn2 = createButton('last');
    const container = createContainer(btn1, btn2);
    const ref = { current: container } as RefObject<HTMLDivElement>;

    renderHook(() => useFocusTrap(true, ref));

    btn1.focus();
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
    });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    container.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(btn2);
  });

  it('does not interfere with Tab on middle elements', () => {
    const btn1 = createButton('first');
    const btn2 = createButton('middle');
    const btn3 = createButton('last');
    const container = createContainer(btn1, btn2, btn3);
    const ref = { current: container } as RefObject<HTMLDivElement>;

    renderHook(() => useFocusTrap(true, ref));

    btn2.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    container.dispatchEvent(event);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it('does nothing when isActive is false', () => {
    const btn1 = createButton('first');
    const btn2 = createButton('last');
    const container = createContainer(btn1, btn2);
    const ref = { current: container } as RefObject<HTMLDivElement>;

    renderHook(() => useFocusTrap(false, ref));

    btn2.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    container.dispatchEvent(event);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it('cleans up listener when deactivated', () => {
    const btn1 = createButton('first');
    const btn2 = createButton('last');
    const container = createContainer(btn1, btn2);
    const ref = { current: container } as RefObject<HTMLDivElement>;

    const { rerender } = renderHook(({ active }) => useFocusTrap(active, ref), {
      initialProps: { active: true },
    });

    rerender({ active: false });

    btn2.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    container.dispatchEvent(event);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it('does nothing when container ref is null', () => {
    const ref = createRef<HTMLDivElement>();

    expect(() => {
      renderHook(() => useFocusTrap(true, ref));
    }).not.toThrow();
  });
});
