"use client";

export function ProgressBar({
  value,
  max,
  tone = "brand",
}: {
  value: number;
  max: number;
  tone?: "brand" | "danger" | "ok" | "savings" | "goals" | "transport";
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = max > 0 && value > max;

  const colors = {
    brand: "bg-[#3B82F6]",
    danger: "bg-[#F43F5E]",
    ok: "bg-[#22C55E]",
    savings: "bg-[#6C5CFF]",
    goals: "bg-[#FACC15]",
    transport: "bg-[#FB923C]",
  };

  return (
    <div className="h-2 overflow-hidden rounded-full bg-[var(--hover-fill)]">
      <div
        className={`progress-fill h-full rounded-full ${over ? colors.danger : colors[tone]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
