"use client";

import { useActionState } from "react";
import type { AuthActionState } from "@/app/actions/auth";

type Action = (
  prev: AuthActionState,
  formData: FormData,
) => Promise<AuthActionState>;

export function AuthForm({
  action,
  children,
  submitLabel,
  pendingLabel,
}: {
  action: Action;
  children: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="mt-8 space-y-4">
      {children}
      {state.error && (
        <p className="text-sm text-[var(--color-danger)]" role="alert">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="text-sm text-[var(--color-ok)]" role="status">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full py-3.5"
      >
        {pending ? pendingLabel || "Aguarde…" : submitLabel}
      </button>
    </form>
  );
}
