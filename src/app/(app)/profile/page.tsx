import Link from "next/link";
import {
  deleteMyAccount,
  signOutAndInvalidate,
} from "@/app/actions/auth";
import {
  ProfileEmailForm,
  ProfileNameForm,
  ProfilePasswordForm,
} from "@/components/profile-forms";
import { requireUser } from "@/lib/session";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight">Perfil</h1>
          <p className="mt-1 text-[var(--color-ink-muted)]">
            Dados da conta, segurança e privacidade
          </p>
        </div>
        <form action={signOutAndInvalidate}>
          <button
            type="submit"
            className="rounded-xl border border-[#F43F5E]/25 px-4 py-2 text-sm font-medium text-[#F43F5E] transition hover:bg-[#F43F5E]/10"
          >
            Sair da conta
          </button>
        </form>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel space-y-3 p-5">
          <h2 className="font-display text-lg font-semibold">Nome</h2>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Como você aparece no Lulife.
          </p>
          <ProfileNameForm defaultName={user.name} />
        </section>

        <section className="panel space-y-3 p-5">
          <h2 className="font-display text-lg font-semibold">Email</h2>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Ao trocar o email, enviaremos um link de confirmação para o novo
            endereço.
          </p>
          <ProfileEmailForm defaultEmail={user.email} />
        </section>

        <section className="panel space-y-3 p-5 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Senha</h2>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Após alterar a senha, você precisará entrar novamente.
          </p>
          <div className="max-w-md">
            <ProfilePasswordForm />
          </div>
        </section>
      </div>

      <section className="panel space-y-4 p-5">
        <h2 className="font-display text-lg font-semibold">
          Privacidade e dados
        </h2>
        <p className="text-sm text-[var(--color-ink-muted)]">
          Exporte um JSON com seus lançamentos ou exclua permanentemente a
          conta. Veja também a{" "}
          <Link href="/privacy" className="text-[#C4B5FD] hover:underline">
            política de privacidade
          </Link>
          .
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="/api/export" className="btn-primary px-4 py-2 text-sm">
            Exportar meus dados
          </a>
        </div>
        <form
          action={deleteMyAccount}
          className="space-y-3 border-t border-[var(--color-border)] pt-4"
        >
          <p className="text-sm text-[#F43F5E]">
            Excluir a conta remove categorias, contas, lançamentos, orçamentos,
            investimentos e recorrências. Esta ação não pode ser desfeita.
          </p>
          <label className="flex items-start gap-2 text-sm text-[var(--color-ink-muted)]">
            <input type="checkbox" name="confirm" required className="mt-1" />
            Confirmo que quero excluir permanentemente minha conta e todos os
            dados.
          </label>
          <button
            type="submit"
            className="rounded-xl border border-[#F43F5E]/40 bg-[#F43F5E]/10 px-4 py-2 text-sm font-medium text-[#F43F5E] transition hover:bg-[#F43F5E]/20"
          >
            Excluir minha conta
          </button>
        </form>
      </section>
    </div>
  );
}
