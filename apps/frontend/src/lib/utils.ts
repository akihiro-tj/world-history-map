import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The design system's typography roles are custom font-size utilities
// (`text-title`, `text-body`, ...). tailwind-merge does not know they are
// font sizes, so by default it treats them as text-color classes and drops
// them when a `text-<color>` class (e.g. `text-text-primary`) is also present.
// Registering them in the font-size group keeps both the size and the color.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['title', 'panel-title', 'section-heading', 'label', 'body', 'caption'] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}
