# Lulife

Portal web de controle financeiro pessoal — substitui a planilha Excel.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Auth.js (credentials)
- Drizzle ORM + **Neon Postgres** (produção) ou **PGlite** local (sem `DATABASE_URL`)
- Recharts, ExcelJS

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

## Deploy (Vercel + Neon)

1. Crie um projeto no [Neon](https://neon.tech) e copie a connection string.
2. Importe o repo no Vercel.
3. Configure as variáveis:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string Neon |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` |
| `SEED_EMAIL` / `SEED_PASSWORD` / `SEED_NAME` | Usuário inicial |
| `CRON_SECRET` | Protege `/api/cron/recurring` |

4. No Neon, rode o schema (`npm run db:push` com `DATABASE_URL` apontando para Neon) ou use as migrations em `drizzle/`.
5. Após o primeiro deploy: `SEED_EMAIL=... npm run db:seed` (localmente apontando para Neon) ou um one-off script.
6. O cron diário em `vercel.json` chama `/api/cron/recurring` (Vercel envia o header de autorização automaticamente se `CRON_SECRET` estiver configurado — configure o cron para usar `Authorization: Bearer $CRON_SECRET`).

## Funcionalidades

- Visão do **mês** com seletor (entradas, crédito por cartão, Pix/débito, orçamento, saldo atual/projetado)
- **Gastos** unificados (`credit` vs `pix_debit` — método, não conta)
- **Investimentos** por tipo e instituição + gráficos
- **Recorrências** mensais + geração ao abrir o mês / cron
- **Importação** da planilha `.xlsx` apenas na conta autenticada

## Estrutura

```
src/
  app/(app)/     # telas autenticadas
  app/api/       # auth, import, cron
  db/            # schema + client
  lib/           # finance, dates, import, recurring
  components/
```
