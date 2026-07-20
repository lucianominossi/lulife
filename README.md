# Lulife

Portal web de controle financeiro pessoal.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- **Supabase Auth** (email/senha, confirmação e reset)
- Drizzle ORM + **Neon Postgres** (produção) ou **PGlite** local (sem `DATABASE_URL`)
- Recharts

## Desenvolvimento local

1. Crie um projeto free no [Supabase](https://supabase.com) e copie URL + anon key + service role.
2. Em **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`
3. Habilite email/senha e confirmação de email (templates no dashboard).

```bash
npm install
cp .env.example .env.local   # preencha as variáveis Supabase
npm run db:seed              # cria usuário no Auth + espelho local
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Credenciais padrão do seed (`.env.local`):

- Email: `luciano@lulife.app`
- Senha: `lulife123`

Sem `DATABASE_URL`, os dados ficam em `.data/pglite/`.

### Migrar usuários já existentes (Auth.js → Supabase)

```bash
npm run auth:migrate-users
```

Importa `users` locais com o **mesmo UUID** e `password_hash` bcrypt.

## Deploy (Vercel Hobby + Neon Free)

1. Crie um projeto no [Neon](https://neon.tech) (free) e copie a connection string.
2. Importe o repo no Vercel (Hobby).
3. Configure as variáveis:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string Neon (`sslmode=require`) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (só server/scripts) |
| `NEXT_PUBLIC_APP_URL` | URL pública do app |
| `SEED_EMAIL` / `SEED_PASSWORD` / `SEED_NAME` | Usuário inicial |
| `CRON_SECRET` | Protege `/api/cron/recurring` |

4. No Supabase, adicione a URL de produção em Site URL / Redirect URLs (`…/auth/callback`).
5. Aplique o schema (`drizzle/*.sql` ou `db:push`) e rode o seed (ou o script de migração) uma vez.
6. Cron diário em `vercel.json` → `/api/cron/recurring` com `Authorization: Bearer $CRON_SECRET`.

Rate limiting usa tabela Postgres (`rate_limits`) — sem Redis/KV pagos.

## Segurança (MVP)

Já incluso: ownership nas mutations, sessões Supabase, recorrentes idempotentes, headers HTTP, export/exclusão LGPD, teto de magnitude em valores (negativos/reembolsos permitidos).

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
  app/api/       # export, cron
  app/auth/      # callback OAuth/email Supabase
  db/            # schema + client
  lib/supabase/  # clients SSR + ensureLocalUser
  components/
```
