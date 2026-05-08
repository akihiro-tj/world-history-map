import { type RefObject, useEffect, useState } from 'react';

const SCROLL_BOTTOM_THRESHOLD_PX = 1;

export function useCanScrollDown(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean = true,
): boolean {
  const [canScrollDown, setCanScrollDown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) {
      setCanScrollDown(false);
      return;
    }

    const updateScrollState = () => {
      setCanScrollDown(
        el.scrollHeight - el.scrollTop - el.clientHeight > SCROLL_BOTTOM_THRESHOLD_PX,
      );
    };

    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollState) : null;
    resizeObserver?.observe(el);

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      resizeObserver?.disconnect();
    };
  }, [ref, enabled]);

  return canScrollDown;
}
