import { useProjectionContext } from '../../contexts/projection-context';
import { ProjectionToggle } from '../map/projection-toggle';

interface ControlBarProps {
  onOpenLicense: () => void;
}

export function ControlBar({ onOpenLicense }: ControlBarProps) {
  const { projection, setProjection } = useProjectionContext();

  return (
    <div className="absolute right-4 top-4 z-20 flex flex-col gap-2">
      <ProjectionToggle
        projection={projection}
        onToggle={setProjection}
        className="bg-surface-panel p-3 text-text-dimmed shadow-lg backdrop-blur-sm transition-colors hover:text-text-primary"
        data-testid="projection-toggle"
      />
      <button
        type="button"
        data-testid="license-link"
        onClick={onOpenLicense}
        className="rounded-lg bg-surface-panel p-3 text-text-dimmed shadow-lg backdrop-blur-sm transition-colors hover:text-text-primary"
      >
        <svg
          className="h-6 w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
        <span className="sr-only">このサイトについて</span>
      </button>
    </div>
  );
}
