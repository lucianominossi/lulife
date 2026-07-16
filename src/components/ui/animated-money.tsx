"use client";

import { useEffect, useRef, useState } from "react";
import { formatBRL } from "@/lib/dates";

export function AnimatedMoney({
  value,
  tone = "default",
  className = "",
  duration = 700,
}: {
  value: number;
  tone?: "default" | "positive" | "negative" | "muted";
  className?: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (value - from) * eased;
      setDisplay(next);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  const color =
    tone === "positive"
      ? "text-[var(--color-ok)]"
      : tone === "negative"
        ? "text-[var(--color-danger)]"
        : tone === "muted"
          ? "text-[var(--color-ink-muted)]"
          : "";

  return (
    <span className={`tabular-nums ${color} ${className}`}>
      {formatBRL(display)}
    </span>
  );
}
