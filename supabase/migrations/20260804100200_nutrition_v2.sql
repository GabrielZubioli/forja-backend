-- Nutrição v2 — de diário para plano executável.
--
-- ## O problema com o modelo antigo
--
-- A dieta era um **diário**: o usuário registrava o que já tinha comido, em
-- quatro caixas fixas (café, almoço, jantar, lanche). Isso exige que ele já
-- saiba o que comer — exatamente o que ele não sabe, e o motivo de ter baixado
-- o app.
--
-- ## O modelo novo
--
-- A dieta vira um **plano**: o app diz o que comer, em oito refeições, e o
-- usuário marca como consumido.
--
-- O dia é **materializado** a partir do plano na primeira abertura: cada item
-- vira uma linha de `food_log_entries` com `consumed = false`. Poderia-se
-- calcular o dia por junção com o plano, sem gravar nada — mas aí editar só a
-- quarta-feira sem alterar o plano inteiro exigiria uma tabela de exceções, e
-- o histórico mudaria retroativamente sempre que o plano fosse alterado. A
-- materialização torna o passado imutável, que é o comportamento correto.

-- ------------------------------------------------------------------ enums

-- Oito refeições em vez de quatro. Pré e pós-treino não são "lanches": eles têm
-- composição, horário e propósito diferentes, e amontoá-los em 'snack' impedia
-- tanto a prescrição quanto a leitura do que aconteceu.
CREATE TYPE public.meal_slot_t AS ENUM (
  'breakfast',
  'morning_snack',
  'lunch',
  'afternoon_snack',
  'pre_workout',
  'post_workout',
  'dinner',
  'supper'
);

-- ------------------------------------------- refeições ativas do usuário
--
-- Quantas e quais refeições a pessoa faz é escolha dela — quem faz jejum
-- intermitente não tem café da manhã, e forçar oito caixas fixas produziria
-- seis vazias todo dia.
CREATE TABLE IF NOT EXISTS public.user_meal_slots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot        public.meal_slot_t NOT NULL,

  -- Rótulo personalizado ("Marmita do trabalho"). Nulo = usa o nome padrão.
  label       TEXT,
  position    SMALLINT NOT NULL DEFAULT 0,

  -- Horário planejado, vindo da rotina informada no questionário. Alimenta o
  -- "próxima refeição em 40 min" da tela inicial.
  target_time TIME,

  -- Fração das calorias do dia destinada a esta refeição (0–1). A soma das
  -- refeições ativas deve dar ~1; o gerador normaliza.
  kcal_share  NUMERIC(4,3) CHECK (kcal_share IS NULL OR (kcal_share >= 0 AND kcal_share <= 1)),

  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slot)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_meal_slots TO authenticated;
GRANT ALL ON public.user_meal_slots TO service_role;
ALTER TABLE public.user_meal_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own meal slots" ON public.user_meal_slots;
CREATE POLICY "own meal slots" ON public.user_meal_slots
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP TRIGGER IF EXISTS trg_user_meal_slots_updated ON public.user_meal_slots;
CREATE TRIGGER trg_user_meal_slots_updated BEFORE UPDATE ON public.user_meal_slots
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ----------------------------------------------------------- plano ativo

CREATE TABLE IF NOT EXISTS public.meal_plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,

  -- 'generated' = montado pelo motor a partir do questionário;
  -- 'custom'    = criado ou modificado a fundo pelo usuário.
  source            TEXT NOT NULL DEFAULT 'generated' CHECK (source IN ('generated', 'custom')),

  -- Metas congeladas no momento da geração. Guardadas aqui, e não lidas de
  -- `profiles`, para que o plano continue coerente consigo mesmo depois que as
  -- metas do perfil mudarem.
  kcal_target       NUMERIC(6,1) NOT NULL,
  protein_g_target  NUMERIC(6,1) NOT NULL,
  carbs_g_target    NUMERIC(6,1) NOT NULL,
  fat_g_target      NUMERIC(6,1) NOT NULL,
  fiber_g_target    NUMERIC(6,1),

  notes             TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Um plano ativo por usuário, garantido no banco (mesmo padrão de
-- `workout_routines`): um clique duplo no assistente criaria dois.
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_plans_one_active
  ON public.meal_plans (user_id)
  WHERE is_active AND deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plans TO authenticated;
GRANT ALL ON public.meal_plans TO service_role;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own meal plans" ON public.meal_plans;
CREATE POLICY "own meal plans" ON public.meal_plans
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP TRIGGER IF EXISTS trg_meal_plans_updated ON public.meal_plans;
CREATE TRIGGER trg_meal_plans_updated BEFORE UPDATE ON public.meal_plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ------------------------------------------------ refeições do plano

CREATE TABLE IF NOT EXISTS public.meal_plan_meals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id          UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  slot             public.meal_slot_t NOT NULL,
  label            TEXT,
  position         SMALLINT NOT NULL DEFAULT 0,
  target_time      TIME,

  -- Alvos desta refeição. Derivados de `kcal_share`, gravados para não
  -- recalcular a cada render e para sobreviver a ajustes manuais.
  kcal_target      NUMERIC(6,1),
  protein_g_target NUMERIC(6,1),
  carbs_g_target   NUMERIC(6,1),
  fat_g_target     NUMERIC(6,1),

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, slot)
);

CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_plan
  ON public.meal_plan_meals (plan_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plan_meals TO authenticated;
GRANT ALL ON public.meal_plan_meals TO service_role;
ALTER TABLE public.meal_plan_meals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own plan meals" ON public.meal_plan_meals;
CREATE POLICY "own plan meals" ON public.meal_plan_meals
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meal_plans p WHERE p.id = plan_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.meal_plans p WHERE p.id = plan_id AND p.user_id = auth.uid()));
DROP TRIGGER IF EXISTS trg_meal_plan_meals_updated ON public.meal_plan_meals;
CREATE TRIGGER trg_meal_plan_meals_updated BEFORE UPDATE ON public.meal_plan_meals
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ------------------------------------------------- alimentos do plano

CREATE TABLE IF NOT EXISTS public.meal_plan_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id     UUID NOT NULL REFERENCES public.meal_plan_meals(id) ON DELETE CASCADE,
  food_id     UUID NOT NULL REFERENCES public.foods(id) ON DELETE RESTRICT,
  grams       NUMERIC(8,2) NOT NULL CHECK (grams > 0 AND grams <= 5000),
  position    SMALLINT NOT NULL DEFAULT 0,

  -- Modo de preparo, quando o alimento exige ("grelhado, sem óleo").
  prep_notes  TEXT,
  notes       TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_plan_items_meal
  ON public.meal_plan_items (meal_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plan_items TO authenticated;
GRANT ALL ON public.meal_plan_items TO service_role;
ALTER TABLE public.meal_plan_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own plan items" ON public.meal_plan_items;
CREATE POLICY "own plan items" ON public.meal_plan_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.meal_plan_meals m
    JOIN public.meal_plans p ON p.id = m.plan_id
    WHERE m.id = meal_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.meal_plan_meals m
    JOIN public.meal_plans p ON p.id = m.plan_id
    WHERE m.id = meal_id AND p.user_id = auth.uid()
  ));
DROP TRIGGER IF EXISTS trg_meal_plan_items_updated ON public.meal_plan_items;
CREATE TRIGGER trg_meal_plan_items_updated BEFORE UPDATE ON public.meal_plan_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ------------------------------------------- diário: consumo e origem

ALTER TABLE public.food_log_entries
  ADD COLUMN IF NOT EXISTS meal_slot    public.meal_slot_t,

  -- Item do plano que originou esta linha. `SET NULL` porque apagar o item do
  -- plano não pode apagar o registro histórico do que foi comido.
  ADD COLUMN IF NOT EXISTS plan_item_id UUID REFERENCES public.meal_plan_items(id) ON DELETE SET NULL,

  -- O coração do modelo novo: um item planejado nasce `false` e vira `true`
  -- quando o usuário marca. Um item adicionado à mão já nasce `true`.
  ADD COLUMN IF NOT EXISTS consumed     BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS consumed_at  TIMESTAMPTZ,

  ADD COLUMN IF NOT EXISTS source       TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('plan', 'manual', 'copy', 'recipe', 'barcode'));

-- Backfill: 'snack' vira lanche da tarde por ser o horário mais provável, e
-- porque o valor antigo não carrega informação suficiente para decidir melhor.
UPDATE public.food_log_entries
SET meal_slot = CASE meal_type::TEXT
  WHEN 'breakfast' THEN 'breakfast'::public.meal_slot_t
  WHEN 'lunch'     THEN 'lunch'::public.meal_slot_t
  WHEN 'dinner'    THEN 'dinner'::public.meal_slot_t
  ELSE 'afternoon_snack'::public.meal_slot_t
END
WHERE meal_slot IS NULL;

ALTER TABLE public.food_log_entries
  ALTER COLUMN meal_slot SET NOT NULL,
  ALTER COLUMN meal_slot SET DEFAULT 'breakfast';

-- A coluna antiga sai: manter duas fontes de verdade para a mesma informação é
-- garantia de divergência. Todo o consumo passa por `meal_slot`.
ALTER TABLE public.food_log_entries DROP COLUMN IF EXISTS meal_type;
DROP TYPE IF EXISTS public.meal_type_t;

CREATE INDEX IF NOT EXISTS idx_food_log_slot
  ON public.food_log_entries (user_id, log_date, meal_slot);

-- Uma linha do plano não pode ser materializada duas vezes no mesmo dia.
CREATE UNIQUE INDEX IF NOT EXISTS idx_food_log_plan_item_day
  ON public.food_log_entries (plan_item_id, log_date)
  WHERE plan_item_id IS NOT NULL;

-- ------------------------------------------------------- dia do diário
--
-- Registra que um dia já foi materializado. Sem isso, apagar todos os itens de
-- uma terça-feira faria o app remontá-la do plano na próxima abertura — e o
-- usuário nunca conseguiria ter um dia deliberadamente vazio.
CREATE TABLE IF NOT EXISTS public.diet_days (
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date        DATE NOT NULL,
  plan_id         UUID REFERENCES public.meal_plans(id) ON DELETE SET NULL,
  materialized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes           TEXT,
  PRIMARY KEY (user_id, log_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diet_days TO authenticated;
GRANT ALL ON public.diet_days TO service_role;
ALTER TABLE public.diet_days ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own diet days" ON public.diet_days;
CREATE POLICY "own diet days" ON public.diet_days
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
