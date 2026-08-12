-- Blindagem de performance: RLS, índices e policies sobrepostas.
--
-- ## 1. `(select auth.uid())` — as 38 policies
--
-- `auth.uid()` é STABLE, não IMMUTABLE. Escrito solto numa policy, o planner o
-- trata como parte do filtro de linha e o chama **uma vez por linha avaliada**.
-- Envolvido em `(select ...)`, vira um InitPlan: roda uma vez por query e o
-- resultado é reusado.
--
-- Medido no catálogo de exercícios (2204 linhas), lendo 880 públicas:
--
--     Bitmap Heap Scan on exercises  (actual time=8.248..135.744 rows=880)
--       Filter: (is_public AND (is_public OR (owner_id = (COALESCE(NULLIF(
--               current_setting('request.jwt.claim.sub'...))))::uuid)))
--
-- O `current_setting()` está dentro do `Filter` — ou seja, 880 chamadas para
-- responder uma tela. O `db advisors` sinaliza as 38 policies do schema
-- `public`; nenhuma escapou.
--
-- As definições abaixo foram geradas a partir do `pg_policies` do banco real,
-- não reescritas à mão: o texto normalizado pelo Postgres é a fonte da verdade
-- sobre o que cada policy faz hoje, e transcrevê-las manualmente arriscaria
-- alterar a semântica de segurança junto com a performance.

