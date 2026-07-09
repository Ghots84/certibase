-- Migration 012: simplification des rôles — admin | csm | sales uniquement
-- Suppression de 'ops' et 'new'

-- 1. Convertir les profils ops/new en csm
UPDATE public.profiles
SET role = 'csm'
WHERE role IN ('ops', 'new');

-- 2. Convertir profil_cible 'new' des fiches en 'all'
UPDATE public.fiches
SET profil_cible = 'all'
WHERE profil_cible = 'new';

-- 3. Mettre à jour le DEFAULT et la contrainte CHECK sur profiles.role
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'csm';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'csm', 'sales'));

-- 4. Mettre à jour la contrainte CHECK sur fiches.profil_cible (retirer 'new')
ALTER TABLE public.fiches
  DROP CONSTRAINT IF EXISTS fiches_profil_cible_check;

ALTER TABLE public.fiches
  ADD CONSTRAINT fiches_profil_cible_check
  CHECK (profil_cible IN ('csm', 'sales', 'all', 'csm_sales'));

-- 5. Mettre à jour le trigger handle_new_user : défaut 'new' → 'csm'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'csm')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
