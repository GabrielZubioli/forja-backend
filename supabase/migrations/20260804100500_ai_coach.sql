-- Treinador com IA.
--
-- ## A divisão de trabalho
--
-- O LLM **não decide números**. Treino, dieta, progressão de carga, deload e
-- detecção de estagnação continuam sendo produzidos pelo motor determinístico
-- em `@forja/domain` — que é testável, instantâneo, gratuito e funciona sem
-- rede (a academia costuma ter sinal ruim, e é lá que o app é usado).
--
-- O LLM entra onde ele é insubstituível: **linguagem**. Ele recebe os números
-- já calculados e os explica, responde dúvidas e conversa. Um modelo que
-- inventa a prescrição prescreve 30 séries de peito para um iniciante; um
-- modelo que explica a prescrição do motor é um treinador.
--
-- ## Segurança
--
-- A chave da API nunca chega ao browser. As chamadas passam por uma Edge
-- Function que valida o JWT, monta o contexto lendo o banco sob RLS e responde.
-- Sem a chave configurada, estas tabelas simplesmente ficam vazias e o resto do
-- app funciona igual.

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'Nova conversa',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user
  ON public.ai_conversations (user_id, updated_at DESC)
  WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT ALL ON public.ai_conversations TO service_role;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own conversations" ON public.ai_conversations;
CREATE POLICY "own conversations" ON public.ai_conversations
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP TRIGGER IF EXISTS trg_ai_conversations_updated ON public.ai_conversations;
CREATE TRIGGER trg_ai_conversations_updated BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,

  -- Consumo por mensagem. Sem isso não há como responder "quanto isso está
  -- custando" nem impor limite de uso por usuário.
  input_tokens    INTEGER,
  output_tokens   INTEGER,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation
  ON public.ai_messages (conversation_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own messages" ON public.ai_messages;
CREATE POLICY "own messages" ON public.ai_messages
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  ));

-- ------------------------------------------------------ recomendações
--
-- Produzidas pelo motor determinístico, não pelo LLM. Ficam gravadas para que
-- possam ser **aplicadas com um toque** e para que o app saiba o que já foi
-- dispensado — repetir uma sugestão recusada é a forma mais rápida de treinar o
-- usuário a ignorar todas.
CREATE TYPE public.ai_recommendation_kind_t AS ENUM (
  'load_increase',   -- aumentar carga num exercício
  'load_decrease',   -- reduzir carga
  'deload',          -- semana de descarga
  'volume_increase', -- grupo muscular abaixo da faixa produtiva
  'volume_decrease', -- acima do que dá para recuperar
  'exercise_swap',   -- estagnação num exercício específico
  'diet_adjust',     -- meta calórica desalinhada do peso observado
  'hydration',
  'consistency',     -- treinos ou registros faltando
  'check_in'         -- pesagem, medidas ou foto atrasadas
);

CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind        public.ai_recommendation_kind_t NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,

  -- Dados estruturados para aplicar a recomendação sem interpretar texto
  -- (ex.: { "exerciseId": "...", "fromKg": 60, "toKg": 62.5 }).
  payload     JSONB,

  severity    SMALLINT NOT NULL DEFAULT 1 CHECK (severity BETWEEN 0 AND 3),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'dismissed', 'expired')),

  -- Evita reemitir a mesma recomendação todo dia: a chave identifica o
  -- *assunto*, não a ocorrência.
  dedupe_key  TEXT NOT NULL,

  expires_at  TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Uma recomendação pendente por assunto e por usuário.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_recommendations_dedupe
  ON public.ai_recommendations (user_id, dedupe_key)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user
  ON public.ai_recommendations (user_id, status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_recommendations TO authenticated;
GRANT ALL ON public.ai_recommendations TO service_role;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own recommendations" ON public.ai_recommendations;
CREATE POLICY "own recommendations" ON public.ai_recommendations
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
