-- Migration 001: profiles table + trigger on_auth_user_created
-- Dépendance: auth.users (Supabase Auth intégré)

CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID        NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT        NOT NULL,
  full_name       TEXT,
  role            TEXT        DEFAULT 'new' CHECK (role IN ('csm', 'sales', 'new', 'admin')),
  avatar_initials TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Fonction appelée à chaque inscription Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'new')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
