"use client";

import { useFormStatus } from "react-dom";

export function DeleteButton({
  children = "excluir",
  pendingLabel = "Excluindo…",
  className = "text-xs text-[var(--color-ink-muted)] transition hover:text-[var(--color-danger)] disabled:opacity-60",
}: {
  children?: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      aria-busy={pending}
    >
      {pending ? (
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-3 w-3 animate-spin rounded-full border-2 border-current/30 border-t-current"
            aria-hidden
          />
          {pendingLabel}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
