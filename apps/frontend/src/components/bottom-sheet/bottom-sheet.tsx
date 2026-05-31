import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCanScrollDown } from '@/hooks/use-can-scroll-down';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { cn } from '@/lib/utils';
import { ScrollFadeOverlay } from '../scroll-fade-overlay/scroll-fade-overlay';
import { useBottomSheetSnap } from './hooks/use-bottom-sheet-snap';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  header: React.ReactNode;
  children: React.ReactNode;
  'aria-labelledby'?: string;
}

export function BottomSheet({ isOpen, onClose, header, children, ...props }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { snap, sheetStyle, isDragging } = useBottomSheetSnap({
    isActive: isOpen,
    headerRef,
    sheetRef,
    onClose,
  });

  const canScrollDown = useCanScrollDown(scrollRef, isOpen);

  useEscapeKey(isOpen, onClose);
  useFocusTrap(snap === 'expanded', sheetRef);

  if (!isOpen) return null;

  const showFade = canScrollDown && snap !== 'collapsed';

  return createPortal(
    <>
      {snap === 'expanded' && (
        <button
          type="button"
          className="fixed inset-0 z-30 cursor-default border-none bg-surface-scrim"
          data-testid="bottom-sheet-backdrop"
          onClick={onClose}
          aria-label="Close"
        />
      )}
      <div
        ref={sheetRef}
        role="dialog"
        aria-labelledby={props['aria-labelledby']}
        style={sheetStyle}
        className="fixed inset-x-0 bottom-0 z-40 flex flex-col rounded-t-2xl bg-surface-sheet shadow-xl"
      >
        <div
          ref={headerRef}
          className={cn('shrink-0 touch-none', isDragging ? 'cursor-grabbing' : 'cursor-grab')}
        >
          <div className="flex justify-center pt-2 pb-1">
            <div
              className="h-1 w-10 rounded-full bg-surface-handle"
              data-testid="bottom-sheet-handle"
            />
          </div>
          {header}
        </div>
        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollRef}
            className={cn('h-full', snap === 'collapsed' ? 'overflow-hidden' : 'overflow-y-auto')}
          >
            {children}
          </div>
          <ScrollFadeOverlay show={showFade} fromColor="from-surface-sheet" />
        </div>
      </div>
    </>,
    document.body,
  );
}
