# @gabrielzubioli/db

Artefatos de dados compartilhados entre o app web e o app mobile.

## Conteúdo

| Arquivo             | O que é                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| `src/schema.ts`     | Schema local (SQLite) do PowerSync — espelho das tabelas do Postgres. Exporta `AppSchema` e o tipo `Database`. |
| `sync/streams.yaml` | Sync rules (formato **streams edition 3**) publicadas na instância PowerSync.                                  |
| `src/index.ts`      | Ponto de entrada do pacote.                                                                                    |

> Os tipos gerados do Postgres (`supabase gen types typescript`) serão adicionados
> aqui no Milestone 1, virando a **fonte única** de tipos para web e mobile.

## Como o offline funciona (visão geral)

```
App (mobile/web)
   │  lê/escreve
   ▼
SQLite local  ◄──── PowerSync SDK ────►  Serviço PowerSync  ◄────►  Postgres (Supabase)
   (fonte de verdade da UI)              (aplica streams.yaml)      (RLS continua valendo)
```

- **Leitura**: a UI consulta o SQLite local (instantâneo, funciona offline).
- **Escrita**: gravações vão para uma fila local e são enviadas ao Supabase pelo
  _connector_ quando há conexão. Conflitos resolvidos por last-write-wins via
  `updated_at` (a definir por tabela no Milestone 1).
- **Segurança**: o connector usa o token do usuário → o **RLS do Postgres continua
  sendo a autoridade**. As sync rules apenas particionam o que desce para o device.

## Setup da instância PowerSync (pré-requisito de infra)

1. Criar uma instância PowerSync (cloud) e conectá-la ao Postgres do Supabase
   (connection string + replicação lógica habilitada).
2. Publicar `sync/streams.yaml` como as sync rules da instância.
3. Configurar a validação de JWT do Supabase (`auth.user_id()` → `sub`).
4. No app, inicializar `PowerSyncDatabase({ schema: AppSchema })` e conectar com um
   `BackendConnector` que:
   - `fetchCredentials()` → endpoint PowerSync + token do Supabase;
   - `uploadData()` → aplica a fila de mutações via `@supabase/supabase-js`
     (insert/update/delete respeitando RLS).

Ver a documentação oficial: https://docs.powersync.com (Supabase + React Native).

## Pré-requisito de schema (Milestone 1)

As sync rules por JOIN cobrem as tabelas-filhas sem `user_id`. Todas as tabelas
precisam de `updated_at` (para LWW) e as novas tabelas (`exercise_muscles`,
`progression_settings`, `tdee_estimates`) serão criadas via migration antes de
ligar a replicação.
