import type { LucideIcon } from "lucide-react";
import {
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { Money } from "@/components/money";
import { AnimatedMoney } from "@/components/ui/animated-money";
import { IconBox, type IconTone } from "@/components/ui/icon-box";
import { Sparkline } from "@/components/ui/sparkline";

export function StatCard({
  label,
  value,
  hint,
  tone,
  icon,
  iconTone = "muted",
  changePct,
  animate = true,
  sparkline,
  sparklineColor,
  featured = false,
  className = "",
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "default" | "positive" | "negative";
  icon?: LucideIcon;
  iconTone?: IconTone;
  changePct?: number | null;
  animate?: boolean;
  sparkline?: number[];
  sparklineColor?: string;
  featured?: boolean;
  className?: string;
}) {
  const changeTone =
    changePct == null
      ? null
      : changePct > 0
        ? "positive"
        : changePct < 0
          ? "negative"
          : "neutral";

  const ChangeIcon =
    changeTone === "positive"
      ? TrendingUp
      : changeTone === "negative"
        ? TrendingDown
        : Minus;

  const sparkColor =
    sparklineColor ??
    (tone === "positive"
      ? "var(--ok)"
      : tone === "negative"
        ? "var(--danger)"
        : "var(--accent)");

  return (
    <div
      className={`panel panel-hover flex flex-col gap-4 p-6 ${
        featured
          ? "border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-gradient-to-br from-[var(--accent-soft)] via-[var(--surface)] to-[var(--brand-soft)] shadow-[var(--shadow-card)]"
          : ""
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[var(--color-ink-muted)]">
          {label}
        </p>
        {icon && <IconBox icon={icon} tone={iconTone} />}
      </div>

      <p className="text-[34px] font-bold leading-none tracking-tight">
        {animate ? (
          <AnimatedMoney value={value} tone={tone} />
        ) : (
          <Money value={value} tone={tone} />
        )}
      </p>

      <div className="mt-auto flex items-end justify-between gap-2">
        <div className="min-w-0">
          {hint && (
            <p className="text-xs text-[var(--color-ink-subtle)]">{hint}</p>
          )}
          {changePct != null && (
            <span
              className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${
                changeTone === "positive"
                  ? "text-[var(--color-ok)]"
                  : changeTone === "negative"
                    ? "text-[var(--color-danger)]"
                    : "text-[var(--color-ink-subtle)]"
              }`}
            >
              <ChangeIcon size={12} />
              {changePct > 0 ? "+" : ""}
              {changePct.toFixed(1)}%
            </span>
          )}
        </div>
        {sparkline && sparkline.length > 0 && (
          <Sparkline data={sparkline} color={sparkColor} />
        )}
      </div>
    </div>
  );
}
