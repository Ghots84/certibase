-- Migration 011: table chat_messages pour la mémoire conversationnelle de l'assistant
-- Historique per-user, rétention 90 jours, purge au chargement

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT        NOT NULL,
  sources     JSONB       DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages_own" ON public.chat_messages
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS chat_messages_user_created
  ON public.chat_messages(user_id, created_at DESC);
