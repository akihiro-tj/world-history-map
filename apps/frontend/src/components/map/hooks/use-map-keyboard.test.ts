import { renderHook } from '@testing-library/react';
import type React from 'react';
import { createRef, type RefObject } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useMapKeyboard } from './use-map-keyboard';

function createMockMapRef() {
  const map = {
    panBy: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
  };
  return { current: map } as unknown as RefObject<{
    panBy: ReturnType<typeof vi.fn>;
    zoomIn: ReturnType<typeof vi.fn>;
    zoomOut: ReturnType<typeof vi.fn>;
  }>;
}

function createKeyboardEvent(key: string): React.KeyboardEvent<HTMLDivElement> {
  const preventDefault = vi.fn();
  return { key, preventDefault } as unknown as React.KeyboardEvent<HTMLDivElement>;
}

describe('useMapKeyboard', () => {
  it('pans up on ArrowUp', () => {
    const mapRef = createMockMapRef();
    const { result } = renderHook(() => useMapKeyboard(mapRef as never));

    const event = createKeyboardEvent('ArrowUp');
    result.current(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mapRef.current?.panBy).toHaveBeenCalledWith([0, -100], { duration: 200 });
  });

  it('pans down on ArrowDown', () => {
    const mapRef = createMockMapRef();
    const { result } = renderHook(() => useMapKeyboard(mapRef as never));

    const event = createKeyboardEvent('ArrowDown');
    result.current(event);

    expect(mapRef.current?.panBy).toHaveBeenCalledWith([0, 100], { duration: 200 });
  });

  it('pans left on ArrowLeft', () => {
    const mapRef = createMockMapRef();
    const { result } = renderHook(() => useMapKeyboard(mapRef as never));

    const event = createKeyboardEvent('ArrowLeft');
    result.current(event);

    expect(mapRef.current?.panBy).toHaveBeenCalledWith([-100, 0], { duration: 200 });
  });

  it('pans right on ArrowRight', () => {
    const mapRef = createMockMapRef();
    const { result } = renderHook(() => useMapKeyboard(mapRef as never));

    const event = createKeyboardEvent('ArrowRight');
    result.current(event);

    expect(mapRef.current?.panBy).toHaveBeenCalledWith([100, 0], { duration: 200 });
  });

  it('zooms in on + key', () => {
    const mapRef = createMockMapRef();
    const { result } = renderHook(() => useMapKeyboard(mapRef as never));

    const event = createKeyboardEvent('+');
    result.current(event);

    expect(mapRef.current?.zoomIn).toHaveBeenCalledWith({ duration: 200 });
  });

  it('zooms in on = key', () => {
    const mapRef = createMockMapRef();
    const { result } = renderHook(() => useMapKeyboard(mapRef as never));

    const event = createKeyboardEvent('=');
    result.current(event);

    expect(mapRef.current?.zoomIn).toHaveBeenCalledWith({ duration: 200 });
  });

  it('zooms out on - key', () => {
    const mapRef = createMockMapRef();
    const { result } = renderHook(() => useMapKeyboard(mapRef as never));

    const event = createKeyboardEvent('-');
    result.current(event);

    expect(mapRef.current?.zoomOut).toHaveBeenCalledWith({ duration: 200 });
  });

  it('ignores unrecognized keys', () => {
    const mapRef = createMockMapRef();
    const { result } = renderHook(() => useMapKeyboard(mapRef as never));

    const event = createKeyboardEvent('a');
    result.current(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(mapRef.current?.panBy).not.toHaveBeenCalled();
    expect(mapRef.current?.zoomIn).not.toHaveBeenCalled();
    expect(mapRef.current?.zoomOut).not.toHaveBeenCalled();
  });

  it('does nothing when map ref is null', () => {
    const mapRef = createRef() as RefObject<null>;
    const { result } = renderHook(() => useMapKeyboard(mapRef as never));

    const event = createKeyboardEvent('ArrowUp');

    expect(() => result.current(event)).not.toThrow();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
