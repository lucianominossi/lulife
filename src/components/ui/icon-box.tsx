import type { LucideIcon } from "lucide-react";

const TONE_STYLES = {
  income: "bg-[#22C55E]/15 text-[#22C55E]",
  expense: "bg-[#F43F5E]/15 text-[#F43F5E]",
  invest: "bg-[#3B82F6]/15 text-[#3B82F6]",
  savings: "bg-[#8B5CF6]/15 text-[#8B5CF6]",
  goals: "bg-[#FACC15]/15 text-[#FACC15]",
  transport: "bg-[#FB923C]/15 text-[#FB923C]",
  muted: "bg-white/5 text-[#7A8596]",
} as const;

export type IconTone = keyof typeof TONE_STYLES;

export function IconBox({
  icon: Icon,
  tone = "muted",
  size = "md",
}: {
  icon: LucideIcon;
  tone?: IconTone;
  size?: "sm" | "md" | "lg";
}) {
  const dim =
    size === "sm" ? "h-8 w-8 rounded-lg" : size === "lg" ? "h-12 w-12 rounded-2xl" : "h-10 w-10 rounded-xl";
  const iconSize = size === "sm" ? 14 : size === "lg" ? 22 : 18;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${dim} ${TONE_STYLES[tone]}`}
    >
      <Icon size={iconSize} strokeWidth={2} />
    </span>
  );
}
