-- Migration 006: ajouter la FK entre import_fiches_draft et fiches
-- Séparée car fiches n'existait pas au moment de la création de import_fiches_draft (004)

ALTER TABLE public.import_fiches_draft
  ADD CONSTRAINT fk_draft_fiche
  FOREIGN KEY (fiche_id)
  REFERENCES public.fiches(id)
  ON DELETE SET NULL;
