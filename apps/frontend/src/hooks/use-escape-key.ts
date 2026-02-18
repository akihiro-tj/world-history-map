import { useEffect } from 'react';

/**
 * Hook to close overlays on Escape key press
 *
 * Registers a document-level keydown listener when `isActive` is true
 * and removes it on deactivation or unmount.
 *
 * @param isActive Whether the listener should be active
 * @param onEscape Callback invoked when the Escape key is pressed
 */
export function useEscapeKey(isActive: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, onEscape]);
}
