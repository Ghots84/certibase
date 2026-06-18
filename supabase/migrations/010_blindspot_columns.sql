-- Migration 010: angles morts — rendre import_id nullable + ajouter canal_source
-- Nécessaire pour les enregistrements missing_info créés par l'assistant (sans import parent)

ALTER TABLE public.import_fiches_draft
  ALTER COLUMN import_id DROP NOT NULL;

ALTER TABLE public.import_fiches_draft
  ADD COLUMN IF NOT EXISTS canal_source TEXT DEFAULT 'assistant';
