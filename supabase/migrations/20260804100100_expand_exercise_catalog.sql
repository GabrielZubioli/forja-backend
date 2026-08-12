-- Catálogo de exercícios de nível comercial.
--
-- O catálogo tinha 68 exercícios com nome, músculo e equipamento — e nada mais.
-- Sem imagem, sem descrição de execução, sem nível, sem padrão de movimento.
-- Quem está começando não sabe o que é "remada cavalinho", e a tela do exercício
-- não tinha o que mostrar.
--
-- Esta migration abre as capacidades; a importação do catálogo (873 exercícios
-- de domínio público, cada um com duas fotos e passos de execução) vem em
-- seguida, via seed.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ------------------------------------------------------------------ enums

-- Padrão de movimento. Hoje o gerador de plano adivinha isso por palavra-chave
-- no nome do exercício (ver PATTERN_KEYWORDS em src/data/routines.ts) — uma
-- heurística que degrada mal conforme o catálogo cresce de 68 para 873 itens.
-- Com a coluna, a escolha vira consulta.
CREATE TYPE public.movement_pattern_t AS ENUM (
  'horizontal_push', 'vertical_push',
  'horizontal_pull', 'vertical_pull',
  'squat', 'hinge', 'lunge',
  'isolation', 'core', 'carry', 'cardio', 'mobility'
);

-- Nível exigido pelo exercício. Diferente do nível do usuário: serve para não
-- prescrever levantamento terra a quem nunca treinou.
CREATE TYPE public.exercise_level_t AS ENUM ('beginner', 'intermediate', 'advanced');

-- Direção da força. Usado para equilibrar empurrar × puxar numa sessão.
CREATE TYPE public.force_type_t AS ENUM ('push', 'pull', 'static');

-- Composto envolve mais de uma articulação; isolado, uma só.
CREATE TYPE public.mechanic_t AS ENUM ('compound', 'isolation');

-- ------------------------------------------------------- colunas novas

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS movement_pattern public.movement_pattern_t,
  ADD COLUMN IF NOT EXISTS level            public.exercise_level_t NOT NULL DEFAULT 'intermediate',
  ADD COLUMN IF NOT EXISTS force_type       public.force_type_t,
  ADD COLUMN IF NOT EXISTS mechanic         public.mechanic_t,

  -- Passos numerados da execução correta. Array em vez de texto corrido porque
  -- a UI renderiza um passo por linha, numerado — e concatenar/quebrar string
  -- no cliente é frágil.
  ADD COLUMN IF NOT EXISTS execution        TEXT[],

  -- Erros comuns a evitar. Separado da execução porque a UI os destaca em
  -- vermelho, e misturar os dois arrays perderia essa distinção.
  ADD COLUMN IF NOT EXISTS common_mistakes  TEXT[],

  -- Imagens da demonstração, em ordem (início do movimento → fim). Plural
  -- porque a alternância entre duas fotos é o que simula o GIF sem exigir um
  -- arquivo animado.
  ADD COLUMN IF NOT EXISTS image_urls       TEXT[],

  -- Cadência sugerida no formato excêntrica-pausa-concêntrica-pausa ("3-1-1-0").
  -- Só preenchida onde o tempo sob tensão muda o resultado.
  ADD COLUMN IF NOT EXISTS default_cadence  TEXT,

  -- Nome original em inglês. Serve à busca (quem treina há anos procura
  -- "romanian deadlift") e à rastreabilidade da importação.
  ADD COLUMN IF NOT EXISTS name_en          TEXT,

  -- Chave estável na base de origem. Torna a importação idempotente: rodar o
  -- seed duas vezes atualiza em vez de duplicar.
  ADD COLUMN IF NOT EXISTS external_id      TEXT,

  -- Lesões que tornam o exercício arriscado ('shoulder', 'knee', 'lower_back',
  -- 'elbow', 'wrist', 'hip', 'ankle', 'neck'). O gerador de plano exclui o que
  -- conflita com o que o usuário declarou no questionário.
  ADD COLUMN IF NOT EXISTS contraindications TEXT[],

  -- Popularidade relativa (0–100). Desempata a escolha do gerador entre dois
  -- exercícios igualmente adequados: entre 873 opções, prescrever o obscuro é
  -- pior que prescrever o conhecido.
  ADD COLUMN IF NOT EXISTS popularity       SMALLINT NOT NULL DEFAULT 50;

COMMENT ON COLUMN public.exercises.image_urls IS
  'Demonstração em ordem (início → fim do movimento). A UI alterna entre elas para simular o GIF.';
COMMENT ON COLUMN public.exercises.default_cadence IS
  'Cadência excêntrica-pausa-concêntrica-pausa, ex. "3-1-1-0". Nulo = sem prescrição específica.';
COMMENT ON COLUMN public.exercises.contraindications IS
  'Lesões que desaconselham o exercício. Usado para filtrar o plano gerado.';

-- Idempotência da importação. Índice parcial: exercícios criados pelo usuário
-- não têm `external_id` e não competem pela unicidade.
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_external_id
  ON public.exercises (external_id)
  WHERE external_id IS NOT NULL;

-- Busca por trecho. O índice GIN full-text existente nunca foi usado, porque o
-- app busca com `ilike '%termo%'` — que full-text não acelera. `pg_trgm` acelera
-- exatamente esse padrão, sem exigir mudança nas consultas.
CREATE INDEX IF NOT EXISTS idx_exercises_name_trgm
  ON public.exercises USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_exercises_name_en_trgm
  ON public.exercises USING gin (name_en gin_trgm_ops)
  WHERE name_en IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exercises_pattern
  ON public.exercises (movement_pattern)
  WHERE deleted_at IS NULL;

