-- Integridade de dados: restrições de faixa nas colunas numéricas.
--
-- Motivo: até aqui, o único filtro sobre os valores gravados era o formulário do
-- app. Um peso de -500 kg, uma altura de 9999 cm, um RPE de 87 ou uma porção de
-- 10 milhões de gramas eram aceitos pelo banco — e, uma vez gravados,
-- contaminavam médias móveis, metas calóricas e volume de treino de forma
-- silenciosa.
--
-- A validação no cliente (Zod, adicionada nos formulários) resolve o caso comum;
-- estas restrições são a segunda camada, que também cobre escritas feitas por
-- fora da UI (SQL direto, futuras integrações, app mobile).
--
-- As faixas são propositalmente generosas: o objetivo é barrar o absurdo, não
-- opinar sobre fisiologia.
--
-- Nota: todas as restrições são `NOT VALID` para não falharem caso já exista
-- algum dado fora da faixa. Elas passam a valer para toda escrita nova; a
-- validação do histórico é feita no bloco final, que apenas avisa em vez de
-- abortar a migration.

-- ---------------------------------------------------------------- profiles
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_height_cm_range
    CHECK (height_cm IS NULL OR (height_cm >= 50 AND height_cm <= 300)) NOT VALID,
  ADD CONSTRAINT profiles_birth_date_range
    CHECK (birth_date IS NULL OR (birth_date > DATE '1900-01-01' AND birth_date <= CURRENT_DATE)) NOT VALID,
  ADD CONSTRAINT profiles_kcal_target_range
    CHECK (daily_kcal_target IS NULL OR (daily_kcal_target >= 500 AND daily_kcal_target <= 15000)) NOT VALID,
  ADD CONSTRAINT profiles_macro_targets_non_negative
    CHECK (
      COALESCE(protein_g_target, 0) >= 0 AND COALESCE(protein_g_target, 0) <= 2000
      AND COALESCE(carbs_g_target, 0) >= 0 AND COALESCE(carbs_g_target, 0) <= 3000
      AND COALESCE(fat_g_target, 0) >= 0 AND COALESCE(fat_g_target, 0) <= 1000
      AND COALESCE(fiber_g_target, 0) >= 0 AND COALESCE(fiber_g_target, 0) <= 500
    ) NOT VALID;

-- ------------------------------------------------------------ body_weights
ALTER TABLE public.body_weights
  ADD CONSTRAINT body_weights_range
    CHECK (weight_kg > 20 AND weight_kg < 400) NOT VALID,
  ADD CONSTRAINT body_weights_not_future
    CHECK (log_date <= CURRENT_DATE + 1) NOT VALID;

-- ------------------------------------------------------- body_measurements
ALTER TABLE public.body_measurements
  ADD CONSTRAINT body_measurements_ranges
    CHECK (
      (chest_cm     IS NULL OR (chest_cm     > 0 AND chest_cm     < 300))
      AND (waist_cm  IS NULL OR (waist_cm     > 0 AND waist_cm     < 300))
      AND (hip_cm    IS NULL OR (hip_cm       > 0 AND hip_cm       < 300))
      AND (arm_cm    IS NULL OR (arm_cm       > 0 AND arm_cm       < 150))
      AND (thigh_cm  IS NULL OR (thigh_cm     > 0 AND thigh_cm     < 200))
      AND (neck_cm   IS NULL OR (neck_cm      > 0 AND neck_cm      < 120))
      AND (body_fat_pct IS NULL OR (body_fat_pct > 0 AND body_fat_pct < 100))
    ) NOT VALID;

-- ------------------------------------------------------------- workout_sets
ALTER TABLE public.workout_sets
  ADD CONSTRAINT workout_sets_weight_range
    CHECK (weight_kg IS NULL OR (weight_kg >= 0 AND weight_kg <= 1000)) NOT VALID,
  ADD CONSTRAINT workout_sets_reps_range
    CHECK (reps IS NULL OR (reps >= 0 AND reps <= 1000)) NOT VALID,
  -- RPE é uma escala de 0 a 10.
  ADD CONSTRAINT workout_sets_rpe_range
    CHECK (rpe IS NULL OR (rpe >= 0 AND rpe <= 10)) NOT VALID,
  ADD CONSTRAINT workout_sets_rest_range
    CHECK (rest_seconds IS NULL OR (rest_seconds >= 0 AND rest_seconds <= 3600)) NOT VALID,
  ADD CONSTRAINT workout_sets_index_positive
    CHECK (set_index > 0) NOT VALID,
  ADD CONSTRAINT workout_sets_cardio_range
    CHECK (
      (distance_m IS NULL OR (distance_m >= 0 AND distance_m <= 500000))
      AND (duration_seconds IS NULL OR (duration_seconds >= 0 AND duration_seconds <= 86400))
    ) NOT VALID;

