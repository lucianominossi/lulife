import type { LucideIcon } from "lucide-react";
import {
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { Money } from "@/components/money";
import { AnimatedMoney } from "@/components/ui/animated-money";
import { IconBox, type IconTone } from "@/components/ui/icon-box";

export function StatCard({
  label,
  value,
  hint,
  tone,
  icon,
  iconTone = "muted",
  changePct,
  animate = true,
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

  return (
    <div
      className={`panel panel-hover flex flex-col gap-4 p-6 ${className}`}
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

      <div className="mt-auto flex items-center justify-between gap-2">
        {hint && (
          <p className="text-xs text-[var(--color-ink-subtle)]">{hint}</p>
        )}
        {changePct != null && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium ${
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
    </div>
  );
}
