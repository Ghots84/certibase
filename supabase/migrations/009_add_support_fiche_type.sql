-- Migration 009: ajouter le type 'support' aux fiches
-- Étend la contrainte CHECK pour couvrir le cas d'usage Support client

ALTER TABLE public.fiches
  DROP CONSTRAINT IF EXISTS fiches_type_check;

ALTER TABLE public.fiches
  ADD CONSTRAINT fiches_type_check
    CHECK (type IN ('objection', 'guide_situation', 'cas_client', 'concurrent', 'doc_certiplace', 'veille', 'support'));