-- ------------------------------------------ workout_template_exercises
-- `position = -1` é usado como valor temporário na troca de ordem (a coluna tem
-- restrição de unicidade por template), então a faixa precisa acomodá-lo.
ALTER TABLE public.workout_template_exercises
  ADD CONSTRAINT wte_target_sets_range
    CHECK (target_sets IS NULL OR (target_sets > 0 AND target_sets <= 20)) NOT VALID,
  ADD CONSTRAINT wte_target_reps_range
    CHECK (target_reps IS NULL OR (target_reps > 0 AND target_reps <= 200)) NOT VALID,
  ADD CONSTRAINT wte_rest_range
    CHECK (rest_seconds IS NULL OR (rest_seconds >= 0 AND rest_seconds <= 3600)) NOT VALID,
  ADD CONSTRAINT wte_position_range
    CHECK (position >= -1) NOT VALID;

-- --------------------------------------------------------- workout_sessions
ALTER TABLE public.workout_sessions
  ADD CONSTRAINT workout_sessions_duration_range
    CHECK (duration_seconds IS NULL OR (duration_seconds >= 0 AND duration_seconds <= 86400)) NOT VALID,
  ADD CONSTRAINT workout_sessions_volume_non_negative
    CHECK (total_volume_kg IS NULL OR total_volume_kg >= 0) NOT VALID,
  ADD CONSTRAINT workout_sessions_ended_after_started
    CHECK (ended_at IS NULL OR ended_at >= started_at) NOT VALID;

-- -------------------------------------------------------------------- foods
ALTER TABLE public.foods
  ADD CONSTRAINT foods_serving_size_positive
    CHECK (serving_size_g > 0 AND serving_size_g <= 5000) NOT VALID,
  ADD CONSTRAINT foods_macros_non_negative
    CHECK (
      COALESCE(kcal, 0) >= 0 AND COALESCE(kcal, 0) <= 10000
      AND COALESCE(protein_g, 0) >= 0
      AND COALESCE(carbs_g, 0) >= 0
      AND COALESCE(fat_g, 0) >= 0
      AND COALESCE(fiber_g, 0) >= 0
    ) NOT VALID;

-- --------------------------------------------------------- food_log_entries
ALTER TABLE public.food_log_entries
  ADD CONSTRAINT food_log_grams_range
    CHECK (grams IS NULL OR (grams >= 0 AND grams <= 20000)) NOT VALID,
  ADD CONSTRAINT food_log_servings_range
    CHECK (servings >= 0 AND servings <= 200) NOT VALID,
  ADD CONSTRAINT food_log_date_not_future
    CHECK (log_date <= CURRENT_DATE + 1) NOT VALID;

-- ------------------------------------------------------------------ recipes
ALTER TABLE public.recipes
  ADD CONSTRAINT recipes_servings_range
    CHECK (servings > 0 AND servings <= 100) NOT VALID;

ALTER TABLE public.recipe_items
  ADD CONSTRAINT recipe_items_grams_range
    CHECK (grams >= 0 AND grams <= 20000) NOT VALID;

-- --------------------------------------------------------- progress_photos
ALTER TABLE public.progress_photos
  ADD CONSTRAINT progress_photos_angle_allowed
    CHECK (angle IS NULL OR angle IN ('front', 'side', 'back')) NOT VALID,
  ADD CONSTRAINT progress_photos_date_not_future
    CHECK (log_date <= CURRENT_DATE + 1) NOT VALID;

-- --------------------------------------------------------------------------
-- Tenta validar o histórico. Se alguma tabela já tiver dados fora da faixa, a
-- restrição continua ativa para escritas novas e um aviso é emitido, em vez de
-- a migration inteira falhar.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname, c.conrelid::regclass AS tbl
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.contype = 'c'
      AND NOT c.convalidated
      AND n.nspname = 'public'
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %s VALIDATE CONSTRAINT %I', r.tbl, r.conname);
    EXCEPTION WHEN check_violation THEN
      RAISE WARNING 'Dados existentes violam %.% — restrição ativa apenas para novas escritas.',
        r.tbl, r.conname;
    END;
  END LOOP;
END $$;
