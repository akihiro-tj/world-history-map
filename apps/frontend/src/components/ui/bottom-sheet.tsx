import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useBottomSheetSnap } from '@/hooks/use-bottom-sheet-snap';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { cn } from '@/lib/utils';

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

  const { snap, sheetStyle, isDragging } = useBottomSheetSnap({
    isActive: isOpen,
    headerRef,
    sheetRef,
    onClose,
  });

  useEscapeKey(isOpen, onClose);
  useFocusTrap(snap === 'expanded', sheetRef);

  if (!isOpen) return null;

  return createPortal(
    <>
      {snap === 'expanded' && (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default border-none bg-black/50"
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
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-gray-800 shadow-xl"
      >
        <div
          ref={headerRef}
          className={cn('shrink-0 touch-none', isDragging ? 'cursor-grabbing' : 'cursor-grab')}
        >
          <div className="flex justify-center py-2">
            <div className="h-1 w-10 rounded-full bg-gray-500" data-testid="bottom-sheet-handle" />
          </div>
          {header}
        </div>
        <div
          className={cn(
            'min-h-0 flex-1',
            snap === 'collapsed' ? 'overflow-hidden' : 'overflow-y-auto',
          )}
        >
          {children}
        </div>
      </div>
    </>,
    document.body,
  );
}
