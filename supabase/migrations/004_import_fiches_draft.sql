-- Migration 004: import_fiches_draft table
-- Fiches générées par Claude depuis un import, en attente de validation admin
-- CASCADE DELETE sur import_id: si l'import est supprimé, ses drafts aussi
-- Note: FK vers fiches(id) ajoutée dans 006 après création de la table fiches

CREATE TABLE IF NOT EXISTS public.import_fiches_draft (
  id                   UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id            UUID        NOT NULL REFERENCES public.imports(id) ON DELETE CASCADE,
  validated_by         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  fiche_id             UUID,  -- FK ajoutée dans 006_add_fk_draft_fiche.sql
  type                 TEXT        CHECK (type IN ('objection', 'guide_situation', 'cas_client', 'concurrent', 'missing_info')),
  title                TEXT        NOT NULL,
  content              TEXT        NOT NULL,
  source_timestamp_sec INT,
  source_page          INT,
  confidence           FLOAT       CHECK (confidence >= 0 AND confidence <= 1),
  status               TEXT        DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at           TIMESTAMPTZ DEFAULT now()
);
