import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEscapeKey } from './use-escape-key';

describe('useEscapeKey', () => {
  it('calls onEscape when Escape is pressed and active', () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey(true, onEscape));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onEscape).toHaveBeenCalledOnce();
  });

  it('does not call onEscape when inactive', () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey(false, onEscape));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onEscape).not.toHaveBeenCalled();
  });

  it('ignores non-Escape keys', () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey(true, onEscape));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));

    expect(onEscape).not.toHaveBeenCalled();
  });

  it('removes listener when deactivated', () => {
    const onEscape = vi.fn();
    const { rerender } = renderHook(({ active }) => useEscapeKey(active, onEscape), {
      initialProps: { active: true },
    });

    rerender({ active: false });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onEscape).not.toHaveBeenCalled();
  });

  it('removes listener on unmount', () => {
    const onEscape = vi.fn();
    const { unmount } = renderHook(() => useEscapeKey(true, onEscape));

    unmount();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onEscape).not.toHaveBeenCalled();
  });
});
