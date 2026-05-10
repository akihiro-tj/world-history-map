import { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-is-mobile';

export interface PaddingInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

const DESKTOP_PANEL_LEFT = 416;
const DESKTOP_EDGE_GAP = 24;
const MOBILE_EDGE_GAP = 16;
const HALF_VIEWPORT_RATIO = 0.4;

export function usePanelPadding(): PaddingInsets {
  const isMobile = useIsMobile();
  const [height, setHeight] = useState(() =>
    typeof window === 'undefined' ? 0 : window.innerHeight,
  );

  useEffect(() => {
    const handler = () => setHeight(window.innerHeight);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  if (isMobile) {
    return {
      top: MOBILE_EDGE_GAP,
      right: MOBILE_EDGE_GAP,
      bottom: height * HALF_VIEWPORT_RATIO + MOBILE_EDGE_GAP,
      left: MOBILE_EDGE_GAP,
    };
  }

  return {
    top: DESKTOP_EDGE_GAP,
    right: DESKTOP_EDGE_GAP,
    bottom: DESKTOP_EDGE_GAP,
    left: DESKTOP_PANEL_LEFT,
  };
}
