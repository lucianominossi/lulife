import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";

export default function PrivacyPage() {
  return (
    <AuthShell
      title="Privacidade"
      subtitle="Como o Lulife trata seus dados financeiros (LGPD)."
    >
      <div className="mt-8 space-y-5 text-sm leading-relaxed text-[var(--color-ink-muted)]">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">
            Finalidade
          </h2>
          <p>
            O Lulife armazena dados que você informa (email, categorias, contas,
            lançamentos, orçamentos, investimentos e regras recorrentes) para
            oferecer o controle financeiro pessoal na plataforma.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">
            Retenção
          </h2>
          <p>
            Os dados permanecem enquanto sua conta estiver ativa. Ao excluir a
            conta em Cadastros, apagamos o usuário e os registros vinculados
            (cascata no banco).
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">
            Seus direitos
          </h2>
          <p>
            Você pode exportar seus dados em JSON e solicitar a exclusão da conta
            na área autenticada (Cadastros). Para dúvidas, use o email da conta
            com a qual se cadastrou.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">
            Roadmap de segurança (pós-MVP)
          </h2>
          <p>
            Enquanto o produto operar no free tier (até ~1k usuários), recursos
            como autenticação em dois fatores, trilha de auditoria imutável e
            criptografia de campo (além da cifra de disco do provedor) ficam
            planejados para uma fase posterior com infra paga.
          </p>
        </section>
        <p>
          <Link href="/login" className="text-[#C4B5FD] hover:text-white">
            Voltar ao login
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
