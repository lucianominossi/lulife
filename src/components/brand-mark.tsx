import Image from "next/image";

export function BrandMark({
  size = "md",
  withWordmark = false,
  className = "",
  subtitle,
}: {
  size?: "sm" | "md" | "lg";
  withWordmark?: boolean;
  className?: string;
  subtitle?: string;
}) {
  const dim =
    size === "sm" ? "h-8 w-8" : size === "lg" ? "h-10 w-10" : "h-9 w-9";
  const px = size === "sm" ? 32 : size === "lg" ? 40 : 36;
  const radius = size === "sm" ? "rounded-lg" : "rounded-xl";
  const wordSize =
    size === "sm" ? "text-lg" : size === "lg" ? "text-2xl" : "text-lg";

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className={`relative inline-flex ${dim} ${radius} shrink-0 overflow-hidden border border-[var(--border-strong)] bg-[var(--surface)] shadow-sm`}
        aria-hidden={!withWordmark}
      >
        <Image
          src="/logo-mark.png"
          alt=""
          width={px}
          height={px}
          className="h-full w-full object-contain p-0.5"
          priority
        />
      </span>
      {withWordmark && (
        <span className="min-w-0">
          <span
            className={`block font-semibold leading-tight tracking-tight text-[var(--ink)] ${wordSize}`}
          >
            Lulife
          </span>
          {subtitle && (
            <span className="mt-0.5 block text-[11px] text-[var(--color-sidebar-muted)]">
              {subtitle}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
