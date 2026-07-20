# Lulife

Portal web de controle financeiro pessoal — substitui a planilha Excel.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Auth.js (credentials + JWT `sessionVersion`)
- Drizzle ORM + **Neon Postgres** (produção) ou **PGlite** local (sem `DATABASE_URL`)
- Recharts

## Desenvolvimento local

```bash
npm install
cp .env.example .env.local   # se ainda não existir
npm run db:seed
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Credenciais padrão do seed (`.env.local`):

- Email: `luciano@lulife.app`
- Senha: `lulife123`

Sem `DATABASE_URL`, os dados ficam em `.data/pglite/`.

## Deploy (Vercel Hobby + Neon Free)

MVP sem recursos pagos na Vercel (no máximo domínio próprio), adequado até ~1k usuários:

1. Crie um projeto no [Neon](https://neon.tech) (free) e copie a connection string.
2. Importe o repo no Vercel (Hobby).
3. Configure as variáveis:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string Neon (`sslmode=require`) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` |
| `AUTH_URL` | URL pública (emails) |
| `RESEND_API_KEY` | **Obrigatório em produção** (emails) |
| `EMAIL_FROM` | Remetente Resend |
| `SEED_EMAIL` / `SEED_PASSWORD` / `SEED_NAME` | Usuário inicial |
| `CRON_SECRET` | Protege `/api/cron/recurring` |

4. Aplique o schema (`drizzle/*.sql` ou `db:push`) e rode o seed uma vez.
5. Cron diário em `vercel.json` → `/api/cron/recurring` com `Authorization: Bearer $CRON_SECRET`.

Rate limiting usa tabela Postgres (`rate_limits`) — sem Redis/KV pagos.

## Segurança (MVP)

Já incluso: ownership nas mutations, `sessionVersion` no reset/logout, recorrentes idempotentes, headers HTTP, export/exclusão LGPD, teto de magnitude em valores (negativos/reembolsos permitidos).

**Adiado até >1k usuários / infra paga:** 2FA, criptografia de campo (além do disco do Neon), audit trail imutável, rate limit em edge Redis.

Veja [/privacy](/privacy) no app.

## Funcionalidades

- Visão do **mês** (entradas, crédito, Pix/débito, orçamento, saldo atual/projetado)
- **Gastos** unificados (`credit` vs `pix_debit`)
- **Investimentos** por tipo e instituição + gráficos
- **Recorrências** mensais + geração ao abrir o mês / cron
- **Cadastros** + exportação JSON / exclusão de conta

## Estrutura

```
src/
  app/(app)/     # telas autenticadas
  app/api/       # auth, export, cron
  db/            # schema + client
  lib/           # finance, dates, recurring, rate-limit
  components/
```