-- Aceita apenas http(s) nas imagens, pelo mesmo motivo do vídeo: um
-- `javascript:` não deve chegar a virar atributo no DOM.
--
-- Precisa ser função: `CHECK` no Postgres não aceita subconsulta, e validar
-- cada elemento de um array exige `unnest`. `IMMUTABLE` é o que permite usá-la
-- numa constraint.
CREATE OR REPLACE FUNCTION public.all_http_urls(urls TEXT[])
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT urls IS NULL
      OR NOT EXISTS (SELECT 1 FROM unnest(urls) AS u WHERE u !~* '^https?://');
$$;

ALTER TABLE public.exercises
  DROP CONSTRAINT IF EXISTS exercises_image_urls_valid;
ALTER TABLE public.exercises
  ADD CONSTRAINT exercises_image_urls_valid
    CHECK (public.all_http_urls(image_urls)) NOT VALID;

-- ------------------------------------- contribuição muscular por exercício
--
-- `primary_muscle` + `secondary_muscles[]` responde "quais músculos", mas não
-- "quanto". Um supino recruta peitoral e tríceps — contar as duas séries
-- inteiras para os dois superestima o volume de tríceps em ~100%.
--
-- Esta tabela dá o peso (0–1) de cada músculo. É o que alimenta o mapa do corpo
-- humano (intensidade do destaque), o volume semanal por grupo e o modelo de
-- recuperação, que hoje usa "meia série" fixa para secundários.
CREATE TABLE IF NOT EXISTS public.exercise_muscles (
  exercise_id  UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  muscle       public.muscle_t NOT NULL,
  contribution NUMERIC(3,2) NOT NULL CHECK (contribution > 0 AND contribution <= 1),
  PRIMARY KEY (exercise_id, muscle)
);

CREATE INDEX IF NOT EXISTS idx_exercise_muscles_muscle
  ON public.exercise_muscles (muscle);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_muscles TO authenticated;
GRANT ALL ON public.exercise_muscles TO service_role;
ALTER TABLE public.exercise_muscles ENABLE ROW LEVEL SECURITY;

-- Padrão "dono via pai": a visibilidade acompanha a do exercício.
DROP POLICY IF EXISTS "read exercise muscles" ON public.exercise_muscles;
CREATE POLICY "read exercise muscles" ON public.exercise_muscles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.exercises e
    WHERE e.id = exercise_id
      AND e.deleted_at IS NULL
      AND (e.is_public OR e.owner_id = auth.uid())
  ));

DROP POLICY IF EXISTS "write own exercise muscles" ON public.exercise_muscles;
CREATE POLICY "write own exercise muscles" ON public.exercise_muscles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.exercises e WHERE e.id = exercise_id AND e.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.exercises e WHERE e.id = exercise_id AND e.owner_id = auth.uid()));

-- ------------------------------------------- prescrição mais expressiva

ALTER TABLE public.workout_template_exercises
  -- RPE alvo: "8 a 12 repetições" sem intensidade não é prescrição.
  ADD COLUMN IF NOT EXISTS target_rpe NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS cadence    TEXT;

ALTER TABLE public.workout_template_exercises
  DROP CONSTRAINT IF EXISTS wte_target_rpe_valid;
ALTER TABLE public.workout_template_exercises
  ADD CONSTRAINT wte_target_rpe_valid
    CHECK (target_rpe IS NULL OR (target_rpe >= 1 AND target_rpe <= 10)) NOT VALID;

ALTER TABLE public.workout_sets
  -- Descanso realmente tomado, medido pelo cronômetro — diferente do prescrito.
  -- É o dado que permite dizer "você está descansando 40s a menos que o plano".
  ADD COLUMN IF NOT EXISTS rest_actual_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS cadence             TEXT,
  -- Momento em que a série foi concluída. `created_at` marca quando a linha
  -- nasceu (no início da sessão, quando vem de template), não quando foi feita.
  ADD COLUMN IF NOT EXISTS completed_at        TIMESTAMPTZ;

ALTER TABLE public.workout_sets
  DROP CONSTRAINT IF EXISTS workout_sets_rest_actual_valid;
ALTER TABLE public.workout_sets
  ADD CONSTRAINT workout_sets_rest_actual_valid
    CHECK (rest_actual_seconds IS NULL OR (rest_actual_seconds >= 0 AND rest_actual_seconds <= 3600)) NOT VALID;

-- ----------------------------------------------------------- validação

DO $$
BEGIN
  ALTER TABLE public.exercises VALIDATE CONSTRAINT exercises_image_urls_valid;
EXCEPTION WHEN check_violation THEN
  RAISE WARNING 'Dados existentes violam exercises_image_urls_valid — ativa apenas para novas escritas.';
END $$;

DO $$
BEGIN
  ALTER TABLE public.workout_template_exercises VALIDATE CONSTRAINT wte_target_rpe_valid;
EXCEPTION WHEN check_violation THEN
  RAISE WARNING 'Dados existentes violam wte_target_rpe_valid — ativa apenas para novas escritas.';
END $$;

DO $$
BEGIN
  ALTER TABLE public.workout_sets VALIDATE CONSTRAINT workout_sets_rest_actual_valid;
EXCEPTION WHEN check_violation THEN
  RAISE WARNING 'Dados existentes violam workout_sets_rest_actual_valid — ativa apenas para novas escritas.';
END $$;
