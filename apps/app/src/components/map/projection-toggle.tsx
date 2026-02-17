import { type ComponentProps, forwardRef } from 'react';

/**
 * Projection type for the map
 */
export type ProjectionType = 'mercator' | 'globe';

interface ProjectionToggleProps
  extends Omit<ComponentProps<'button'>, 'children' | 'onClick' | 'onToggle'> {
  /** Current projection type */
  projection: ProjectionType;
  /** Callback when projection changes */
  onToggle: (projection: ProjectionType) => void;
}

/**
 * Toggle button for switching between mercator and globe projections
 *
 * @example
 * ```tsx
 * <ProjectionToggle
 *   projection={projection}
 *   onToggle={(p) => setProjection(p)}
 * />
 * ```
 */
export const ProjectionToggle = forwardRef<HTMLButtonElement, ProjectionToggleProps>(
  ({ projection, onToggle, className = '', ...props }, ref) => {
    const handleClick = () => {
      onToggle(projection === 'mercator' ? 'globe' : 'mercator');
    };

    const isGlobe = projection === 'globe';

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        className={`rounded-lg bg-gray-700/95 p-3 text-gray-300 shadow-lg backdrop-blur-sm transition-colors hover:bg-gray-600 hover:text-white ${className}`}
        aria-label={isGlobe ? '平面地図に切り替え' : '地球儀表示に切り替え'}
        aria-pressed={isGlobe}
        {...props}
      >
        {isGlobe ? (
          // Map icon (flat projection)
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
        ) : (
          // Globe icon
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
      </button>
    );
  },
);

ProjectionToggle.displayName = 'ProjectionToggle';
