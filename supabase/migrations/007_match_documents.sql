-- Migration 007: fonction RPC match_documents
-- Utilisée par l'assistant interne et les agents pour la recherche sémantique RAG
-- Retourne les fiches publiées triées par similarité cosinus

CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding  VECTOR(1536),
  match_threshold  FLOAT   DEFAULT 0.75,
  match_count      INT     DEFAULT 5,
  profile_filter   TEXT    DEFAULT 'all'
)
RETURNS TABLE (
  id               UUID,
  title            TEXT,
  content          TEXT,
  type             TEXT,
  profil_cible     TEXT,
  source           TEXT,
  confidence_threshold FLOAT,
  similarity       FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.title,
    f.content,
    f.type,
    f.profil_cible,
    f.source,
    f.confidence_threshold,
    1 - (f.embedding <=> query_embedding) AS similarity
  FROM public.fiches f
  WHERE
    f.status = 'published'
    AND f.embedding IS NOT NULL
    AND (1 - (f.embedding <=> query_embedding)) >= match_threshold
    AND (
      profile_filter = 'all'
      OR f.profil_cible = 'all'
      OR f.profil_cible = profile_filter
      OR f.profil_cible = 'csm_sales'
    )
  ORDER BY f.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
