-- Migration 005: fiches table (base de connaissance centrale)
-- Requiert: pgvector activé AVANT cette migration
--   → Supabase Dashboard > Database > Extensions > vector (activer)

CREATE TABLE IF NOT EXISTS public.fiches (
  id                   UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id            UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  tenant_id            UUID        REFERENCES public.tenants(id) ON DELETE SET NULL,
  source_ref_id        UUID        REFERENCES public.imports(id) ON DELETE SET NULL,
  type                 TEXT        CHECK (type IN ('objection', 'guide_situation', 'cas_client', 'concurrent', 'doc_certiplace', 'veille')),
  title                TEXT        NOT NULL,
  content              TEXT        NOT NULL,
  profil_cible         TEXT        CHECK (profil_cible IN ('csm', 'sales', 'new', 'all', 'csm_sales')),
  source               TEXT        CHECK (source IN ('manual', 'webinar', 'presentation', 'sales_call', 'doc', 'n8n')),
  source_timestamp_sec INT,
  source_page          INT,
  confidence_threshold FLOAT       DEFAULT 0.75,
  embedding            VECTOR(1536),  -- généré automatiquement par Edge Function
  status               TEXT        DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  expires_at           TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ DEFAULT now(),
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- Index vectoriel obligatoire pour NFR-01 (latence RAG < 2s p95 sur 10k fiches)
-- Sans cet index, la recherche sémantique est inexploitable en production
CREATE INDEX IF NOT EXISTS fiches_embedding_idx
  ON public.fiches
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER fiches_updated_at
  BEFORE UPDATE ON public.fiches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
