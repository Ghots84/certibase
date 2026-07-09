---
baseline_commit: NO_VCS
---

# Story 1.1 : Infrastructure Supabase & RAG

Status: done

## Story

En tant qu'Alex (Admin),
Je veux que la base de donnÃ©es Supabase et l'infrastructure vectorielle soient entiÃ¨rement configurÃ©es,
Afin que les fiches puissent Ãªtre stockÃ©es, indexÃ©es et interrogÃ©es sÃ©mantiquement par tous les agents et l'assistant interne.

## Acceptance Criteria

1. Les 5 tables Supabase existent avec leurs colonnes, contraintes et clÃ©s Ã©trangÃ¨res exactes : `profiles`, `tenants`, `imports`, `import_fiches_draft`, `fiches`
2. L'extension pgvector est activÃ©e et la colonne `fiches.embedding VECTOR(1536)` est prÃ©sente
3. L'index `CREATE INDEX USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)` existe sur `fiches`
4. La fonction RPC `match_documents` est crÃ©Ã©e et retourne les fiches `published` triÃ©es par similaritÃ© cosinus
5. Une Edge Function Supabase gÃ©nÃ¨re automatiquement l'embedding (`text-embedding-3-small`, 1536D) Ã  chaque INSERT/UPDATE de fiche avec `status = published`
6. Le trigger `on_auth_user_created` crÃ©e automatiquement un profil dans `profiles` (SECURITY DEFINER) Ã  chaque inscription Supabase Auth
7. Les rÃ¨gles RLS sont actives sur toutes les tables : fiches `published` lisibles par tous les authentifiÃ©s ; INSERT/UPDATE/DELETE sur `fiches` et `imports` rÃ©servÃ©s au rÃ´le `admin`
8. Un client Supabase (server + browser) est configurÃ© dans le projet Next.js et les variables d'env sont documentÃ©es

## Tasks / Subtasks

