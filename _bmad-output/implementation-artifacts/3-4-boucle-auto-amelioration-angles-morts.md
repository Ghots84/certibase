---
baseline_commit: bb4f806
---

# Story 3.4 : Boucle auto-amélioration — Angles morts

Status: review

## Story

En tant qu'Alex (Admin),
Je veux voir les questions sans réponse satisfaisante et créer facilement les fiches manquantes,
Afin que la base de connaissance s'améliore continuellement avec l'usage.

## Acceptance Criteria

1. Quand l'assistant reçoit une question et que le meilleur résultat RAG a `similarity < 0.75`, un enregistrement `type=missing_info, confidence=0` est créé (ou incrémenté) dans `import_fiches_draft`, de façon silencieuse (non bloquant pour la réponse)
2. En bas de la grille fiches (vue GRID, admin uniquement), le `BlindspotPanel` s'affiche avec bordure gauche 3px `var(--warning)`, header avec icône ✦ et compteur d'items
3. Chaque item du panel affiche : pastille sévérité (rouge+halo si `asked≥8`, orange+halo sinon), question (truncée si > 80 chars), stats mono "N× demandé · canal"
4. Cliquer "Créer une fiche ↑" sur un item → `POST /api/fiches` avec le titre = question, toast "Brouillon créé pour : «question»"
5. Le panel est masqué si aucun angle mort (liste vide)

## Dev Notes

### Architecture — Vue d'ensemble des fichiers

| Fichier | Action | Notes |
|---|---|---|
| `supabase/migrations/010_blindspot_columns.sql` | NEW | `import_id` nullable + colonne `canal_source` |
| `lib/supabase/types.ts` | MODIFY | `ImportFicheDraft.import_id` → `string \| null` + `canal_source?` ; nouveau type `Blindspot` |
| `app/api/rag/route.ts` | MODIFY | Créer draft missing_info si maxSimilarity < 0.75 |
| `app/api/blindspots/route.ts` | NEW | GET admin — retourne les angles morts groupés |
| `app/(dashboard)/fiches/page.tsx` | MODIFY | Remplacer `BlindspotPlaceholder` par `BlindspotPanel` réel |

---

### Task 1 — Migration SQL

