-- Correções que destravam a geração da dieta.
--
-- Duas causas de "o plano existe e as refeições estão vazias", ambas do lado do
-- banco:
--
-- 1. `foods.is_staple` nasce FALSE. O gerador só considera alimentos com
--    `is_staple = TRUE`, e a coluna só é preenchida pelo seed do catálogo
--    (20260804120000). Onde esse seed não rodou — projeto restaurado, banco
--    criado antes dele, seed interrompido — o pool de alimentos vem vazio, o
--    gerador não tem o que prescrever e o usuário recebe oito caixas vazias.
--
-- 2. O índice único de (plan_item_id, log_date) é **parcial**. O Postgres não
--    infere índice parcial numa cláusula ON CONFLICT sem o predicado, e o
--    PostgREST não tem como enviá-lo: todo `upsert` que mirava esse índice
--    falhava com 42P10 (`there is no unique or exclusion constraint matching
--    the ON CONFLICT specification`). A materialização do dia era feita por um
--    upsert assim.
--
-- O app já não depende de nenhuma das duas coisas (o pool cai para o catálogo
-- completo quando não há base marcada, e a materialização deixou de usar
-- ON CONFLICT). Esta migration conserta a origem, para que o comportamento
-- correto não dependa do contorno.

-- ------------------------------------------------- 1. classificar o catálogo

-- Alimentos públicos ainda sem categoria: classifica pelo nome. Mesma
-- heurística do seed oficial, aplicada de novo porque é idempotente e porque
-- aqui ela pode ser a primeira a rodar.
UPDATE public.foods SET category = CASE
  WHEN name ~* '(frango|carne|boi|patinho|alcatra|peixe|tilápia|atum|salmão|sardinha|peru|porco|lombo|file|filé)' THEN 'protein_meat'
  WHEN name ~* '(ovo|clara|gema)' THEN 'protein_egg'
  WHEN name ~* '(leite|queijo|iogurte|requeijão|coalhada|ricota|cottage)' THEN 'dairy'
  WHEN name ~* '(feijão|lentilha|grão-de-bico|ervilha|soja|tofu)' THEN 'legume'
  WHEN name ~* '(arroz|aveia|pão|macarrão|farinha|cuscuz|tapioca|cereal|granola|biscoito|torrada)' THEN 'grain'
  WHEN name ~* '(batata|mandioca|inhame|cará|aipim)' THEN 'tuber'
  WHEN name ~* '(azeite|óleo|manteiga|castanha|amendoim|noz|amêndoa|abacate|pasta de amendoim)' THEN 'fat'
  WHEN name ~* '(banana|maçã|laranja|mamão|manga|uva|melancia|abacaxi|morango|pera|goiaba|melão)' THEN 'fruit'
  WHEN name ~* '(brócolis|alface|tomate|cenoura|couve|abobrinha|espinafre|repolho|pepino|beterraba)' THEN 'vegetable'
  WHEN name ~* '(whey|creatina|albumina|hipercalórico|bcaa)' THEN 'supplement'
  ELSE category
END::public.food_category_t
WHERE owner_id IS NULL AND category = 'other' AND deleted_at IS NULL;

-- ------------------------------------------------ 2. marcar o que é base

-- Prescritível = alimento público, classificado e com calorias declaradas.
-- Creatina (0 kcal), temperos e itens sem categoria continuam de fora: são
-- registráveis, não prescritíveis.
UPDATE public.foods
   SET is_staple = TRUE
 WHERE owner_id IS NULL
   AND deleted_at IS NULL
   AND is_staple = FALSE
   AND category <> 'other'
   AND kcal > 0;

-- ------------------------------- 3. índice utilizável em ON CONFLICT

-- A versão total do índice preserva a mesma garantia (um item de plano só é
-- materializado uma vez por dia) e passa a ser inferível: `plan_item_id` nulo
-- não conflita com nada, porque NULL nunca é igual a NULL num índice único.
DROP INDEX IF EXISTS public.idx_food_log_plan_item_day;

CREATE UNIQUE INDEX IF NOT EXISTS idx_food_log_plan_item_day
  ON public.food_log_entries (plan_item_id, log_date);

COMMENT ON INDEX public.idx_food_log_plan_item_day IS
  'Impede materializar duas vezes o mesmo item do plano no mesmo dia. Índice total (não parcial) para ser inferível em ON CONFLICT — linhas manuais têm plan_item_id NULL e não conflitam entre si.';
