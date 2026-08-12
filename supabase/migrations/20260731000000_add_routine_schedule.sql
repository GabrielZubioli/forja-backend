-- Dias da semana em que a rotina é treinada.
--
-- A rotina já sabia *quantos* dias por semana (`days_per_week`) e *qual* a
-- próxima divisão da sequência (`current_index`), mas não **quais dias**. Sem
-- isso não dá para responder "o que eu treino hoje?" nem montar a faixa de dias
-- da semana na tela inicial.
--
-- Convenção: 0 = domingo … 6 = sábado (igual ao `Date.getDay()` do JavaScript).
--
-- Importante: os dias são a **agenda planejada**, não uma amarra. A sequência
-- continua avançando por treino concluído, não por data — quem pula a
-- segunda-feira faz o treino A na quarta, sem perder a divisão.

ALTER TABLE public.workout_routines
  ADD COLUMN IF NOT EXISTS training_weekdays SMALLINT[] NOT NULL DEFAULT '{1,3,5}';

COMMENT ON COLUMN public.workout_routines.training_weekdays IS
  'Dias planejados para treinar (0=domingo … 6=sábado). Agenda indicativa: a sequência A/B/C avança por treino concluído, não por data.';

-- Entre 1 e 7 dias, todos na faixa 0..6.
--
-- `CHECK` no Postgres não aceita subconsulta, então a ausência de repetição não
-- é garantida aqui — fica a cargo da aplicação, que monta o array a partir de um
-- conjunto de checkboxes. Duplicata não corromperia nada: a projeção da semana
-- indexa por dia, então um dia repetido seria apenas ignorado.
ALTER TABLE public.workout_routines
  ADD CONSTRAINT workout_routines_weekdays_valid
    CHECK (
      array_length(training_weekdays, 1) BETWEEN 1 AND 7
      AND training_weekdays <@ ARRAY[0, 1, 2, 3, 4, 5, 6]::SMALLINT[]
    ) NOT VALID;

DO $$
BEGIN
  ALTER TABLE public.workout_routines VALIDATE CONSTRAINT workout_routines_weekdays_valid;
EXCEPTION WHEN check_violation THEN
  RAISE WARNING 'Dados existentes violam workout_routines_weekdays_valid — restrição ativa apenas para novas escritas.';
END $$;
