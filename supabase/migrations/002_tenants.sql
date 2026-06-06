-- Migration 002: tenants table
-- Un tenant = un client CertiPlace qui utilise un agent IA (scope post-MVP)
-- Pour le MVP: colonne tenant_id présente mais nullable (un seul tenant interne)

CREATE TABLE IF NOT EXISTS public.tenants (
  id                   UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT        NOT NULL,
  certiplace_client_id TEXT,
  agent_name           TEXT        DEFAULT 'Assistant CertiPlace',
  primary_color        TEXT        DEFAULT '#1F4E79',
  logo_url             TEXT,
  csm_agent_active     BOOLEAN     DEFAULT false,
  sales_agent_active   BOOLEAN     DEFAULT false,
  created_at           TIMESTAMPTZ DEFAULT now()
);
