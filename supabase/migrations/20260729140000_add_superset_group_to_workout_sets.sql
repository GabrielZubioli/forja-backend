-- Superséries na sessão de treino.
--
-- `workout_template_exercises.superset_group` já existia (e também não tinha UI),
-- mas `workout_sets` — onde o treino de fato acontece — não tinha equivalente.
-- Sem essa coluna, um agrupamento definido no template se perdia ao iniciar a
-- sessão, e não havia como marcar uma supersérie num treino em branco.
--
-- Convenção: exercícios com o mesmo `superset_group` (inteiro > 0) dentro de uma
-- sessão são executados alternadamente. `NULL` = exercício isolado.

ALTER TABLE public.workout_sets
  ADD COLUMN IF NOT EXISTS superset_group INTEGER;

COMMENT ON COLUMN public.workout_sets.superset_group IS
  'Exercícios com o mesmo valor dentro da sessão formam uma supersérie (executados em alternância). NULL = isolado.';

-- Faixa sanitária: o app usa números pequenos e sequenciais por sessão.
ALTER TABLE public.workout_sets
  ADD CONSTRAINT workout_sets_superset_group_range
    CHECK (superset_group IS NULL OR (superset_group > 0 AND superset_group <= 20)) NOT VALID;

-- Consultas da sessão filtram por `session_id` e agrupam por supersérie.
CREATE INDEX IF NOT EXISTS idx_workout_sets_session_superset
  ON public.workout_sets (session_id, superset_group)
  WHERE superset_group IS NOT NULL;

DO $$
BEGIN
  ALTER TABLE public.workout_sets VALIDATE CONSTRAINT workout_sets_superset_group_range;
EXCEPTION WHEN check_violation THEN
  RAISE WARNING 'Dados existentes violam workout_sets_superset_group_range — restrição ativa apenas para novas escritas.';
END $$;