**Problème critique** : `import_fiches_draft.import_id` est `NOT NULL` (migration 004), ce qui empêche d'y insérer des `missing_info` générés par l'assistant (pas d'import parent). Il faut rendre ce champ nullable **uniquement** quand `type = 'missing_info'`.

La solution la plus simple : supprimer la contrainte NOT NULL sur `import_id` globalement. Les enregistrements issus d'imports réels auront toujours une valeur ; seuls les `missing_info` auront NULL.

Ajouter aussi `canal_source TEXT DEFAULT 'assistant'` pour tracer l'origine (assistant / n8n / agent).

```sql
-- Migration 010: rendre import_id nullable + ajouter canal_source
-- Nécessaire pour les enregistrements missing_info créés par l'assistant (sans import parent)

ALTER TABLE public.import_fiches_draft
  ALTER COLUMN import_id DROP NOT NULL;

ALTER TABLE public.import_fiches_draft
  ADD COLUMN IF NOT EXISTS canal_source TEXT DEFAULT 'assistant';
```

**Ne pas oublier** : mettre à jour `ImportFicheDraft` dans `lib/supabase/types.ts` :
- `import_id: string | null`  (était `string`)
- ajouter `canal_source?: string | null`

Ajouter aussi le type agrégé `Blindspot` (retourné par `/api/blindspots`) :
```ts
export interface Blindspot {
  question: string       // = title du draft
  times_asked: number    // nb d'occurrences groupées
  canal: string          // 'assistant' | 'n8n' | ...
  last_asked: string     // ISO timestamp dernière occurrence
}
```

---

### Task 2 — Modifier `/api/rag/route.ts`

**Contexte** : la route utilise `match_threshold: 0.35` pour trouver tous les résultats possibles (basse précision intentionnelle). Mais si le meilleur résultat a `similarity < 0.75`, la réponse n'est pas satisfaisante.

**Modification** : après avoir obtenu `results`, calculer `maxSimilarity`. Si < 0.75, créer un draft `missing_info` de façon **fire-and-forget** (ne pas `await` — ne jamais bloquer le stream SSE).

```ts
// Ajouter en haut du fichier :
import { createAdminClient } from '@/lib/supabase/admin'

// Après : const results: MatchDocumentResult[] = fiches ?? []
const maxSimilarity = results.length > 0
  ? Math.max(...results.map(r => r.similarity))
  : 0

if (maxSimilarity < 0.75) {
  // Fire-and-forget : ne pas await, ne pas bloquer le stream
  createAdminClient()
    .from('import_fiches_draft')
    .insert({
      import_id: null,
      type: 'missing_info',
      title: question.slice(0, 500),
      content: question,
      confidence: 0,
      canal_source: 'assistant',
      status: 'pending',
    })
    .then()
}
```

**Important** :
- Ne PAS `await` cet insert — le stream SSE ne doit pas être retardé
- Appeler `createAdminClient()` (bypass RLS) car l'utilisateur n'a pas de policy INSERT sur `import_fiches_draft`
- `question.slice(0, 500)` : sécurité si question très longue
- Cela crée un nouveau record à chaque question à faible similarity — le groupement se fait côté API `/api/blindspots`

---

### Task 3 — Créer `/api/blindspots/route.ts`

Route GET admin-only. Récupère tous les `missing_info` en `status='pending'`, les **groupe par titre** en TypeScript (Supabase JS ne supporte pas GROUP BY), et retourne le résultat trié.

```ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ImportFicheDraft, Blindspot } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('import_fiches_draft')
    .select('title, canal_source, created_at')
    .eq('type', 'missing_info')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(500) // cap pour éviter les grosses requêtes

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Grouper par title en TypeScript
  const map = new Map<string, { times_asked: number; canal: string; last_asked: string }>()
  for (const d of (data as Array<Pick<ImportFicheDraft, 'title' | 'canal_source' | 'created_at'>>) ?? []) {
    const key = d.title
    const existing = map.get(key)
    if (existing) {
      existing.times_asked++
      if (d.created_at > existing.last_asked) existing.last_asked = d.created_at
    } else {
      map.set(key, {
        times_asked: 1,
        canal: d.canal_source ?? 'assistant',
        last_asked: d.created_at,
      })
    }
  }

  const result: Blindspot[] = Array.from(map.entries())
    .map(([question, s]) => ({ question, ...s }))
    .sort((a, b) => b.times_asked - a.times_asked)
    .slice(0, 20) // afficher max 20 angles morts

  return Response.json(result)
}
```

---

### Task 4 — Modifier `app/(dashboard)/fiches/page.tsx`

#### 4a. Remplacer `BlindspotPlaceholder` par `BlindspotPanel`

La fonction `BlindspotPlaceholder` (lignes ~268-283) est le seul placeholder à remplacer. Son callsite est à la ligne ~963 : `{!loading && !error && <BlindspotPlaceholder />}`.

Le nouveau `BlindspotPanel` est un composant autonome qui :
1. Charge `/api/blindspots` dans un `useEffect` via une `async function load()` interne
2. N'affiche rien si la liste est vide ou si `!isAdmin`
3. Affiche le panel avec les items si > 0 résultats

**Props** : `{ isAdmin: boolean }`

**Callsite** : remplacer `{!loading && !error && <BlindspotPlaceholder />}` par `{!loading && !error && <BlindspotPanel isAdmin={isAdmin} />}`

#### 4b. Spec UI du BlindspotPanel

```tsx
function BlindspotPanel({ isAdmin }: { isAdmin: boolean }) {
  const [items, setItems] = useState<Blindspot[]>([])

  useEffect(() => {
    if (!isAdmin) return
    async function load() {
      const res = await fetch('/api/blindspots')
      if (res.ok) setItems(await res.json())
    }
    load()
  }, [isAdmin])

  if (!isAdmin || items.length === 0) return null

  return (
    <div style={{
      marginTop: 32,
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
      borderLeft: '3px solid var(--warning)',
      background: 'var(--surface)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ color: 'var(--warning)', fontSize: 15 }}>✦</span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>
          Angles morts
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 11, fontWeight: 600,
          color: 'var(--warning)', background: 'var(--warning-soft)',
          borderRadius: 'var(--radius-pill)', padding: '2px 8px',
        }}>
          {items.length} question{items.length > 1 ? 's' : ''} sans réponse
        </span>
      </div>

      {/* Grid 2 colonnes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 12,
        padding: 16,
      }}>
        {items.map(item => (
          <BlindspotItem key={item.question} item={item} />
        ))}
      </div>
    </div>
  )
}
```

#### 4c. Spec UI de BlindspotItem

```tsx
function BlindspotItem({ item }: { item: Blindspot }) {
  const isHigh = item.times_asked >= 8
  const dotColor = isHigh ? 'var(--danger)' : 'var(--warning)'
  const haloColor = isHigh ? 'var(--danger-soft)' : 'var(--warning-soft)'
  const question = item.question.length > 80
    ? item.question.slice(0, 77) + '...'
    : item.question

  async function handleCreate() {
    const res = await fetch('/api/fiches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: item.question.slice(0, 255),
        type: 'doc_certiplace',
        content: `## Question sans réponse\n\n${item.question}\n\n## À compléter`,
        profil_cible: 'all',
      }),
    })
    if (res.ok) {
      fireToast(`Brouillon créé pour : «${item.question.slice(0, 60)}${item.question.length > 60 ? '…' : ''}»`)
    }
  }

  return (
    <div style={{
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Pastille sévérité + question */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{
          flexShrink: 0, width: 8, height: 8, borderRadius: '50%',
          background: dotColor,
          boxShadow: `0 0 0 3px ${haloColor}`,
          marginTop: 5,
          display: 'inline-block',
        }} />
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.5 }}>
          {question}
        </p>
      </div>

      {/* Stats */}
      <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-faint)', fontFamily: 'monospace' }}>
        {item.times_asked}× demandé · {item.canal}
      </p>

      {/* CTA */}
      <button
        onClick={handleCreate}
        style={{
          alignSelf: 'flex-start',
          padding: '4px 10px', borderRadius: 'var(--radius)',
          border: '1px solid var(--border)', background: 'var(--surface-2)',
          color: 'var(--text-muted)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
        }}
      >
        Créer une fiche ↑
      </button>
    </div>
  )
}
```

#### 4d. Import type `Blindspot`

Ajouter à la ligne d'import de `types.ts` en haut de la page :
```ts
import type { Fiche, FicheType, Blindspot } from '@/lib/supabase/types'
```

---

### Règles à respecter (carryover story 3.3)

- `var(--token)` CSS uniquement — jamais Tailwind inline colors
- `react-hooks/set-state-in-effect` : tout setState dans une `async function load() {}` puis `load()`
- `export const dynamic = 'force-dynamic'` sur toutes les routes GET
- Next.js 16 : `params: Promise<{ id: string }>`, `await params`
- `createAdminClient()` pour bypass RLS dans les routes admin

### Ordre de dépendances

1. Migration SQL en premier (sinon l'insert dans rag/route.ts échouera si la colonne n'existe pas)
2. Types TS en second (utilisés par route blindspots)
3. Routes API
4. UI page.tsx en dernier

**Attention lint** : `BlindspotItem` utilise `fireToast` qui est défini dans la même page — pas besoin de re-déclarer. `Blindspot` doit être importé de `@/lib/supabase/types`.

---

## Tasks

- [x] 1. Créer `supabase/migrations/010_blindspot_columns.sql` — `import_id` nullable + `canal_source`
- [x] 2. Mettre à jour `lib/supabase/types.ts` — `ImportFicheDraft.import_id: string | null`, `canal_source?`, type `Blindspot`
- [x] 3. Modifier `app/api/rag/route.ts` — créer draft missing_info (fire-and-forget) si `maxSimilarity < 0.75`
- [x] 4. Créer `app/api/blindspots/route.ts` — GET admin-only, blindspots groupés
- [x] 5. Modifier `app/(dashboard)/fiches/page.tsx` — remplacer `BlindspotPlaceholder` par `BlindspotPanel` + `BlindspotItem`
- [x] 6. `npm run lint` → 0 erreur

## File List

- `supabase/migrations/010_blindspot_columns.sql` (NEW)
- `lib/supabase/types.ts` (MODIFY)
- `app/api/rag/route.ts` (MODIFY)
- `app/api/blindspots/route.ts` (NEW)
- `app/(dashboard)/fiches/page.tsx` (MODIFY)

## Dev Agent Record

### Completion Notes
- Migration 010 : `import_id` nullable + colonne `canal_source TEXT DEFAULT 'assistant'`
- `ImportFicheDraft.import_id` → `string | null` ; nouveau type `Blindspot` dans types.ts
- RAG route : `maxSimilarity < 0.75` → insert fire-and-forget `missing_info` via adminClient
- `/api/blindspots` : GET admin-only, GROUP BY title en TypeScript, tri par `times_asked` DESC, max 20 items
- `BlindspotPanel` + `BlindspotItem` remplacent `BlindspotPlaceholder` ; panel masqué si liste vide
- CTA "Créer une fiche ↑" → `POST /api/fiches` (draft direct, visible immédiatement dans "À valider")
