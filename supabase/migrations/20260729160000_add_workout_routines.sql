-- Rotinas de treino (divisão A/B/C com sequência própria).
--
-- Até aqui o app só tinha templates soltos: o usuário montava cada um à mão e
-- precisava lembrar qual treinar hoje. Uma rotina agrupa os templates numa
-- ordem e guarda **em que ponto da sequência o usuário está** — o "próximo
-- treino: B" avança a cada sessão concluída, independentemente do dia do
-- calendário (quem pula segunda não perde o treino A).

CREATE TABLE IF NOT EXISTS public.workout_routines (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,

  -- Respostas que originaram o plano. Guardadas para poder regerar/ajustar
  -- depois sem perguntar tudo de novo.
  level          TEXT NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  goal           TEXT NOT NULL CHECK (goal IN ('strength', 'hypertrophy', 'endurance')),
  equipment      TEXT NOT NULL CHECK (equipment IN ('full_gym', 'home_basic', 'bodyweight')),
  days_per_week  SMALLINT NOT NULL CHECK (days_per_week BETWEEN 2 AND 6),

  -- Posição atual na sequência (0 = primeira divisão).
  current_index  SMALLINT NOT NULL DEFAULT 0 CHECK (current_index >= 0),

  -- Só uma rotina ativa por usuário; as demais ficam como histórico.
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

-- Garante no banco a regra "uma rotina ativa por usuário", em vez de confiar na
-- aplicação: um clique duplo no assistente criaria duas.
CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_routines_one_active
  ON public.workout_routines (user_id)
  WHERE is_active AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_workout_routines_user
  ON public.workout_routines (user_id, created_at DESC);

-- Liga os templates existentes a uma rotina. Templates avulsos continuam
-- válidos (routine_id NULL) — a funcionalidade antiga não regride.
ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS routine_id UUID REFERENCES public.workout_routines(id) ON DELETE SET NULL,
  -- Ordem dentro da rotina: 0 = divisão A, 1 = B, …
  ADD COLUMN IF NOT EXISTS routine_order SMALLINT,
  -- Letra exibida na UI. Redundante com a ordem, mas evita recalcular e
  -- permite nomes fora do padrão no futuro.
  ADD COLUMN IF NOT EXISTS routine_letter TEXT;

CREATE INDEX IF NOT EXISTS idx_workout_templates_routine
  ON public.workout_templates (routine_id, routine_order)
  WHERE routine_id IS NOT NULL;

-- Faixas alvo de repetição, para a sessão já nascer com a prescrição do plano.
-- `target_reps` sozinho não expressa "8 a 12".
ALTER TABLE public.workout_template_exercises
  ADD COLUMN IF NOT EXISTS target_rep_min SMALLINT,
  ADD COLUMN IF NOT EXISTS target_rep_max SMALLINT;

ALTER TABLE public.workout_template_exercises
  ADD CONSTRAINT wte_rep_range_valid
    CHECK (
      target_rep_min IS NULL
      OR target_rep_max IS NULL
      OR (target_rep_min > 0 AND target_rep_max >= target_rep_min AND target_rep_max <= 200)
    ) NOT VALID;

-- --------------------------------------------------------------- RLS
ALTER TABLE public.workout_routines ENABLE ROW LEVEL SECURITY;

-- Mesmo padrão "dono direto" das demais tabelas do usuário.
DROP POLICY IF EXISTS "own routines" ON public.workout_routines;
CREATE POLICY "own routines" ON public.workout_routines
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_routines TO authenticated;
GRANT ALL ON public.workout_routines TO service_role;

-- `updated_at` automático, como nas outras tabelas.
DROP TRIGGER IF EXISTS trg_workout_routines_updated ON public.workout_routines;
CREATE TRIGGER trg_workout_routines_updated
  BEFORE UPDATE ON public.workout_routines
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DO $$
BEGIN
  ALTER TABLE public.workout_template_exercises VALIDATE CONSTRAINT wte_rep_range_valid;
EXCEPTION WHEN check_violation THEN
  RAISE WARNING 'Dados existentes violam wte_rep_range_valid — restrição ativa apenas para novas escritas.';
END $$;
