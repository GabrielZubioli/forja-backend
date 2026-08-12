-- Cria o bucket de fotos de progresso (privado). As policies de acesso a
-- storage.objects para este bucket já são criadas na migration inicial.
-- Idempotente: não falha se o bucket já existir.
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', false)
ON CONFLICT (id) DO NOTHING;
