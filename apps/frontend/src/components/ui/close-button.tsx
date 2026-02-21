import { type ComponentProps, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface CloseButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** Size of the button */
  size?: 'sm' | 'md';
}

/**
 * Reusable close button component with X icon
 */
export const CloseButton = forwardRef<HTMLButtonElement, CloseButtonProps>(
  ({ size = 'md', className, ...props }, ref) => {
    const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'rounded-lg text-gray-300 transition-colors hover:bg-gray-600 hover:text-white',
          size === 'sm' ? 'p-1' : 'p-1.5',
          className,
        )}
        {...props}
      >
        <svg
          className={iconSize}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        <span className="sr-only">{props['aria-label'] ?? '閉じる'}</span>
      </button>
    );
  },
);

CloseButton.displayName = 'CloseButton';
