-- Banco de alimentos de nível profissional.
--
-- Eram 25 alimentos, só com macros. Um app de nutrição com 25 alimentos não é
-- utilizável: o usuário bate na parede no primeiro almoço.
--
-- Esta migration abre: categoria (base das substituições inteligentes),
-- micronutrientes, medida caseira, imagem e favoritos. O conteúdo vem em
-- seguida: seed de alimentos brasileiros + busca ao vivo na Open Food Facts
-- para industrializados e código de barras.

-- Categoria do alimento. É o eixo das **substituições**: trocar arroz por
-- batata (ambos 'grain'/'carb') faz sentido; trocar arroz por azeite, não —
-- mesmo que os macros batessem por acaso numa quantidade absurda.
CREATE TYPE public.food_category_t AS ENUM (
  'protein_meat',    -- carnes, aves, peixes
  'protein_egg',     -- ovos
  'dairy',           -- laticínios
  'legume',          -- feijões, lentilha, grão-de-bico
  'grain',           -- arroz, massas, pães, cereais
  'tuber',           -- batata, mandioca, inhame
  'vegetable',
  'fruit',
  'fat',             -- óleos, castanhas, abacate
  'beverage',
  'supplement',      -- whey, creatina, hipercalórico
  'sweet',
  'condiment',
  'prepared',        -- pratos prontos e preparações
  'other'
);

ALTER TABLE public.foods
  ADD COLUMN IF NOT EXISTS category public.food_category_t NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS image_url TEXT,

  -- Chave na base de origem (código TBCA/TACO ou código de barras da Open Food
  -- Facts). Torna o seed idempotente e evita duplicar o mesmo alimento vindo de
  -- caminhos diferentes.
  ADD COLUMN IF NOT EXISTS external_id TEXT,

  -- Medida caseira. "150 g de frango" é preciso e inútil na cozinha; "1 filé
  -- médio" é o que a pessoa consegue executar. Guardamos os dois.
  ADD COLUMN IF NOT EXISTS household_measure TEXT,
  ADD COLUMN IF NOT EXISTS household_grams   NUMERIC(8,2),

  -- Micronutrientes por `serving_size_g`, mesma convenção dos macros.
  ADD COLUMN IF NOT EXISTS calcium_mg      NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS iron_mg         NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS magnesium_mg    NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS phosphorus_mg   NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS potassium_mg    NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS zinc_mg         NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS vitamin_a_mcg   NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS vitamin_c_mg    NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS vitamin_d_mcg   NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS vitamin_e_mg    NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS vitamin_b12_mcg NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS cholesterol_mg  NUMERIC(8,2),

  -- Popularidade relativa (0–100): entre "arroz branco cozido" e "arroz
  -- vermelho germinado", a busca deve trazer o primeiro antes.
  ADD COLUMN IF NOT EXISTS popularity SMALLINT NOT NULL DEFAULT 50,

  -- Marca alimentos que servem de base para o gerador montar a dieta. Nem tudo
  -- que está no banco deve ser prescrito automaticamente (refrigerante existe
  -- para ser registrado, não recomendado).
  ADD COLUMN IF NOT EXISTS is_staple BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.foods.household_measure IS
  'Medida caseira executável na cozinha ("1 concha", "2 fatias"). Par com household_grams.';
COMMENT ON COLUMN public.foods.is_staple IS
  'Elegível para composição automática de dieta. Falso = registrável, mas nunca prescrito.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_foods_external_id
  ON public.foods (external_id)
  WHERE external_id IS NOT NULL;

-- Acelera o `ilike '%termo%'` que o app já usa (o índice full-text existente
-- nunca foi aproveitado por esse padrão de consulta).
CREATE INDEX IF NOT EXISTS idx_foods_name_trgm
  ON public.foods USING gin (name gin_trgm_ops);

-- Consulta central das substituições: "alimentos da mesma categoria,
-- prescritíveis, ordenados por proximidade de macros".
CREATE INDEX IF NOT EXISTS idx_foods_category_staple
  ON public.foods (category, is_staple)
  WHERE deleted_at IS NULL;

ALTER TABLE public.foods
  DROP CONSTRAINT IF EXISTS foods_image_url_valid;
ALTER TABLE public.foods
  ADD CONSTRAINT foods_image_url_valid
    CHECK (image_url IS NULL OR image_url ~* '^https?://') NOT VALID;

-- ---------------------------------------------------------- favoritos

CREATE TABLE IF NOT EXISTS public.food_favorites (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_id    UUID NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, food_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_favorites TO authenticated;
GRANT ALL ON public.food_favorites TO service_role;
ALTER TABLE public.food_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own food favorites" ON public.food_favorites;
CREATE POLICY "own food favorites" ON public.food_favorites
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------ substituições fixadas
--
-- As substituições são **calculadas** por proximidade de macros dentro da
-- categoria — assim funcionam para qualquer alimento, inclusive os que ainda
-- não existem no banco. Esta tabela guarda apenas as decisões *do usuário*:
-- "toda vez que aparecer tilápia, me ofereça frango primeiro".
CREATE TABLE IF NOT EXISTS public.food_substitution_prefs (
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_id         UUID NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
  substitute_id   UUID NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
  -- Quantas vezes o usuário efetivamente fez esta troca. Ordena as sugestões.
  times_used      SMALLINT NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, food_id, substitute_id),
  CHECK (food_id <> substitute_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_substitution_prefs TO authenticated;
GRANT ALL ON public.food_substitution_prefs TO service_role;
ALTER TABLE public.food_substitution_prefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own substitution prefs" ON public.food_substitution_prefs;
CREATE POLICY "own substitution prefs" ON public.food_substitution_prefs
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DO $$
BEGIN
  ALTER TABLE public.foods VALIDATE CONSTRAINT foods_image_url_valid;
EXCEPTION WHEN check_violation THEN
  RAISE WARNING 'Dados existentes violam foods_image_url_valid — ativa apenas para novas escritas.';
END $$;
