# Addendum Technique — CertiBase

> Ce document contient les décisions d'architecture et d'implémentation qui complètent le PRD.
> Il est destiné aux développeurs et architectes, pas aux parties prenantes produit.

---

## 1. Stack Technique

| Couche | Technologie | Justification |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR, API Routes, Server Actions |
| Style | Tailwind CSS | Cohérence avec CertiPlace existant |
| Base de données | Supabase (PostgreSQL + pgvector) | Auth intégrée, RLS natif, vector store |
| IA principale | Claude API (claude-sonnet-4-6) | Extraction JSON, RAG, agents |
| Transcription | Whisper API (OpenAI) | Qualité transcription audio/vidéo |
| Veille auto | n8n (webhook) | Orchestration no-code scraping |
| Runtime | Node.js 20+ | Compatibilité App Router |
| Storage fichiers | Supabase Storage | Upload audio/vidéo/PDF |

---

## 2. Modèle de Données (MCD — 5 tables Supabase)

### 2.1 Table `profiles`

```sql
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL UNIQUE,
  full_name    TEXT,
  role         TEXT NOT NULL DEFAULT 'new'
                 CHECK (role IN ('csm', 'sales', 'new', 'admin')),
  avatar_initials TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger automatique à la création d'un compte
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 2.2 Table `tenants`

```sql
CREATE TABLE tenants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  certiplace_client_id TEXT UNIQUE,
  agent_name          TEXT DEFAULT 'CertiBase',
  primary_color       TEXT DEFAULT '#6366f1',
  logo_url            TEXT,
  csm_agent_active    BOOLEAN DEFAULT FALSE,
  sales_agent_active  BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

> **Simplification MVP :** Usage interne uniquement — un seul tenant CertiPlace ou `tenant_id` nullable sur les fiches. La colonne `tenant_id` est conservée dans le schéma pour la future extension multi-tenant, mais non exposée dans l'UI MVP.

### 2.3 Table `imports`

