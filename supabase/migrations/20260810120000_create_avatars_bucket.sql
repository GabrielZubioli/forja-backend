-- Foto de perfil enviada pelo usuário.
--
-- ## Por que um bucket novo
--
-- `profiles.avatar_url` já existe desde a migration inicial, mas só é povoada
-- pelo `raw_user_meta_data` do OAuth — quem entra com e-mail e senha nunca tem
-- foto, e ninguém consegue trocar a que veio do Google. A coluna existia sem
-- nenhum caminho para escrever nela.
--
-- ## Privado, como as fotos de progresso
--
-- Um avatar não é dado sensível como uma foto de evolução, mas também não há
-- motivo para ser público: o app é single-user, ninguém além da própria pessoa
-- precisa ver a imagem. Bucket privado + URL assinada mantém o mesmo modelo de
-- acesso do resto do app, e evita a pergunta "quem mais consegue abrir este
-- link?" — que num bucket público não tem resposta boa.
--
-- O isolamento é o mesmo de `progress-photos`: o primeiro segmento do caminho
-- precisa ser o uid, e é a policy que garante isso. A aplicação não é
-- confiável para essa decisão.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  false,
  -- 4 MB. Um avatar é exibido em 96 px; qualquer coisa acima disso é upload
  -- acidental da foto original da câmera, não necessidade.
  4194304,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- `DROP` antes de `CREATE` porque `CREATE POLICY` não aceita `IF NOT EXISTS`:
-- sem isto a migration falharia ao ser reaplicada sobre um banco que já a tem.
DROP POLICY IF EXISTS "own avatar read" ON storage.objects;
CREATE POLICY "own avatar read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "own avatar insert" ON storage.objects;
CREATE POLICY "own avatar insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- `UPDATE` existe aqui e não em `progress-photos` porque o avatar é
-- substituído, não acumulado: a troca de foto sobrescreve o mesmo caminho.
DROP POLICY IF EXISTS "own avatar update" ON storage.objects;
CREATE POLICY "own avatar update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "own avatar delete" ON storage.objects;
CREATE POLICY "own avatar delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