DROP POLICY IF EXISTS "own conversations" ON public.ai_conversations;
CREATE POLICY "own conversations" ON public.ai_conversations
  FOR ALL TO authenticated
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "own messages" ON public.ai_messages;
CREATE POLICY "own messages" ON public.ai_messages
  FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM ai_conversations c
  WHERE ((c.id = ai_messages.conversation_id) AND (c.user_id = (select auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ai_conversations c
  WHERE ((c.id = ai_messages.conversation_id) AND (c.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "own recommendations" ON public.ai_recommendations;
CREATE POLICY "own recommendations" ON public.ai_recommendations
  FOR ALL TO authenticated
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "own measures" ON public.body_measurements;
CREATE POLICY "own measures" ON public.body_measurements
  FOR ALL TO authenticated
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "own weights" ON public.body_weights;
CREATE POLICY "own weights" ON public.body_weights
  FOR ALL TO authenticated
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "own diet days" ON public.diet_days;
CREATE POLICY "own diet days" ON public.diet_days
  FOR ALL TO authenticated
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "read exercise muscles" ON public.exercise_muscles;
CREATE POLICY "read exercise muscles" ON public.exercise_muscles
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM exercises e
  WHERE ((e.id = exercise_muscles.exercise_id) AND (e.deleted_at IS NULL) AND (e.is_public OR (e.owner_id = (select auth.uid())))))));

DROP POLICY IF EXISTS "delete own exercise" ON public.exercises;
CREATE POLICY "delete own exercise" ON public.exercises
  FOR DELETE TO authenticated
  USING ((owner_id = (select auth.uid())));

DROP POLICY IF EXISTS "insert own exercise" ON public.exercises;
CREATE POLICY "insert own exercise" ON public.exercises
  FOR INSERT TO authenticated
  WITH CHECK ((owner_id = (select auth.uid())));

DROP POLICY IF EXISTS "read exercises" ON public.exercises;
CREATE POLICY "read exercises" ON public.exercises
  FOR SELECT TO authenticated
  USING (((deleted_at IS NULL) AND (is_public OR (owner_id = (select auth.uid())))));

DROP POLICY IF EXISTS "update own exercise" ON public.exercises;
CREATE POLICY "update own exercise" ON public.exercises
  FOR UPDATE TO authenticated
  USING ((owner_id = (select auth.uid())))
  WITH CHECK ((owner_id = (select auth.uid())));

DROP POLICY IF EXISTS "own food favorites" ON public.food_favorites;
CREATE POLICY "own food favorites" ON public.food_favorites
  FOR ALL TO authenticated
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "own log entries" ON public.food_log_entries;
CREATE POLICY "own log entries" ON public.food_log_entries
  FOR ALL TO authenticated
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "own substitution prefs" ON public.food_substitution_prefs;
CREATE POLICY "own substitution prefs" ON public.food_substitution_prefs
  FOR ALL TO authenticated
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "delete own food" ON public.foods;
CREATE POLICY "delete own food" ON public.foods
  FOR DELETE TO authenticated
  USING ((owner_id = (select auth.uid())));

DROP POLICY IF EXISTS "insert own food" ON public.foods;
CREATE POLICY "insert own food" ON public.foods
  FOR INSERT TO authenticated
  WITH CHECK ((owner_id = (select auth.uid())));

DROP POLICY IF EXISTS "read foods" ON public.foods;
CREATE POLICY "read foods" ON public.foods
  FOR SELECT TO authenticated
  USING (((deleted_at IS NULL) AND (is_public OR (owner_id = (select auth.uid())))));

DROP POLICY IF EXISTS "update own food" ON public.foods;
CREATE POLICY "update own food" ON public.foods
  FOR UPDATE TO authenticated
  USING ((owner_id = (select auth.uid())))
  WITH CHECK ((owner_id = (select auth.uid())));

DROP POLICY IF EXISTS "own goals" ON public.goals;
CREATE POLICY "own goals" ON public.goals
  FOR ALL TO authenticated
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "own plan items" ON public.meal_plan_items;
CREATE POLICY "own plan items" ON public.meal_plan_items
  FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (meal_plan_meals m
     JOIN meal_plans p ON ((p.id = m.plan_id)))
  WHERE ((m.id = meal_plan_items.meal_id) AND (p.user_id = (select auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (meal_plan_meals m
     JOIN meal_plans p ON ((p.id = m.plan_id)))
  WHERE ((m.id = meal_plan_items.meal_id) AND (p.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "own plan meals" ON public.meal_plan_meals;
CREATE POLICY "own plan meals" ON public.meal_plan_meals
  FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM meal_plans p
  WHERE ((p.id = meal_plan_meals.plan_id) AND (p.user_id = (select auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM meal_plans p
  WHERE ((p.id = meal_plan_meals.plan_id) AND (p.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "own meal plans" ON public.meal_plans;
CREATE POLICY "own meal plans" ON public.meal_plans
  FOR ALL TO authenticated
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "own onboarding answers" ON public.onboarding_answers;
CREATE POLICY "own onboarding answers" ON public.onboarding_answers
  FOR ALL TO authenticated
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "own profile insert" ON public.profiles;
CREATE POLICY "own profile insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (((select auth.uid()) = id));

DROP POLICY IF EXISTS "own profile select" ON public.profiles;
CREATE POLICY "own profile select" ON public.profiles
  FOR SELECT TO authenticated
  USING (((select auth.uid()) = id));

DROP POLICY IF EXISTS "own profile update" ON public.profiles;
CREATE POLICY "own profile update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (((select auth.uid()) = id))
  WITH CHECK (((select auth.uid()) = id));

DROP POLICY IF EXISTS "own photos" ON public.progress_photos;
CREATE POLICY "own photos" ON public.progress_photos
  FOR ALL TO authenticated
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "own recipe items" ON public.recipe_items;
CREATE POLICY "own recipe items" ON public.recipe_items
  FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM recipes r
  WHERE ((r.id = recipe_items.recipe_id) AND (r.user_id = (select auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM recipes r
  WHERE ((r.id = recipe_items.recipe_id) AND (r.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "own recipes" ON public.recipes;
CREATE POLICY "own recipes" ON public.recipes
  FOR ALL TO authenticated
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "own meal slots" ON public.user_meal_slots;
CREATE POLICY "own meal slots" ON public.user_meal_slots
  FOR ALL TO authenticated
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "read own roles" ON public.user_roles;
CREATE POLICY "read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "own water" ON public.water_intake;
CREATE POLICY "own water" ON public.water_intake
  FOR ALL TO authenticated
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "own routines" ON public.workout_routines;
CREATE POLICY "own routines" ON public.workout_routines
  FOR ALL TO authenticated
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "own sessions" ON public.workout_sessions;
CREATE POLICY "own sessions" ON public.workout_sessions
  FOR ALL TO authenticated
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "own sets" ON public.workout_sets;
CREATE POLICY "own sets" ON public.workout_sets
  FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM workout_sessions s
  WHERE ((s.id = workout_sets.session_id) AND (s.user_id = (select auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM workout_sessions s
  WHERE ((s.id = workout_sets.session_id) AND (s.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "own template exercises" ON public.workout_template_exercises;
CREATE POLICY "own template exercises" ON public.workout_template_exercises
  FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM workout_templates t
  WHERE ((t.id = workout_template_exercises.template_id) AND (t.user_id = (select auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM workout_templates t
  WHERE ((t.id = workout_template_exercises.template_id) AND (t.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "own templates" ON public.workout_templates;
CREATE POLICY "own templates" ON public.workout_templates
  FOR ALL TO authenticated
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));
-- ## 2. `exercise_muscles` — duas policies permissivas no mesmo SELECT
--
-- `write own exercise muscles` era `FOR ALL`, e `ALL` inclui `SELECT`. Como
-- `read exercise muscles` também cobre SELECT, toda leitura da tabela avaliava
-- as duas e unia os resultados por OR — incluindo o subselect em `exercises`
-- da policy de escrita, que não acrescenta nada a uma leitura (quem é dono do
-- exercício também o vê pela policy de leitura).
--
-- Trocada por três policies escopadas. Mesma autoridade, um EXISTS a menos por
-- linha lida.

DROP POLICY IF EXISTS "write own exercise muscles" ON public.exercise_muscles;

CREATE POLICY "insert own exercise muscles" ON public.exercise_muscles
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.exercises e
    WHERE e.id = exercise_muscles.exercise_id AND e.owner_id = (select auth.uid())
  ));

CREATE POLICY "update own exercise muscles" ON public.exercise_muscles
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.exercises e
    WHERE e.id = exercise_muscles.exercise_id AND e.owner_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.exercises e
    WHERE e.id = exercise_muscles.exercise_id AND e.owner_id = (select auth.uid())
  ));

CREATE POLICY "delete own exercise muscles" ON public.exercise_muscles
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.exercises e
    WHERE e.id = exercise_muscles.exercise_id AND e.owner_id = (select auth.uid())
  ));

-- ## 3. Índices nas colunas que as policies e os joins filtram
--
-- Toda policy escopada por usuário vira um filtro por `user_id`/`owner_id` em
-- **toda** query da tabela. Sem índice nessas colunas o filtro é um seq scan, e
-- o custo cresce com o total de linhas da tabela — não com as do usuário. Hoje
-- não dói porque as tabelas são pequenas; dói exatamente quando o app crescer,
-- que é tarde para descobrir.
--
-- Os 15 casos abaixo vêm do `db advisors` (unindexed_foreign_keys). Os índices
-- compostos incluem a coluna de ordenação usada na tela correspondente, para o
-- índice também cobrir o ORDER BY.

-- Escopo por usuário (filtro de RLS em toda query da tabela)
CREATE INDEX IF NOT EXISTS idx_recipes_user ON public.recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_templates_user ON public.workout_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_foods_owner ON public.foods(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_progress_photos_user_date ON public.progress_photos(user_id, log_date DESC);

-- Tabelas-filhas: o JOIN com a tabela-pai é o caminho de leitura e o caminho da
-- policy ao mesmo tempo.
CREATE INDEX IF NOT EXISTS idx_recipe_items_recipe ON public.recipe_items(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_items_food ON public.recipe_items(food_id);
CREATE INDEX IF NOT EXISTS idx_wte_template ON public.workout_template_exercises(template_id);
CREATE INDEX IF NOT EXISTS idx_wte_exercise ON public.workout_template_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_diet_days_plan ON public.diet_days(plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_food ON public.meal_plan_items(food_id);

-- `food_log_entries.food_id`: o diário do dia lê com embedding `foods(...)`,
-- então este é o índice do JOIN mais quente do app de dieta.
CREATE INDEX IF NOT EXISTS idx_food_log_food ON public.food_log_entries(food_id);
CREATE INDEX IF NOT EXISTS idx_food_favorites_food ON public.food_favorites(food_id);
CREATE INDEX IF NOT EXISTS idx_food_subst_prefs_food ON public.food_substitution_prefs(food_id);
CREATE INDEX IF NOT EXISTS idx_food_subst_prefs_substitute ON public.food_substitution_prefs(substitute_id);

-- `workout_sessions.template_id`: "quantas vezes fiz este treino" varre por
-- template; sem índice, varre todas as sessões de todos os usuários.
CREATE INDEX IF NOT EXISTS idx_workout_sessions_template ON public.workout_sessions(template_id) WHERE template_id IS NOT NULL;

-- Estatísticas atualizadas para o planner escolher os índices novos já na
-- primeira query em vez de esperar o autovacuum.
ANALYZE public.exercises;
ANALYZE public.exercise_muscles;
ANALYZE public.foods;
ANALYZE public.food_log_entries;
ANALYZE public.workout_sets;
ANALYZE public.workout_sessions;
