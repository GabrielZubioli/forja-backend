# forja-backend

Camada de dados e plataforma do Forja: schema do Postgres, RLS, Edge Functions,
geradores de catálogo e o contrato `@forja/db`.

Este repositório **não tem servidor de aplicação**, e isso é uma decisão, não uma
lacuna. Os apps falam direto com o Postgres via PostgREST, e o RLS é a fronteira
de segurança. Um proxy no meio adicionaria latência a cada leitura e quebraria a
sincronização offline do PowerSync, que precisa replicar do Postgres. A única
coisa que roda como servidor é a Edge Function `coach`, porque a chave da API de
IA não pode chegar ao navegador.

```
┌─────────────┐        PostgREST (RLS)        ┌──────────────┐
│  web/mobile │ ─────────────────────────────►│              │
│             │                               │   Postgres   │
│             │◄──── PowerSync (streams) ─────│  (Supabase)  │
└─────────────┘                               └──────────────┘
       │                                             ▲
       └──────► Edge Function `coach` ───────────────┘
                (valida JWT, guarda a chave da IA)
```

## Setup

```bash
npm install
cp .env.example .env      # preencha SUPABASE_ACCESS_TOKEN
npm run verify
```

O `project_id` do Supabase já está em `supabase/config.toml` e não é segredo —
os scripts o leem de lá. O `.env` guarda só o que é credencial de verdade.

## Scripts

| Script                   | O que faz                                             |
| ------------------------ | ----------------------------------------------------- |
| `npm run db:types`       | Regenera `packages/db/src/types.ts` do projeto remoto |
| `npm run db:types:local` | Idem, do banco local (requer Docker)                  |
| `npm run db:types:check` | Falha se os tipos versionados divergirem do banco     |
| `npm run db:push`        | Aplica as migrations pendentes                        |
| `npm run db:diff`        | Mostra o drift entre migrations e o banco             |
| `npm run db:lint`        | Lint do schema                                        |
| `npm run sync:validate`  | Valida `streams.yaml` contra o `AppSchema`            |
| `npm run db:build`       | Compila `@forja/db` para `dist/`                      |
| `npm run db:publish`     | Publica `@forja/db` no registry                       |
| `npm run verify`         | typecheck + sync:validate + build + format:check      |
| `npm run catalog:*`      | Regenera as migrations de seed do catálogo            |

## O contrato: `@forja/db`

É a única coisa que o frontend importa daqui. Contém os tipos gerados do Postgres
e o schema local do PowerSync, publicados como pacote versionado.

O ciclo é: **mudou o schema → `db:push` → `db:types` → bump de versão → publica →
o frontend atualiza a dependência.** Nada é copiado à mão, então os dois lados não
têm como divergir em silêncio.

Ver [`packages/db/README.md`](packages/db/README.md) para os subpaths (`/types`,
`/schema`) e por que existem dois tipos chamados `Database`.

## Migrations

Migrations são **imutáveis depois de aplicadas**. Para corrigir algo, escreva uma
nova. Editar uma migration já aplicada faz o histórico do repo divergir do estado
real do banco, e o `db:diff` passa a mentir.

As migrations de seed do catálogo (`*_seed_exercise_catalog.sql`,
`*_seed_food_catalog.sql`, `*_seed_exercise_library.sql`) são **geradas** pelos
scripts em `scripts/catalog/` e idempotentes. Não as edite à mão: rode o gerador.

Os caches dos geradores (`.cache-*.json`, ~19 MB) não são versionados — são
downloads das fontes externas e o script os refaz sozinho.

## Documentação

Em [`docs/`](docs/): schema, RLS, fluxo de migrations, autenticação e a visão
geral da arquitetura.
