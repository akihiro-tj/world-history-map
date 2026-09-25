import { useEffect, useRef, useState } from "react";
import { COPY, NATURAL_EARTH_URL } from "./copy";

type BoundaryNoteProps = {
  // スマートフォン幅で注記を隠す（選択パネルと重なるとき）
  hideOnMobile: boolean;
};

// 地図の右下に出す国境線の注記。ⓘ で出典と係争地の扱いを開く
export function BoundaryNote({ hideOnMobile }: BoundaryNoteProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // 開いている間は、注記の外（地図や検索窓）に触れるか Escape を押したら閉じる
  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // 隠している間に開いたまま残らないよう、隠すときに閉じる
  useEffect(() => {
    if (hideOnMobile) {
      setOpen(false);
    }
  }, [hideOnMobile]);

  return (
    <div
      ref={rootRef}
      className={`pointer-events-none absolute right-0 bottom-0 m-sm flex flex-col items-end gap-xs ${hideOnMobile ? "max-md:hidden" : ""}`}
    >
      {open && (
        <div className="pointer-events-auto max-w-72 rounded-md border border-border bg-surface px-md py-sm font-caption text-caption text-muted shadow-md">
          <p>
            {COPY.boundarySourceLead}
            <a
              href={NATURAL_EARTH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              {COPY.naturalEarth}
            </a>
            {COPY.boundarySourceTail}
          </p>
          <p className="mt-xs">{COPY.boundaryDisputed}</p>
        </div>
      )}
      <div className="pointer-events-auto flex items-center gap-xs rounded-sm bg-surface/85 pl-sm font-caption text-caption text-muted">
        <span>{COPY.boundaryNote}</span>
        <button
          type="button"
          aria-label={COPY.boundaryNoteButton}
          aria-expanded={open}
          onClick={() => setOpen((previous) => !previous)}
          className="grid size-6 place-items-center rounded-full text-muted hover:bg-highlight aria-expanded:text-primary"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 7.5v3.5M8 5v.01" />
          </svg>
        </button>
      </div>
    </div>
  );
}
