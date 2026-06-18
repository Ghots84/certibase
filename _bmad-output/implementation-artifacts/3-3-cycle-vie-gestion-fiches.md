---
baseline_commit: 78c360de05481ba4eaf731cdc32c0c83b2b5b35e
---

# Story 3.3 : Cycle de vie & gestion des fiches

Status: in-progress

## Story

En tant qu'Alex (Admin),
Je veux gérer le cycle de vie des fiches et créer des fiches manuellement,
Afin de maintenir la base à jour et précise.

## Acceptance Criteria

1. Cliquer "Valider" sur une fiche `draft` → `status = published`, badge passe à "Validée", embedding généré automatiquement via webhook
2. Cliquer "Modifier" ouvre un formulaire (titre, type, contenu, profil cible) pré-rempli ; sauvegarder → PATCH + refresh
3. Cliquer "Archiver" → `status = archived`, fiche disparaît de la grille
4. Cliquer "Dupliquer" → POST copie en `draft`, toast de confirmation
5. Bouton "Nouvelle fiche" → ouvre formulaire vide → POST → fiche créée en `draft`
6. Les boutons Valider/Modifier/Archiver sont visibles uniquement pour `isAdmin`
7. Après chaque action : refresh de la liste, drawer mis à jour ou fermé selon le cas

## Dev Notes

### Architecture

**Routes API à créer/modifier :**
- `app/api/fiches/[id]/route.ts` (NEW) — PATCH (validate/modify/archive) + DELETE
- `app/api/fiches/route.ts` (MODIFY) — ajouter POST (création manuelle)

**Embedding :** géré par le webhook Supabase `generate-embedding` Edge Function
automatiquement sur UPDATE `status = published` ou changement de `content`.
Ne pas appeler l'embedding depuis l'API route — laisser le webhook agir.

**PATCH payload autorisé :** `{ status?, title?, type?, content?, profil_cible?, confidence_threshold? }`
Toujours utiliser `createAdminClient()` pour bypass RLS.

### Route PATCH /api/fiches/[id]

```ts
export async function PATCH(req, { params }) {
  const { id } = await params  // Next.js 16: params est une Promise
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  // Vérifier que c'est un admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return Response.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json()
  const allowed = ['status', 'title', 'type', 'content', 'profil_cible', 'confidence_threshold']
  const patch = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

  const admin = createAdminClient()
  const { data, error } = await admin.from('fiches').update(patch).eq('id', id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
```

### Route POST /api/fiches

```ts
export async function POST(req) {
  // Auth + admin check (même pattern)
  const body = await req.json()
  const { title, type, content, profil_cible } = body
  const { data: { user } } = await supabase.auth.getUser()
  
  const admin = createAdminClient()
  const { data, error } = await admin.from('fiches').insert({
    title, type, content, profil_cible,
    source: 'manual',
    status: 'draft',
    author_id: user.id,
    confidence_threshold: 0.75,
  }).select().single()
  
  return Response.json(data, { status: 201 })
}
```

### UI — refreshKey pattern

Ajouter `const [refreshKey, setRefreshKey] = useState(0)` dans FichesPage.
Ajouter `refreshKey` comme dépendance du useEffect de loadAll.
Après chaque action réussie : `setRefreshKey(k => k + 1)`.

### UI — FicheFormModal (inline dans page.tsx)

Modale overlay avec :
- Backdrop noir semi-transparent, zIndex 100
- Panneau centré 520px de large, fond `var(--surface)`, border-radius `var(--radius-lg)`
- Champs : Titre (input text), Type (select), Contenu (textarea 8 lignes), Profil cible (select)
- Boutons : Annuler + Enregistrer
- Props : `{ mode: 'create' | 'edit', fiche?: Fiche, onSave: () => void, onClose: () => void }`

### UI — Actions dans FicheDrawer

Passer les callbacks `onRefresh` et `onOpenEdit` en props dans FicheDrawer.
- "Valider" → `PATCH /api/fiches/{id}` `{ status: 'published' }` → onRefresh() + toast "Fiche validée"
- "Modifier" → onOpenEdit(fiche)
- "Archiver" → `PATCH /api/fiches/{id}` `{ status: 'archived' }` → onRefresh() + onClose() + toast "Fiche archivée"
- "Dupliquer" → `POST /api/fiches` avec copie + suffix " (copie)" → onRefresh() + toast "Fiche dupliquée"

### Règles CSS / Design System

- `var(--token)` uniquement, jamais Tailwind inline
- `react-hooks/set-state-in-effect` : tout setState dans async function interne
- Next.js 16 : `params: Promise<{ id: string }>`, `await params`
- `export const dynamic = 'force-dynamic'` sur les routes GET/PATCH/POST

## Tasks

- [ ] 1. Créer `app/api/fiches/[id]/route.ts` — PATCH (validate/edit/archive)
- [ ] 2. Modifier `app/api/fiches/route.ts` — ajouter POST (création manuelle)
- [ ] 3. Modifier `app/(dashboard)/fiches/page.tsx` — refreshKey + FicheFormModal + actions drawer réelles
- [ ] 4. `npm run lint` → 0 erreur

## File List

- `app/api/fiches/[id]/route.ts` (NEW)
- `app/api/fiches/route.ts` (MODIFY)
- `app/(dashboard)/fiches/page.tsx` (MODIFY)

## Dev Agent Record

### Completion Notes
_à remplir_
