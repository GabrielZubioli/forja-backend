-- Reverte a integração com o `hasaneyldrm/exercises-dataset`.
--
-- ## Decisão
--
-- O projeto deixou de usar a mídia daquele repositório. A biblioteca volta ao
-- catálogo curado, com as fotos estáticas da free-exercise-db (domínio público)
-- que já usava antes.
--
-- ## Por que soft delete e não DELETE
--
-- `workout_template_exercises` e `workout_sets` referenciam `exercises` com
-- `ON DELETE RESTRICT`. Um `DELETE` falharia no primeiro exercício importado
-- que alguém já tivesse colocado num treino — e, pior, teria apagado os
-- anteriores antes de falhar, deixando a operação pela metade.
--
-- `deleted_at` é o mecanismo que a própria policy de RLS já usa para esconder
-- exercício (`USING (deleted_at IS NULL AND ...)`), então marcar a data tira as
-- linhas da biblioteca sem tocar em nenhuma referência.
--
-- **Para desfazer**, se um dia a decisão mudar:
--
--     UPDATE public.exercises
--     SET deleted_at = NULL
--     WHERE external_id LIKE 'gymvisual:%';
--
-- Os dados continuam todos lá — nomes, músculos, equipamento, instruções e os
-- identificadores de mídia. Nada foi destruído.

-- 1. Esconde os exercícios importados daquela fonte.
UPDATE public.exercises
SET deleted_at = now()
WHERE external_id LIKE 'gymvisual:%'
  AND deleted_at IS NULL;

-- 2. Desliga o vínculo de mídia do catálogo curado.
--
-- Sem isto, o resolvedor do app continuaria montando URLs para aquela CDN: o
-- vínculo explícito (`media_source`) tem prioridade sobre `image_urls`
-- justamente para vencer as fotos antigas. Limpar as três colunas devolve o
-- catálogo às fotos que ele sempre teve.
UPDATE public.exercises
SET media_source = NULL,
    media_id = NULL,
    media_ref = NULL
WHERE media_source = 'gymvisual'
  AND deleted_at IS NULL;

-- As colunas `media_source`, `media_id`, `media_ref` e `execution_en`
-- permanecem na tabela, vazias. Removê-las exigiria outra migration destrutiva
-- para recriá-las se a decisão mudar, e uma coluna nula não custa nada — nem
-- espaço, nem desempenho, nem complexidade de leitura, já que nenhuma consulta
-- do app depende delas quando o provedor está desligado.
