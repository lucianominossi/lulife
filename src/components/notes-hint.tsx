"use client";

import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { formatDateBR } from "@/lib/dates";

export function NotesHint({ notes }: { notes?: string | null }) {
  const trimmed = notes?.trim();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipId = useId();
  const [position, setPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  if (!trimmed) return null;

  function showTooltip() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const viewportPadding = 132;
    const x = Math.min(
      window.innerWidth - viewportPadding,
      Math.max(viewportPadding, rect.left + rect.width / 2),
    );
    setPosition({
      x,
      y: rect.top - 10,
    });
  }

  return (
    <span className="inline-flex items-center">
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--color-ink-subtle)] transition hover:bg-[var(--hover-fill)] hover:text-[var(--accent-ink)]"
        aria-label="Ver observação"
        aria-describedby={position ? tooltipId : undefined}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setPosition(null)}
        onFocus={showTooltip}
        onBlur={() => setPosition(null)}
      >
        <Info size={14} strokeWidth={2} />
      </button>
      {position &&
        createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            className="pointer-events-none fixed z-[9999] w-max max-w-[min(240px,calc(100vw-24px))] -translate-x-1/2 -translate-y-full rounded-xl border border-[var(--tooltip-border)] bg-[var(--tooltip-bg)] px-3 py-2 text-left text-xs leading-relaxed text-[var(--ink)] shadow-[var(--shadow-card-hover)]"
            style={{ left: position.x, top: position.y }}
          >
            {trimmed}
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[7px] border-t-[8px] border-x-transparent border-t-[var(--tooltip-border)]"
            />
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-[calc(100%-1px)] h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[7px] border-x-transparent border-t-[var(--tooltip-bg)]"
            />
          </span>,
          document.body,
        )}
    </span>
  );
}

export function DateWithNotes({
  date,
  notes,
}: {
  date: string | null | undefined;
  notes?: string | null;
}) {
  const label = formatDateBR(date);

  return (
    <span className="group relative inline-flex items-center gap-1.5">
      <span className="tabular-nums text-[var(--color-ink-muted)]">{label}</span>
      <NotesHint notes={notes} />
    </span>
  );
}

export function DescriptionWithNotes({
  description,
  notes,
}: {
  description: string;
  notes?: string | null;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{description}</span>
      <NotesHint notes={notes} />
    </span>
  );
}
