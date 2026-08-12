# Banco de dados — Schema

Postgres gerenciado pelo Supabase. Todo o schema está nas migrations
([supabase/migrations/](../../supabase/migrations/)). Tipos TypeScript
correspondentes: [src/integrations/supabase/types.ts](../../src/integrations/supabase/types.ts)
(auto-gerado).

Todas as tabelas ficam no schema `public`, têm **RLS habilitado** (ver
[rls.md](rls.md)) e a maioria tem `created_at`/`updated_at`.

## Enums (tipos)

| Enum                  | Valores                                                                                                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app_role`            | `admin`, `user`                                                                                                                                                                                                                                  |
| `sex_t`               | `male`, `female`, `other`                                                                                                                                                                                                                        |
| `activity_level_t`    | `sedentary`, `light`, `moderate`, `active`, `very_active`                                                                                                                                                                                        |
| `goal_t`              | `lose`, `maintain`, `gain`                                                                                                                                                                                                                       |
| `unit_system_t`       | `metric`, `imperial`                                                                                                                                                                                                                             |
| `equipment_t`         | `barbell`, `dumbbell`, `machine`, `cable`, `bodyweight`, `kettlebell`, `band`, `other`, `cardio`                                                                                                                                                 |
| `muscle_t`            | `chest`, `back`, `lats`, `traps`, `shoulders`, `front_delts`, `side_delts`, `rear_delts`, `biceps`, `triceps`, `forearms`, `core`, `abs`, `obliques`, `quads`, `hamstrings`, `glutes`, `calves`, `adductors`, `abductors`, `cardio`, `full_body` |
| `exercise_category_t` | `strength`, `cardio`, `stretching`, `plyometrics`, `olympic`                                                                                                                                                                                     |
| `set_type_t`          | `warmup`, `working`, `drop`, `failure`                                                                                                                                                                                                           |
| `meal_type_t`         | `breakfast`, `lunch`, `dinner`, `snack`                                                                                                                                                                                                          |

## Relacionamentos (visão geral)

```
auth.users ─1:1─ profiles
auth.users ─1:N─ user_roles

auth.users ─1:N─ exercises (owner_id NULL = global)
                    │
workout_templates ─1:N─ workout_template_exercises ─N:1─ exercises
workout_sessions  ─1:N─ workout_sets              ─N:1─ exercises
workout_sessions  ─N:1─ workout_templates (template_id, nullable)

auth.users ─1:N─ foods (owner_id NULL = global)
foods ─1:N─ food_log_entries ─N:1─ auth.users
foods ─1:N─ recipe_items ─N:1─ recipes ─N:1─ auth.users

auth.users ─1:N─ body_weights | body_measurements | progress_photos
```

## Tabelas

### `user_roles`

Papéis do usuário. `UNIQUE(user_id, role)`. Só SELECT do próprio (RLS). Função
`has_role(user_id, role)` consulta esta tabela.

### `profiles`

1:1 com `auth.users` (PK = user id). Dados corporais e metas nutricionais.
Colunas-chave: `display_name`, `avatar_url`, `sex`, `birth_date`, `height_cm`,
`activity_level` (def. `moderate`), `goal` (def. `maintain`), `unit_system`
(def. `metric`), `onboarding_completed`, e metas `daily_kcal_target`,
`protein_g_target`, `carbs_g_target`, `fat_g_target`, `fiber_g_target`.
Trigger `trg_profiles_updated` mantém `updated_at`.

### `exercises`

Biblioteca. `owner_id NULL` = global/oficial; senão pertence ao usuário.
`category`, `equipment`, `primary_muscle`, `secondary_muscles muscle_t[]`,
`instructions`, `is_public` (def. true), `deleted_at` (soft delete).
Índices em `owner_id` e `primary_muscle`. Seed com ~66 exercícios pt-BR.

### `workout_templates`

Modelos de treino do usuário (`user_id`, `name`, `notes`, `deleted_at`).

### `workout_template_exercises`

Itens do template. `template_id`, `exercise_id` (`ON DELETE RESTRICT`), `position`,
`target_sets` (3), `target_reps` (10), `rest_seconds` (90), `superset_group`, `notes`.

### `workout_sessions`

Treino realizado. `user_id`, `template_id` (nullable, `ON DELETE SET NULL`), `name`,
`started_at`, `ended_at`, `duration_seconds`, `notes`, `total_volume_kg`,
`deleted_at`. Índice `(user_id, started_at DESC)`.

### `workout_sets`

Séries de uma sessão. `session_id` (`ON DELETE CASCADE`), `exercise_id` (`RESTRICT`),
`position` (ordem do exercício), `set_index` (nº da série), `set_type`, `weight_kg`,
`reps`, `distance_m`, `duration_seconds` (cardio), `rpe`, `rest_seconds`, `is_pr`,
`completed` (def. true), `notes`. Índices em `session_id` e `exercise_id`.

### `foods`

Base de alimentos. `owner_id NULL` = global. Macros **por `serving_size_g`** (def. 100):
`kcal`, `protein_g`, `carbs_g`, `fat_g`, `fiber_g`, `sugar_g`, `sodium_mg`,
`saturated_fat_g`. Também `brand`, `barcode`, `source` (`custom`/`tbca`), `is_public`,
`deleted_at`. Índice GIN full-text no `name` e índice parcial em `barcode`.

### `food_log_entries`

Diário alimentar. `user_id`, `food_id` (`RESTRICT`), `log_date` (def. hoje),
`meal_type`, `servings` (def. 1), `grams` (nullable), `notes`.
Índice `(user_id, log_date DESC)`. Convenção: `factor = grams / serving_size_g`.

### `recipes` + `recipe_items`

Receitas do usuário (`name`, `servings`, `notes`, soft delete) e seus ingredientes
(`food_id` + `grams`).

### `body_weights`

Peso por dia. `UNIQUE(user_id, log_date)` → **upsert por dia**. Índice `(user_id, log_date DESC)`.

### `body_measurements`

`chest_cm`, `waist_cm`, `hip_cm`, `arm_cm`, `thigh_cm`, `neck_cm`, `body_fat_pct`,
`notes`. (Sem unique — permite múltiplos por dia.)

### `progress_photos`

`storage_path` (aponta pro bucket `progress-photos`), `angle`, `log_date`.

## Funções e triggers

- `tg_set_updated_at()` — trigger `BEFORE UPDATE` que atualiza `updated_at`
  (em profiles, exercises, templates, sessions, foods, food_log_entries, recipes).
- `handle_new_user()` — `AFTER INSERT ON auth.users`: cria `profiles` + `user_roles('user')`.
- `has_role(uuid, app_role)` — checagem de papel (SECURITY DEFINER, STABLE).

## Storage

Bucket **`progress-photos`** (privado). Objetos organizados como
`<user_id>/<arquivo>`; policies isolam por `auth.uid()`. Ver [rls.md](rls.md).
⚠️ A criação do bucket não está nas migrations (provável painel/Lovable).
