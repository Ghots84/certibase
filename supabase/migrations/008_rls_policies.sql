-- Migration 008: Row Level Security pour les 5 tables
-- Rôles: admin | csm | sales | new (définis dans profiles.role)

-- Activer RLS sur toutes les tables
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_fiches_draft ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiches             ENABLE ROW LEVEL SECURITY;

-- ── profiles ──────────────────────────────────────────────────────────────────
-- Chaque utilisateur lit uniquement son propre profil
CREATE POLICY IF NOT EXISTS "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admin peut lire tous les profils (pour la gestion des utilisateurs)
CREATE POLICY IF NOT EXISTS "profiles_select_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Admin peut mettre à jour les rôles
CREATE POLICY IF NOT EXISTS "profiles_update_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- ── fiches ────────────────────────────────────────────────────────────────────
-- Tous les authentifiés lisent les fiches publiées
CREATE POLICY IF NOT EXISTS "fiches_select_published"
  ON public.fiches FOR SELECT
  TO authenticated
  USING (status = 'published');

-- Admin lit aussi les fiches draft/archived (pour la gestion)
CREATE POLICY IF NOT EXISTS "fiches_select_admin_all"
  ON public.fiches FOR SELECT
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Seul l'admin peut créer/modifier/supprimer des fiches
CREATE POLICY IF NOT EXISTS "fiches_insert_admin"
  ON public.fiches FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY IF NOT EXISTS "fiches_update_admin"
  ON public.fiches FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY IF NOT EXISTS "fiches_delete_admin"
  ON public.fiches FOR DELETE
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- ── imports ───────────────────────────────────────────────────────────────────
-- Tous les authentifiés lisent la liste des imports
CREATE POLICY IF NOT EXISTS "imports_select_authenticated"
  ON public.imports FOR SELECT
  TO authenticated
  USING (true);

-- Seul l'admin peut créer/modifier des imports
CREATE POLICY IF NOT EXISTS "imports_insert_admin"
  ON public.imports FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY IF NOT EXISTS "imports_update_admin"
  ON public.imports FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY IF NOT EXISTS "imports_delete_admin"
  ON public.imports FOR DELETE
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- ── import_fiches_draft ───────────────────────────────────────────────────────
-- Seul l'admin accède aux drafts (validation)
CREATE POLICY IF NOT EXISTS "drafts_all_admin"
  ON public.import_fiches_draft FOR ALL
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- ── tenants ───────────────────────────────────────────────────────────────────
-- Admin uniquement (MVP interne: un seul tenant)
CREATE POLICY IF NOT EXISTS "tenants_all_admin"
  ON public.tenants FOR ALL
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
