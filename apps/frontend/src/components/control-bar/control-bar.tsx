import type { ProjectionType } from '../map/projection-toggle';
import { ProjectionToggle } from '../map/projection-toggle';

interface ControlBarProps {
  projection: ProjectionType;
  onToggleProjection: (projection: ProjectionType) => void;
  onOpenLicense: () => void;
}

export function ControlBar({ projection, onToggleProjection, onOpenLicense }: ControlBarProps) {
  return (
    <div className="absolute right-4 top-4 z-20 flex flex-col gap-2">
      <ProjectionToggle
        projection={projection}
        onToggle={onToggleProjection}
        className="bg-gray-700/95 p-3 text-white/60 shadow-lg backdrop-blur-sm transition-colors hover:text-white"
        data-testid="projection-toggle"
      />
      <button
        type="button"
        data-testid="license-link"
        onClick={onOpenLicense}
        className="rounded-lg bg-gray-700/95 p-3 text-white/60 shadow-lg backdrop-blur-sm transition-colors hover:text-white"
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
      <a
        href="https://github.com/akihiro-tj/world-history-map"
        target="_blank"
        rel="noopener noreferrer"
        data-testid="github-link"
        className="rounded-lg bg-gray-700/95 p-3 text-white/60 shadow-lg backdrop-blur-sm transition-colors hover:text-white"
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
            d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
          />
        </svg>
        <span className="sr-only">ソースコードを見る</span>
      </a>
    </div>
  );
}
