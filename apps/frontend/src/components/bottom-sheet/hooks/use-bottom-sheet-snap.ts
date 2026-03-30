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
const HALF_VIEWPORT_RATIO = 0.4;
const EXPANDED_VIEWPORT_RATIO = 0.9;
const DEFAULT_HEADER_HEIGHT = 76;
const VELOCITY_THRESHOLD = 0.5;
const CLOSE_THRESHOLD_RATIO = 0.5;
const TRANSITION = 'height 300ms cubic-bezier(0.32, 0.72, 0, 1)';

function getSnapHeight(snapPoint: SnapPoint, headerHeight: number, viewportHeight: number): number {
  switch (snapPoint) {
    case 'collapsed':
      return headerHeight;
    case 'half':
      return viewportHeight * HALF_VIEWPORT_RATIO;
    case 'expanded':
      return viewportHeight * EXPANDED_VIEWPORT_RATIO;
  }
}

function resolveByVelocity(velocity: number, currentSnapIndex: number): SnapPoint | 'close' | null {
  if (Math.abs(velocity) < VELOCITY_THRESHOLD) return null;

  if (velocity > 0) {
    if (currentSnapIndex === 0) return 'close';
    return SNAP_ORDER[currentSnapIndex - 1] ?? null;
  }

  return SNAP_ORDER[Math.min(currentSnapIndex + 1, SNAP_ORDER.length - 1)] ?? null;
}

function resolveByDistance(
  currentHeight: number,
  headerHeight: number,
  viewportHeight: number,
): SnapPoint {
  let closest: SnapPoint = 'collapsed';
  let minimumDistance = Number.POSITIVE_INFINITY;

  for (const snapPoint of SNAP_ORDER) {
    const distance = Math.abs(
      currentHeight - getSnapHeight(snapPoint, headerHeight, viewportHeight),
    );
    if (distance < minimumDistance) {
      minimumDistance = distance;
      closest = snapPoint;
    }
  }

  return closest;
}

function shouldClose(
  closest: SnapPoint,
  currentSnapIndex: number,
  currentHeight: number,
  headerHeight: number,
  viewportHeight: number,
): boolean {
  if (closest !== SNAP_ORDER[currentSnapIndex] || currentSnapIndex !== 0) return false;
  const collapsedHeight = getSnapHeight('collapsed', headerHeight, viewportHeight);
  return currentHeight < collapsedHeight * CLOSE_THRESHOLD_RATIO;
}

function resolveSnap(
  currentHeight: number,
  velocity: number,
  currentSnap: SnapPoint,
  headerHeight: number,
  viewportHeight: number,
): SnapPoint | 'close' {
  const currentSnapIndex = SNAP_ORDER.indexOf(currentSnap);

  const velocityResult = resolveByVelocity(velocity, currentSnapIndex);
  if (velocityResult !== null) return velocityResult;

  const closest = resolveByDistance(currentHeight, headerHeight, viewportHeight);

  if (shouldClose(closest, currentSnapIndex, currentHeight, headerHeight, viewportHeight)) {
    return 'close';
  }

  return closest;
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
    let outerFrameId: number;
    let innerFrameId: number;
    outerFrameId = requestAnimationFrame(() => {
      innerFrameId = requestAnimationFrame(() => {
        setIsEntering(false);
      });
    });
    return () => {
      cancelAnimationFrame(outerFrameId);
      cancelAnimationFrame(innerFrameId);
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
    return headerRef.current?.getBoundingClientRect().height ?? DEFAULT_HEADER_HEIGHT;
  }, [headerRef]);

  const getHeight = useCallback(
    (snapPoint: SnapPoint): number => {
      return getSnapHeight(snapPoint, getHeaderHeight(), window.innerHeight);
    },
    [getHeaderHeight],
  );

  useEffect(() => {
    if (!isActive || !headerRef.current) return;
    const header = headerRef.current;

    const onTouchStart = (event: Event) => {
      const touch = (event as TouchEvent).touches?.[0];
      if (!touch) return;

      const currentHeight = sheetRef.current?.getBoundingClientRect().height ?? getHeight(snap);
      dragState.current = {
        startY: touch.clientY,
        startHeight: currentHeight,
        startTime: event.timeStamp,
        lastY: touch.clientY,
        lastTime: event.timeStamp,
        rafId: 0,
      };
    };

    const onTouchMove = (event: Event) => {
      const touch = (event as TouchEvent).touches?.[0];
      if (!touch) return;

      const state = dragState.current;
      const deltaY = touch.clientY - state.startY;
      const newHeight = Math.max(0, state.startHeight - deltaY);

      state.lastY = touch.clientY;
      state.lastTime = event.timeStamp;

      cancelAnimationFrame(state.rafId);
      state.rafId = requestAnimationFrame(() => {
        setIsDragging(true);
        setDragHeight(newHeight);
      });
    };

    const onTouchEnd = (event: Event) => {
      const touch = (event as TouchEvent).changedTouches?.[0];
      if (!touch) return;

      cancelAnimationFrame(dragState.current.rafId);

      const state = dragState.current;
      const deltaY = touch.clientY - state.startY;
      const elapsed = event.timeStamp - state.startTime;
      const velocity = elapsed > 0 ? deltaY / elapsed : 0;
      const currentHeight = Math.max(0, state.startHeight - deltaY);

      const resolved = resolveSnap(
        currentHeight,
        velocity,
        snap,
        getHeaderHeight(),
        window.innerHeight,
      );

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
  }, [isActive, headerRef, sheetRef, snap, onClose, getHeight, getHeaderHeight]);

  const height = dragHeight ?? (isEntering ? 0 : getHeight(snap));

  const sheetStyle: React.CSSProperties = {
    height,
    willChange: 'height',
    transition: isDragging ? 'none' : TRANSITION,
  };

  return { snap, setSnap, sheetStyle, isDragging };
}