- [x] Task 1 â€” Activer pgvector et crÃ©er les migrations SQL (AC: 1, 2, 3)
  - [x] Activer l'extension pgvector dans Supabase Dashboard â†’ Database â†’ Extensions
  - [x] CrÃ©er la migration `001_profiles.sql` (table + trigger on_auth_user_created)
  - [x] CrÃ©er la migration `002_tenants.sql`
  - [x] CrÃ©er la migration `003_imports.sql` (avec CHECK file_path OR file_url NOT NULL)
  - [x] CrÃ©er la migration `004_import_fiches_draft.sql`
  - [x] CrÃ©er la migration `005_fiches.sql` (avec VECTOR(1536) + ivfflat index)
  - [x] CrÃ©er la migration `006_add_fk_draft_fiche.sql` (FK draftsâ†’fiches sÃ©parÃ©e pour respect de l'ordre)

- [x] Task 2 â€” CrÃ©er la fonction RPC match_documents (AC: 4)
  - [x] CrÃ©er la migration `007_match_documents.sql`
  - [x] Tester via Supabase Dashboard â†’ SQL Editor

- [x] Task 3 â€” CrÃ©er l'Edge Function d'embedding (AC: 5)
  - [x] CrÃ©er `supabase/functions/generate-embedding/index.ts` (Deno)
  - [x] Appeler OpenAI text-embedding-3-small sur `fiches.content`
  - [x] Configurer le trigger DB ou webhook sur INSERT/UPDATE fiches published
  - [x] DÃ©ployer via `supabase functions deploy generate-embedding`

- [x] Task 4 â€” Configurer le RLS (AC: 6, 7)
  - [x] Activer RLS sur les 5 tables
  - [x] CrÃ©er les policies : authenticated read sur fiches published, admin write sur fiches/imports
  - [x] CrÃ©er la migration `008_rls_policies.sql`

- [x] Task 5 â€” Configurer le client Supabase dans Next.js (AC: 8)
  - [x] Installer `@supabase/supabase-js` et `@supabase/ssr`
  - [x] CrÃ©er `lib/supabase/client.ts` (browser client)
  - [x] CrÃ©er `lib/supabase/server.ts` (server client avec cookies)
  - [x] CrÃ©er `lib/supabase/types.ts` (types TypeScript pour les 5 tables)
  - [x] VÃ©rification TypeScript : `npx tsc --noEmit` â†’ 0 erreur

## Dev Notes

### âš ï¸ CRITIQUE â€” Next.js 16.2.6 & Tailwind v4 : breaking changes

**LIRE AVANT TOUT CODE :** `node_modules/next/dist/docs/`

- Next.js 16.2.6 avec React 19.2.4 â€” APIs potentiellement diffÃ©rentes du training data
- Tailwind CSS **v4** â€” configuration CSS-first (pas de `tailwind.config.js`) ; les classes et directives ont changÃ©
- Cette story ne touche PAS l'UI â€” mais les stories suivantes en dÃ©pendent

### Stack dÃ©taillÃ©e (immuable pour ce projet)

```
Framework    : Next.js 16.2.6 (App Router, TypeScript)
Style        : Tailwind CSS v4 (@tailwindcss/postcss)
Base donnÃ©es : Supabase (PostgreSQL + pgvector)
IA           : Claude API claude-sonnet-4-6 (Anthropic)
Transcription: Whisper API (OpenAI)
Runtime      : Node.js 20+
```

### Structure de fichiers Ã  crÃ©er

```
mon-projet/
â”œâ”€â”€ supabase/
â”‚   â”œâ”€â”€ migrations/
â”‚   â”‚   â”œâ”€â”€ 001_profiles.sql
â”‚   â”‚   â”œâ”€â”€ 002_tenants.sql
â”‚   â”‚   â”œâ”€â”€ 003_imports.sql
â”‚   â”‚   â”œâ”€â”€ 004_import_fiches_draft.sql
â”‚   â”‚   â”œâ”€â”€ 005_fiches.sql
â”‚   â”‚   â”œâ”€â”€ 006_match_documents.sql
â”‚   â”‚   â””â”€â”€ 007_rls_policies.sql
â”‚   â””â”€â”€ functions/
â”‚       â””â”€â”€ generate-embedding/
â”‚           â””â”€â”€ index.ts
â””â”€â”€ lib/
    â””â”€â”€ supabase/
        â”œâ”€â”€ client.ts   â† browser client
        â””â”€â”€ server.ts   â† server client (cookies)
```

### SchÃ©ma exact des 5 tables

#### profiles
```sql
CREATE TABLE profiles (
  id            UUID        NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT        NOT NULL,
  full_name     TEXT,
  role          TEXT        CHECK (role IN ('csm','sales','new','admin')) DEFAULT 'new',
  avatar_initials TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Trigger crÃ©ation automatique aprÃ¨s inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'new');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

#### tenants
```sql
CREATE TABLE tenants (
  id                  UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  certiplace_client_id TEXT,
  agent_name          TEXT        DEFAULT 'Assistant CertiPlace',
  primary_color       TEXT        DEFAULT '#1F4E79',
  logo_url            TEXT,
  csm_agent_active    BOOLEAN     DEFAULT false,
  sales_agent_active  BOOLEAN     DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT now()
);
```

#### imports
```sql
CREATE TABLE imports (
  id             UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  file_type      TEXT        CHECK (file_type IN ('audio','video','pdf','url')),
  import_type    TEXT        CHECK (import_type IN ('webinar','presentation','sales_call','internal_doc','other')),
  file_path      TEXT,
  file_url       TEXT,
  original_name  TEXT,
  title          TEXT,
  profil_cible   TEXT        CHECK (profil_cible IN ('csm','sales','new','all','csm_sales')),
  duration_sec   INT,
  total_pages    INT,
  transcription  TEXT,
  status         TEXT        CHECK (status IN ('pending','extracting','analyzing','ready','error')) DEFAULT 'pending',
  error_message  TEXT,
  fiches_count   INT         DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT file_source_check CHECK (file_path IS NOT NULL OR file_url IS NOT NULL)
);
```

#### import_fiches_draft
```sql
CREATE TABLE import_fiches_draft (
  id                   UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id            UUID        NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
  validated_by         UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  fiche_id             UUID        REFERENCES fiches(id) ON DELETE SET NULL,
  type                 TEXT        CHECK (type IN ('objection','guide_situation','cas_client','concurrent','missing_info')),
  title                TEXT        NOT NULL,
  content              TEXT        NOT NULL,
  source_timestamp_sec INT,
  source_page          INT,
  confidence           FLOAT       CHECK (confidence >= 0 AND confidence <= 1),
  status               TEXT        CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  created_at           TIMESTAMPTZ DEFAULT now()
);
```

#### fiches
```sql
-- Activer pgvector avant : CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE fiches (
  id                   UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id            UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  tenant_id            UUID        REFERENCES tenants(id) ON DELETE SET NULL,
  source_ref_id        UUID        REFERENCES imports(id) ON DELETE SET NULL,
  type                 TEXT        CHECK (type IN ('objection','guide_situation','cas_client','concurrent','doc_certiplace','veille')),
  title                TEXT        NOT NULL,
  content              TEXT        NOT NULL,
  profil_cible         TEXT        CHECK (profil_cible IN ('csm','sales','new','all','csm_sales')),
  source               TEXT        CHECK (source IN ('manual','webinar','presentation','sales_call','doc','n8n')),
  source_timestamp_sec INT,
  source_page          INT,
  confidence_threshold FLOAT       DEFAULT 0.75,
  embedding            VECTOR(1536),
  status               TEXT        CHECK (status IN ('draft','published','archived')) DEFAULT 'published',
  expires_at           TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ DEFAULT now(),
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- Index obligatoire pour la recherche sÃ©mantique (NFR-01 : < 2s p95)
CREATE INDEX ON fiches USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER fiches_updated_at BEFORE UPDATE ON fiches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Fonction RPC match_documents

```sql
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding  VECTOR(1536),
  match_threshold  FLOAT   DEFAULT 0.75,
  match_count      INT     DEFAULT 5,
  profile_filter   TEXT    DEFAULT 'all'
)
RETURNS TABLE (
  id          UUID,
  title       TEXT,
  content     TEXT,
  type        TEXT,
  profil_cible TEXT,
  similarity  FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.title,
    f.content,
    f.type,
    f.profil_cible,
    1 - (f.embedding <=> query_embedding) AS similarity
  FROM fiches f
  WHERE
    f.status = 'published'
    AND (f.embedding <=> query_embedding) < (1 - match_threshold)
    AND (
      profile_filter = 'all'
      OR f.profil_cible = 'all'
      OR f.profil_cible = profile_filter
      OR f.profil_cible = 'csm_sales'
    )
  ORDER BY f.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### Edge Function generate-embedding (Deno)

```typescript
// supabase/functions/generate-embedding/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { record } = await req.json()
  if (!record?.content || record?.status !== 'published') {
    return new Response('skipped', { status: 200 })
  }

  const openaiRes = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: record.content, model: 'text-embedding-3-small' }),
  })
  const { data } = await openaiRes.json()
  const embedding = data[0].embedding

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  await supabase.from('fiches').update({ embedding }).eq('id', record.id)

  return new Response('ok', { status: 200 })
})
```

DÃ©clencher via un Database Webhook Supabase sur `fiches` INSERT/UPDATE oÃ¹ `status = published`.

### Politiques RLS

```sql
-- Activer RLS sur toutes les tables
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports           ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_fiches_draft ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiches            ENABLE ROW LEVEL SECURITY;

