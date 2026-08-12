-- Valores de músculo que faltavam para o catálogo completo e para o mapa
-- corporal.
--
-- `lower_back` estava dobrado dentro de `back`, o que tornava impossível
-- destacar a lombar no desenho do corpo humano e escondia o volume real de
-- levantamento terra e afins. `neck` aparece no catálogo importado.
--
-- ⚠️ Migration isolada de propósito: o Postgres permite `ALTER TYPE ... ADD
-- VALUE` dentro de uma transação, mas **proíbe usar o valor novo na mesma
-- transação**. Qualquer INSERT/CHECK que mencione 'lower_back' precisa estar
-- numa migration posterior.

ALTER TYPE public.muscle_t ADD VALUE IF NOT EXISTS 'lower_back';
ALTER TYPE public.muscle_t ADD VALUE IF NOT EXISTS 'neck';
