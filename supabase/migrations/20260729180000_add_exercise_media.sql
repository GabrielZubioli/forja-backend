-- Mídia de demonstração dos exercícios.
--
-- O catálogo tem ~66 exercícios sem nenhuma referência visual, e "remada
-- cavalinho" não diz muita coisa a quem está começando — é justamente o público
-- que mais precisa. Apps concorrentes tratam o vídeo como parte central da
-- biblioteca.
--
-- Aqui apenas abrimos a capacidade: as colunas ficam nulas até serem povoadas
-- com conteúdo próprio ou licenciado. Enquanto isso, a UI cai num link de busca
-- por vídeo com o nome do exercício — solução honesta, que não finge ter
-- material curado nem embute conteúdo de terceiros sem licença.

ALTER TABLE public.exercises
  -- URL do vídeo/GIF de demonstração.
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  -- Imagem estática (thumbnail ou ilustração do movimento).
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  -- Dicas curtas de execução, exibidas junto do exercício na sessão.
  ADD COLUMN IF NOT EXISTS cues TEXT[];

COMMENT ON COLUMN public.exercises.video_url IS
  'URL da demonstração. Nulo = a UI oferece busca por vídeo pelo nome do exercício.';
COMMENT ON COLUMN public.exercises.cues IS
  'Dicas curtas de execução ("cotovelos a 45°", "escápulas retraídas").';

-- Aceita apenas http(s): evita `javascript:` e afins chegarem a um href.
ALTER TABLE public.exercises
  ADD CONSTRAINT exercises_media_urls_valid
    CHECK (
      (video_url IS NULL OR video_url ~* '^https?://')
      AND (image_url IS NULL OR image_url ~* '^https?://')
    ) NOT VALID;

DO $$
BEGIN
  ALTER TABLE public.exercises VALIDATE CONSTRAINT exercises_media_urls_valid;
EXCEPTION WHEN check_violation THEN
  RAISE WARNING 'Dados existentes violam exercises_media_urls_valid — restrição ativa apenas para novas escritas.';
END $$;
