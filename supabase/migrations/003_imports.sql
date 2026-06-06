-- Migration 003: imports table
-- Centralise tous les imports: webinaires, présentations, appels, documents
-- Contrainte: file_path OU file_url doit être renseigné

CREATE TABLE IF NOT EXISTS public.imports (
  id             UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_type      TEXT        CHECK (file_type IN ('audio', 'video', 'pdf', 'url')),
  import_type    TEXT        CHECK (import_type IN ('webinar', 'presentation', 'sales_call', 'internal_doc', 'other')),
  file_path      TEXT,
  file_url       TEXT,
  original_name  TEXT,
  title          TEXT,
  profil_cible   TEXT        CHECK (profil_cible IN ('csm', 'sales', 'new', 'all', 'csm_sales')),
  duration_sec   INT,
  total_pages    INT,
  transcription  TEXT,
  status         TEXT        DEFAULT 'pending' CHECK (status IN ('pending', 'extracting', 'analyzing', 'ready', 'error')),
  error_message  TEXT,
  fiches_count   INT         DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT file_source_check CHECK (file_path IS NOT NULL OR file_url IS NOT NULL)
);
