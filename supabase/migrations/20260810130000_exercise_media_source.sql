-- Origem e identificação da mídia dos exercícios.
--
-- ## Por que colunas novas
--
-- A biblioteca passa a receber exercícios de uma segunda fonte
-- (`hasaneyldrm/exercises-dataset`, 1.324 movimentos com GIF animado). Para o
-- app resolver a mídia sem adivinhar, cada linha precisa dizer **de onde ela
-- veio** e **qual é o identificador dela lá**.
--
-- Sem isso, a única pista seria o nome — e casar "Elevação Lateral com Halteres"
-- por similaridade contra 1.324 nomes em inglês acertaria a maioria e erraria o
-- resto em silêncio, que é o pior modo de falha possível para uma biblioteca de
-- referência.
--
-- ## Licença — leia antes de publicar
--
-- A mídia da fonte `gymvisual` é © Gym visual, redistribuída no repositório de
-- origem com permissão do detentor, limitada a 180×180 e condicionada a manter
-- a atribuição visível. O `NOTICE.md` de lá é explícito: clonar o repositório
-- **não** concede licença sobre a mídia.
--
-- Os **dados** (nomes, categorias, equipamento, músculos, instruções) são MIT e
-- podem ser usados livremente. É por isso que o texto vem para o banco e a
-- mídia não: nenhum byte de imagem é copiado para cá. O que fica gravado é o
-- identificador que permite montar a URL da CDN em tempo de exibição — e
-- desligar essa fonte é remover um item de uma lista no código do app
-- (`src/data/exercise-media/index.ts`), sem migration nenhuma.

ALTER TABLE public.exercises
  -- Qual provedor de mídia conhece este exercício.
  ADD COLUMN IF NOT EXISTS media_source TEXT,
  -- Identificador da mídia na fonte (`media_id` do dataset). Combina com
  -- `external_id` para formar o nome do arquivo: `0001-2gPfomN.gif`.
  ADD COLUMN IF NOT EXISTS media_id TEXT,
  -- Passo a passo em inglês, como veio da fonte.
  --
  -- Existe uma coluna separada de `execution` (que é português) porque o
  -- dataset traz dez idiomas e **nenhum deles é português**. Misturar os dois
  -- numa coluna só faria a tela exibir inglês sem avisar que é inglês; em
  -- colunas distintas, a interface sabe o que está mostrando e pode rotular.
  ADD COLUMN IF NOT EXISTS execution_en TEXT[];

COMMENT ON COLUMN public.exercises.media_source IS
  'Provedor da mídia: ''gymvisual'' | ''free-exercise-db''. Nulo = resolver por nome.';
COMMENT ON COLUMN public.exercises.media_id IS
  'Identificador da mídia na fonte externa. Ver src/data/exercise-media/providers.ts.';
COMMENT ON COLUMN public.exercises.execution_en IS
  'Passo a passo em inglês (fonte MIT). A versão em português fica em execution.';

-- Restringe a valores conhecidos: uma fonte digitada errada não resolveria
-- mídia nenhuma, e a falha apareceria como imagem faltando, não como erro.
ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_media_source_valid;
ALTER TABLE public.exercises
  ADD CONSTRAINT exercises_media_source_valid
    CHECK (media_source IS NULL OR media_source IN ('gymvisual', 'free-exercise-db'));

-- A biblioteca busca por nome em português **e** em inglês (quem treina há anos
-- procura por "romanian deadlift"). Sem índice, cada tecla digitada varre 1.400
-- linhas com ILIKE.
--
-- `pg_trgm` porque o padrão de busca é `%termo%`: um índice B-tree comum não
-- serve para curinga à esquerda.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_exercises_name_trgm
  ON public.exercises USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_exercises_name_en_trgm
  ON public.exercises USING gin (name_en gin_trgm_ops);

-- A listagem padrão ordena por popularidade e nome; sem este índice ela faz
-- sort em memória a cada abertura da biblioteca.
CREATE INDEX IF NOT EXISTS idx_exercises_popularity
  ON public.exercises (popularity DESC, name)
  WHERE deleted_at IS NULL;