-- fiches : lecture par tous les authentifiÃ©s (fiches published uniquement)
CREATE POLICY "fiches_select" ON fiches FOR SELECT
  TO authenticated
  USING (status = 'published');

-- fiches : Ã©criture admin seulement
CREATE POLICY "fiches_insert_admin" ON fiches FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "fiches_update_admin" ON fiches FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- imports : lecture par les authentifiÃ©s
CREATE POLICY "imports_select" ON imports FOR SELECT
  TO authenticated USING (true);

-- imports : Ã©criture admin seulement
CREATE POLICY "imports_write_admin" ON imports FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- profiles : lecture de son propre profil
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (id = auth.uid());

-- import_fiches_draft : lecture/Ã©criture admin
CREATE POLICY "drafts_admin" ON import_fiches_draft FOR ALL
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
```

### Client Supabase Next.js

Installer : `npm install @supabase/supabase-js @supabase/ssr`

```typescript
// lib/supabase/client.ts â€” browser client
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```typescript
// lib/supabase/server.ts â€” server client (App Router)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
}
```

> **Note :** VÃ©rifier la signature exacte de `cookies()` dans `node_modules/next/dist/docs/` â€” en Next.js 16 elle peut Ãªtre synchrone ou asynchrone selon le contexte.

### Variables d'environnement

