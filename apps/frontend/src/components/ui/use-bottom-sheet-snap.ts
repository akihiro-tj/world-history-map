import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

export type SnapPoint = 'collapsed' | 'half' | 'expanded';

interface UseBottomSheetSnapOptions {
  isActive: boolean;
  headerRef: RefObject<HTMLElement | null>;
  sheetRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  initialSnap?: SnapPoint;
}

interface UseBottomSheetSnapReturn {
  snap: SnapPoint;
  setSnap: (snap: SnapPoint) => void;
  sheetStyle: React.CSSProperties;
  isDragging: boolean;
}

const SNAP_ORDER: SnapPoint[] = ['collapsed', 'half', 'expanded'];
const VELOCITY_THRESHOLD = 0.5;
const TRANSITION = 'height 300ms cubic-bezier(0.32, 0.72, 0, 1)';

function getSnapHeight(snap: SnapPoint, headerHeight: number, viewportHeight: number): number {
  switch (snap) {
    case 'collapsed':
      return headerHeight;
    case 'half':
      return viewportHeight * 0.4;
    case 'expanded':
      return viewportHeight * 0.9;
  }
}

export function useBottomSheetSnap({
  isActive,
  headerRef,
  sheetRef,
  onClose,
  initialSnap = 'half',
}: UseBottomSheetSnapOptions): UseBottomSheetSnapReturn {
  const [snap, setSnap] = useState<SnapPoint>(initialSnap);
  const [isDragging, setIsDragging] = useState(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const [isEntering, setIsEntering] = useState(isActive);

  useEffect(() => {
    if (!isActive) {
      setIsEntering(false);
      return;
    }
    setIsEntering(true);
    let id1: number;
    let id2: number;
    id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        setIsEntering(false);
      });
    });
    return () => {
      cancelAnimationFrame(id1);
      cancelAnimationFrame(id2);
    };
  }, [isActive]);

  const dragState = useRef({
    startY: 0,
    startHeight: 0,
    startTime: 0,
    lastY: 0,
    lastTime: 0,
    rafId: 0,
  });

  const getHeaderHeight = useCallback((): number => {
    return headerRef.current?.getBoundingClientRect().height ?? 76;
  }, [headerRef]);

  const getHeight = useCallback(
    (s: SnapPoint): number => {
      return getSnapHeight(s, getHeaderHeight(), window.innerHeight);
    },
    [getHeaderHeight],
  );

  const resolveSnap = useCallback(
    (currentHeight: number, velocity: number, currentSnap: SnapPoint): SnapPoint | 'close' => {
      const idx = SNAP_ORDER.indexOf(currentSnap);
      const headerHeight = getHeaderHeight();
      const vh = window.innerHeight;

      if (Math.abs(velocity) >= VELOCITY_THRESHOLD) {
        if (velocity > 0) {
          if (idx === 0) return 'close';
          return SNAP_ORDER[idx - 1] ?? currentSnap;
        }
        return SNAP_ORDER[Math.min(idx + 1, SNAP_ORDER.length - 1)] ?? currentSnap;
      }

      let closest: SnapPoint = currentSnap;
      let minDist = Number.POSITIVE_INFINITY;
      for (const sp of SNAP_ORDER) {
        const dist = Math.abs(currentHeight - getSnapHeight(sp, headerHeight, vh));
        if (dist < minDist) {
          minDist = dist;
          closest = sp;
        }
      }

      if (closest === currentSnap && idx === 0) {
        const collapsedH = getSnapHeight('collapsed', headerHeight, vh);
        if (currentHeight < collapsedH * 0.5) return 'close';
      }

      return closest;
    },
    [getHeaderHeight],
  );

  useEffect(() => {
    if (!isActive || !headerRef.current) return;
    const header = headerRef.current;

    const onTouchStart = (e: Event) => {
      const touch = (e as TouchEvent).touches?.[0];
      if (!touch) return;

      const currentHeight = sheetRef.current?.getBoundingClientRect().height ?? getHeight(snap);
      dragState.current = {
        startY: touch.clientY,
        startHeight: currentHeight,
        startTime: e.timeStamp,
        lastY: touch.clientY,
        lastTime: e.timeStamp,
        rafId: 0,
      };
    };

    const onTouchMove = (e: Event) => {
      const touch = (e as TouchEvent).touches?.[0];
      if (!touch) return;

      const ds = dragState.current;
      const deltaY = touch.clientY - ds.startY;
      const newHeight = Math.max(0, ds.startHeight - deltaY);

      ds.lastY = touch.clientY;
      ds.lastTime = e.timeStamp;

      cancelAnimationFrame(ds.rafId);
      ds.rafId = requestAnimationFrame(() => {
        setIsDragging(true);
        setDragHeight(newHeight);
      });
    };

    const onTouchEnd = (e: Event) => {
      const touch = (e as TouchEvent).changedTouches?.[0];
      if (!touch) return;

      cancelAnimationFrame(dragState.current.rafId);

      const ds = dragState.current;
      const deltaY = touch.clientY - ds.startY;
      const elapsed = e.timeStamp - ds.startTime;
      const velocity = elapsed > 0 ? deltaY / elapsed : 0;
      const currentHeight = Math.max(0, ds.startHeight - deltaY);

      const resolved = resolveSnap(currentHeight, velocity, snap);

      setIsDragging(false);
      setDragHeight(null);

      if (resolved === 'close') {
        onClose();
      } else {
        setSnap(resolved);
      }
    };

    header.style.touchAction = 'none';
    header.addEventListener('touchstart', onTouchStart);
    header.addEventListener('touchmove', onTouchMove);
    header.addEventListener('touchend', onTouchEnd);

    return () => {
      cancelAnimationFrame(dragState.current.rafId);
      header.style.touchAction = '';
      header.removeEventListener('touchstart', onTouchStart);
      header.removeEventListener('touchmove', onTouchMove);
      header.removeEventListener('touchend', onTouchEnd);
    };
  }, [isActive, headerRef, sheetRef, snap, onClose, getHeight, resolveSnap]);

  const height = dragHeight ?? (isEntering ? 0 : getHeight(snap));

  const sheetStyle: React.CSSProperties = {
    height,
    willChange: 'height',
    transition: isDragging ? 'none' : TRANSITION,
  };

  return { snap, setSnap, sheetStyle, isDragging };
}