```sql
CREATE TABLE imports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  file_type      TEXT NOT NULL CHECK (file_type IN ('audio', 'video', 'pdf', 'url')),
  import_type    TEXT NOT NULL CHECK (import_type IN (
                   'webinar', 'presentation', 'sales_call', 'internal_doc', 'other'
                 )),
  file_path      TEXT,                -- Supabase Storage path (audio/video/PDF)
  file_url       TEXT,                -- URL externe (YouTube, Zoom)
  original_name  TEXT,
  title          TEXT,
  profil_cible   TEXT CHECK (profil_cible IN ('csm', 'sales', 'new', 'all', 'csm_sales')),
  duration_sec   INTEGER,             -- Durée audio/vidéo en secondes
  total_pages    INTEGER,             -- Nombre de pages PDF
  transcription  TEXT,                -- Texte brut extrait (Whisper ou Claude)
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'extracting', 'analyzing', 'ready', 'error')),
  error_message  TEXT,
  fiches_count   INTEGER DEFAULT 0,   -- Nombre de drafts générés
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.4 Table `import_fiches_draft`

```sql
CREATE TABLE import_fiches_draft (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id            UUID NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
  validated_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  fiche_id             UUID REFERENCES fiches(id) ON DELETE SET NULL, -- NULL jusqu'à approbation
  type                 TEXT NOT NULL CHECK (type IN (
                         'objection', 'guide_situation', 'cas_client', 'concurrent', 'missing_info'
                       )),
  title                TEXT NOT NULL,
  content              JSONB NOT NULL,             -- Contenu structuré selon le type de fiche
  source_timestamp_sec INTEGER,                    -- Horodatage source (audio/vidéo)
  source_page          INTEGER,                    -- Page source (PDF)
  confidence           NUMERIC(3,2) CHECK (confidence BETWEEN 0 AND 1),
  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.5 Table `fiches`

```sql
CREATE TABLE fiches (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  tenant_id            UUID REFERENCES tenants(id) ON DELETE SET NULL, -- nullable MVP
  source_ref_id        UUID REFERENCES imports(id) ON DELETE SET NULL,
  type                 TEXT NOT NULL CHECK (type IN (
                         'objection', 'guide_situation', 'cas_client',
                         'concurrent', 'doc_certiplace', 'veille'
                       )),
  title                TEXT NOT NULL,
  content              JSONB NOT NULL,
  profil_cible         TEXT CHECK (profil_cible IN ('csm', 'sales', 'new', 'all', 'csm_sales')),
  source               TEXT,
  source_timestamp_sec INTEGER,
  source_page          INTEGER,
  confidence_threshold NUMERIC(3,2) DEFAULT 0.75,
  embedding            VECTOR(1536),               -- OpenAI text-embedding-3-small
  status               TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft', 'published', 'archived')),
  expires_at           TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pgvector obligatoire pour performance RAG
CREATE INDEX fiches_embedding_ivfflat_idx
  ON fiches
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index statut pour filtrer les fiches publiées rapidement
CREATE INDEX fiches_status_idx ON fiches (status);
CREATE INDEX fiches_type_idx ON fiches (type);
```

---

## 3. Pipeline Technique de Traitement — 5 Étapes

### Vue d'ensemble

```
[Upload] → [Extraction texte] → [Analyse Claude] → [Drafts DB] → [Validation + Embedding]
```

### Étape 1 — Import & Stockage

| Source | Traitement |
|---|---|
| Audio/Vidéo (upload) | Upload vers Supabase Storage → path stocké dans `imports.file_path` |
| PDF (upload) | Upload vers Supabase Storage OU envoi direct à Claude API |
| URL YouTube/Zoom | URL stockée dans `imports.file_url`, pas de stockage binaire |

- Limite fichier upload : 500 Mo (audio/vidéo), 50 Mo (PDF)
- `imports.status` passe à `extracting`

### Étape 2 — Extraction Texte

| Type | Outil | Output |
|---|---|---|
| Audio/Vidéo | Whisper API (OpenAI) | Transcription texte avec timestamps |
| PDF | Claude API (vision natif) | Texte extrait avec numéros de pages |
| URL YouTube | YouTube Data API v3 → sous-titres | Transcription + timestamps |

> **Principe de simplicité :** Pas de PyMuPDF, pas de dépendances Python. Claude traite les PDFs nativement via son API multimodale. Un seul écosystème Node.js.

- Résultat stocké dans `imports.transcription`
- `imports.status` passe à `analyzing`

### Étape 3 — Analyse Claude (1 appel = 1 JSON)

Un seul appel à `claude-sonnet-4-6` avec le texte extrait. Le prompt système demande un JSON structuré :

```json
{
  "objections": [
    {
      "type": "objection",
      "title": "...",
      "content": {
        "verbatim": "...",
        "reponse_flash": "...",
        "preuve": "..."
      },
      "source_timestamp_sec": 142,
      "confidence": 0.92
    }
  ],
  "faq": [...],
  "moments_cles": [...],
  "angles_morts": [...]
}
```

- `imports.status` passe à `ready` (ou `error` si parsing échoue)
- `imports.fiches_count` mis à jour avec le total de drafts générés

### Étape 4 — Création des Drafts

- Chaque élément JSON → 1 ligne dans `import_fiches_draft` avec `status = 'pending'`
- Notification dashboard admin déclenchée (in-app ou email selon config)

### Étape 5 — Validation Admin + Génération Embedding

- Admin approuve/rejette chaque draft dans le dashboard
- À l'approbation : Supabase Edge Function `generate_embedding` appelée
  - Appel OpenAI `text-embedding-3-small` sur `title + content`
  - Résultat stocké dans `fiches.embedding`
  - `fiches.status` passe à `published`
  - `import_fiches_draft.fiche_id` mis à jour avec l'UUID de la fiche créée

---

## 4. Fonction RAG — `match_documents`

```sql
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.75,
  match_count     INT DEFAULT 5,
  filter_profil   TEXT DEFAULT NULL
)
RETURNS TABLE (
  id         UUID,
  title      TEXT,
  content    JSONB,
  type       TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.title,
    f.content,
    f.type,
    1 - (f.embedding <=> query_embedding) AS similarity
  FROM fiches f
  WHERE
    f.status = 'published'
    AND (filter_profil IS NULL OR f.profil_cible IN (filter_profil, 'all'))
    AND 1 - (f.embedding <=> query_embedding) > match_threshold
  ORDER BY f.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## 5. Sécurité — Row Level Security (RLS) Simplifié MVP

Usage interne uniquement — tous les utilisateurs sont authentifiés via Supabase Auth.

```sql
-- Profils : chacun voit et modifie son propre profil ; admin voit tout
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profile" ON profiles
  FOR ALL USING (auth.uid() = id);
CREATE POLICY "admin_all_profiles" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Fiches publiées : visibles par tous les utilisateurs authentifiés
ALTER TABLE fiches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_published_fiches" ON fiches
  FOR SELECT USING (auth.uid() IS NOT NULL AND status = 'published');
CREATE POLICY "admin_manage_fiches" ON fiches
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Imports et drafts : gérés par admin uniquement en écriture
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view_imports" ON imports
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_manage_imports" ON imports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

---

## 6. Route API Interne — `/api/chat`

L'assistant interne réutilise la route `/api/chat` existante avec un `system prompt` différencié par rôle :

```typescript
// Sélection du system prompt selon le rôle utilisateur
const systemPrompts: Record<string, string> = {
  csm:   "Tu es l'assistant CertiBase pour les CSM. Aide à préparer les appels clients, ...",
  sales: "Tu es l'assistant CertiBase pour les Sales. Fournis des arguments commerciaux, ...",
  admin: "Tu es l'assistant CertiBase admin. Accès complet à la base de connaissance, ...",
  new:   "Tu es l'assistant CertiBase. Réponds aux questions générales sur CertiPlace, ..."
};
```

Le RAG est exécuté avant chaque appel Claude :
1. Embedding de la question utilisateur (OpenAI)
2. `match_documents(embedding, threshold, 5, user.role)`
3. Contexte injecté dans le prompt Claude
4. Réponse générée avec sources citées

---

## 7. Principe de Simplicité Technique

- **1 appel Claude = 1 JSON** : Pas de chaîne de prompts complexe pour l'extraction. Un seul appel produit toutes les fiches drafts pour un import.
- **Pas de PyMuPDF** : Claude traite les PDFs nativement — pas de dépendances Python, pas de serveur séparé.
- **Index ivfflat obligatoire** : Sans l'index, les recherches vectorielles sur une base > 1000 fiches deviennent lentes. L'index `ivfflat` avec `lists = 100` est créé dès le setup initial.
- **Edge Functions Supabase** : La génération d'embeddings se fait en Edge Function (TypeScript) — pas de serveur dédié nécessaire.
- **Storage Supabase** : Pas de S3 ou CDN tiers pour le MVP — Supabase Storage suffit pour les volumes attendus.