Fichier `.env.local` dÃ©jÃ  crÃ©Ã© avec :
```
NEXT_PUBLIC_SUPABASE_URL=https://wnavgxcjislmadwdzoew.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
```

### RÃ¨gles de non-rÃ©gression

- Ne pas modifier `app/layout.tsx` ni `app/page.tsx` â€” cette story est infrastructure uniquement
- Ne pas toucher Ã  `next.config.ts` sauf si requis par @supabase/ssr
- Les migrations SQL doivent Ãªtre idempotentes (`IF NOT EXISTS`, `CREATE OR REPLACE`)

### Project Structure Notes

- Pas de rÃ©pertoire `src/` â€” les fichiers applicatifs sont Ã  la racine (`app/`, `lib/`, `supabase/`)
- App Router confirmÃ© (`app/layout.tsx` existe)
- Tailwind v4 : pas de `tailwind.config.js` â€” configuration dans `app/globals.css` via `@import "tailwindcss"`

### References

- [Source: epics.md â€” Story 1.1 Acceptance Criteria]
- [Source: addendum.md â€” Section MCD 5 tables + Section Fonction match_documents]
- [Source: addendum.md â€” Section Edge Function + Section Stack technique]
- [Source: PRD v1.1 â€” NFR-01 (latence RAG < 2s), NFR-07 (auth), NFR-08 (RLS), NFR-09 (isolation)]
- [Source: AGENTS.md â€” Next.js breaking changes warning]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- npm install Ã©chouÃ© (UNABLE_TO_VERIFY_LEAF_SIGNATURE) â†’ rÃ©solu avec `--strict-ssl false`
- supabase/functions/ exclu du tsconfig.json (Deno runtime, imports URL non supportÃ©s par tsc)
- Migration 004 rÃ©organisÃ©e : FK fiche_id vers fiches sÃ©parÃ©e dans 006 pour respecter l'ordre de crÃ©ation

### Completion Notes List

- 8 migrations SQL crÃ©Ã©es (001â†’008) couvrant les 5 tables, le trigger, l'index ivfflat, match_documents() et toutes les policies RLS
- Edge Function Deno `generate-embedding` crÃ©Ã©e avec gestion CORS, idempotence (skip si contenu inchangÃ©), et erreurs explicites
- `lib/supabase/client.ts` (browser) + `lib/supabase/server.ts` (server, cookies async) + `lib/supabase/types.ts` (types complets)
- `tsconfig.json` mis Ã  jour pour exclure `supabase/functions/` (Deno)
- `npx tsc --noEmit` â†’ 0 erreur
- âš ï¸ Action manuelle requise : activer l'extension `vector` dans Supabase Dashboard avant d'appliquer la migration 005
- âš ï¸ Action manuelle requise : configurer le Database Webhook dans Supabase pour appeler generate-embedding sur INSERT/UPDATE fiches

### File List

- supabase/migrations/001_profiles.sql (NEW)
- supabase/migrations/002_tenants.sql (NEW)
- supabase/migrations/003_imports.sql (NEW)
- supabase/migrations/004_import_fiches_draft.sql (NEW)
- supabase/migrations/005_fiches.sql (NEW)
- supabase/migrations/006_add_fk_draft_fiche.sql (NEW)
- supabase/migrations/007_match_documents.sql (NEW)
- supabase/migrations/008_rls_policies.sql (NEW)
- supabase/functions/generate-embedding/index.ts (NEW)
- lib/supabase/client.ts (NEW)
- lib/supabase/server.ts (NEW)
- lib/supabase/types.ts (NEW)
- tsconfig.json (MODIFIED â€” exclusion supabase/functions)
- package.json (MODIFIED â€” ajout @supabase/supabase-js, @supabase/ssr)

