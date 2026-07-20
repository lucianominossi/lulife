"use client";

import { useActionState } from "react";
import type { AuthActionState } from "@/app/actions/auth";
import {
  updateProfileEmailAction,
  updateProfileNameAction,
  updateProfilePasswordAction,
} from "@/app/actions/auth";

function ProfileFieldForm({
  action,
  submitLabel,
  children,
}: {
  action: (
    prev: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-3">
      {children}
      {state.error && (
        <p className="text-sm text-[var(--color-danger)]" role="alert">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="text-sm text-[#22C55E]" role="status">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn-primary px-4 py-2 text-sm"
      >
        {pending ? "Salvando…" : submitLabel}
      </button>
    </form>
  );
}

export function ProfileNameForm({ defaultName }: { defaultName: string }) {
  return (
    <ProfileFieldForm
      action={updateProfileNameAction}
      submitLabel="Salvar nome"
    >
      <label className="block space-y-1.5">
        <span className="text-sm text-[var(--color-ink-muted)]">Nome</span>
        <input
          name="name"
          required
          defaultValue={defaultName}
          autoComplete="name"
          className="input-field"
        />
      </label>
    </ProfileFieldForm>
  );
}

export function ProfileEmailForm({ defaultEmail }: { defaultEmail: string }) {
  return (
    <ProfileFieldForm
      action={updateProfileEmailAction}
      submitLabel="Atualizar email"
    >
      <label className="block space-y-1.5">
        <span className="text-sm text-[var(--color-ink-muted)]">Novo email</span>
        <input
          name="email"
          type="email"
          required
          defaultValue={defaultEmail}
          autoComplete="email"
          className="input-field"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm text-[var(--color-ink-muted)]">
          Senha atual (confirmação)
        </span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="input-field"
        />
      </label>
    </ProfileFieldForm>
  );
}

export function ProfilePasswordForm() {
  return (
    <ProfileFieldForm
      action={updateProfilePasswordAction}
      submitLabel="Alterar senha"
    >
      <label className="block space-y-1.5">
        <span className="text-sm text-[var(--color-ink-muted)]">Senha atual</span>
        <input
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className="input-field"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm text-[var(--color-ink-muted)]">Nova senha</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input-field"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm text-[var(--color-ink-muted)]">
          Confirmar nova senha
        </span>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input-field"
        />
      </label>
    </ProfileFieldForm>
  );
}
