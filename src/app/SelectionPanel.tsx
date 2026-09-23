import type { City } from "../data/city";
import { COPY } from "./copy";

type SelectionPanelProps = {
  city: City;
  onClose: () => void;
};

// PC は右上、スマートフォンは下部のシート
export function SelectionPanel({ city, onClose }: SelectionPanelProps) {
  return (
    <section
      aria-live="polite"
      className="pointer-events-auto absolute inset-x-0 bottom-0 m-md flex items-start justify-between gap-md rounded-lg border border-border bg-surface p-lg text-on-surface shadow-md md:inset-x-auto md:bottom-auto md:right-0 md:top-0 md:w-72"
    >
      <h2 className="font-body text-title">{city.name}</h2>
      <button
        type="button"
        aria-label={COPY.close}
        onClick={onClose}
        className="rounded-sm p-xs text-muted hover:bg-highlight"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 3l10 10M13 3L3 13" />
        </svg>
      </button>
    </section>
  );
}
