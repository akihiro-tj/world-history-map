import { cn } from '@/lib/utils';

interface ScrollFadeOverlayProps {
  show: boolean;
  fromColor?: string;
}

export function ScrollFadeOverlay({
  show,
  fromColor = 'from-surface-panel',
}: ScrollFadeOverlayProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t to-transparent transition-opacity duration-200',
        fromColor,
        show ? 'opacity-100' : 'opacity-0',
      )}
    />
  );
}
