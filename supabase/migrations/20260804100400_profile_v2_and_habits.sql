-- Perfil v2, respostas do questionário, água e metas.
--
-- O questionário passa a ser a **porta de entrada** do app (antes do cadastro),
-- e passa a coletar o que faltava para gerar um plano de verdade: lesões,
-- restrições alimentares, alergias, alimentos que a pessoa gosta e não gosta,
-- equipamentos, horários e rotina.
--
-- As respostas cruas ficam em `onboarding_answers` (JSONB) e a leitura
-- estruturada vai para colunas em `profiles`. Guardar as duas coisas parece
-- redundante, mas não é: o JSONB permite **regerar o plano** meses depois sem
-- perguntar tudo de novo, e sobrevive a mudanças no questionário que as colunas
-- não acompanhariam.

-- ------------------------------------------------ respostas do questionário

CREATE TABLE IF NOT EXISTS public.onboarding_answers (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  payload      JSONB NOT NULL,
  -- Versão do questionário que produziu o payload. Sem isso, um payload antigo
  -- alimentando um gerador novo falha de formas silenciosas.
  version      SMALLINT NOT NULL DEFAULT 1,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_answers TO authenticated;
GRANT ALL ON public.onboarding_answers TO service_role;
ALTER TABLE public.onboarding_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own onboarding answers" ON public.onboarding_answers;
CREATE POLICY "own onboarding answers" ON public.onboarding_answers
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP TRIGGER IF EXISTS trg_onboarding_answers_updated ON public.onboarding_answers;
CREATE TRIGGER trg_onboarding_answers_updated BEFORE UPDATE ON public.onboarding_answers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ------------------------------------------------------------ perfil v2

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS goal_weight_kg      NUMERIC(6,2),

  -- Contexto de treino.
  ADD COLUMN IF NOT EXISTS experience_level    TEXT,
  ADD COLUMN IF NOT EXISTS focus_area          TEXT,
  ADD COLUMN IF NOT EXISTS training_place      TEXT,
  ADD COLUMN IF NOT EXISTS equipment_available TEXT[],
  ADD COLUMN IF NOT EXISTS session_duration    TEXT,
  ADD COLUMN IF NOT EXISTS days_per_week       SMALLINT,

  -- Saúde. Filtram exercícios (lesões) e alimentos (restrições/alergias).
  ADD COLUMN IF NOT EXISTS injuries            TEXT[],
  ADD COLUMN IF NOT EXISTS health_conditions   TEXT[],

  -- Alimentação. `allergies` é regra dura (exclusão absoluta);
  -- `disliked_foods` é preferência (evita, mas não é erro se aparecer numa
  -- busca manual). Misturar os dois num campo só apagaria essa diferença — e
  -- confundir alergia com implicância é o tipo de erro que machuca alguém.
  ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT[],
  ADD COLUMN IF NOT EXISTS allergies            TEXT[],
  ADD COLUMN IF NOT EXISTS disliked_foods       TEXT[],
  ADD COLUMN IF NOT EXISTS liked_foods          TEXT[],
  ADD COLUMN IF NOT EXISTS meals_per_day        SMALLINT,
  ADD COLUMN IF NOT EXISTS cooking_skill        TEXT,

  -- Rotina. Alimenta os horários das refeições e o "próximo compromisso" da
  -- tela inicial.
  ADD COLUMN IF NOT EXISTS wake_time    TIME,
  ADD COLUMN IF NOT EXISTS sleep_time   TIME,
  ADD COLUMN IF NOT EXISTS workout_time TIME,

  ADD COLUMN IF NOT EXISTS water_ml_target INTEGER;

COMMENT ON COLUMN public.profiles.allergies IS
  'Exclusão absoluta na geração e alerta na busca. Distinto de disliked_foods, que é só preferência.';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_goal_weight_valid;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_goal_weight_valid
    CHECK (goal_weight_kg IS NULL OR (goal_weight_kg >= 30 AND goal_weight_kg <= 400)) NOT VALID;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_water_target_valid;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_water_target_valid
    CHECK (water_ml_target IS NULL OR (water_ml_target >= 500 AND water_ml_target <= 10000)) NOT VALID;

-- ------------------------------------------------------------- água
--
-- Uma linha por gole registrado, não um total por dia. O total é uma soma
-- barata, enquanto o registro individual permite desfazer o último copo — que
-- é o erro mais comum — e mostrar a distribuição ao longo do dia.
CREATE TABLE IF NOT EXISTS public.water_intake (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  ml        INTEGER NOT NULL CHECK (ml > 0 AND ml <= 5000),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_water_user_date
  ON public.water_intake (user_id, log_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.water_intake TO authenticated;
GRANT ALL ON public.water_intake TO service_role;
ALTER TABLE public.water_intake ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own water" ON public.water_intake;
CREATE POLICY "own water" ON public.water_intake
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------- metas

CREATE TYPE public.goal_kind_t AS ENUM (
  'weight', 'body_fat', 'measurement', 'strength', 'habit', 'nutrition'
);

CREATE TABLE IF NOT EXISTS public.goals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind         public.goal_kind_t NOT NULL,
  label        TEXT NOT NULL,

  -- O que exatamente é medido dentro do tipo: 'waist_cm', 'bench_1rm',
  -- 'workouts_per_week'. Mantém a tabela genérica sem virar uma coluna por meta.
  metric_key   TEXT NOT NULL,

  -- O valor de partida é gravado para que o progresso seja percentual e não
  -- absoluto: sair de 100 kg para 90 com meta de 85 é 66% do caminho, não 94%.
  start_value  NUMERIC(10,2),
  target_value NUMERIC(10,2) NOT NULL,
  unit         TEXT,

  target_date  DATE,
  achieved_at  TIMESTAMPTZ,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_active
  ON public.goals (user_id, is_active, kind);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own goals" ON public.goals;
CREATE POLICY "own goals" ON public.goals
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP TRIGGER IF EXISTS trg_goals_updated ON public.goals;
CREATE TRIGGER trg_goals_updated BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ------------------------------------------------- medidas adicionais

ALTER TABLE public.body_measurements
  ADD COLUMN IF NOT EXISTS calf_cm     NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS forearm_cm  NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS shoulder_cm NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS abdomen_cm  NUMERIC(5,1);

-- Peso no dia da foto. Sem isso a comparação lado a lado mostra duas imagens
-- sem a informação que dá sentido à diferença.
ALTER TABLE public.progress_photos
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS notes     TEXT;

DO $$
BEGIN
  ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_goal_weight_valid;
  ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_water_target_valid;
EXCEPTION WHEN check_violation THEN
  RAISE WARNING 'Dados existentes violam as restrições de perfil — ativas apenas para novas escritas.';
END $$;
