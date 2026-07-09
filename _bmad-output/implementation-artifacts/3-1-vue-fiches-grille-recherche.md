---
baseline_commit: 1bb69c9
---

# Story 3.1 : Vue Fiches — grille & recherche

Status: done

## Story

En tant que membre de l'équipe,
Je veux parcourir et filtrer les fiches publiées par texte et catégorie,
Afin de trouver rapidement la connaissance dont j'ai besoin.

## Acceptance Criteria

1. Les fiches `status = published` sont affichées en grille CSS `auto-fill minmax(270px, 1fr)`
2. Chaque FicheCard affiche : ID mono, badge statut (dot ● Validée=success / ● À valider=warning), titre, résumé content clampé 3 lignes, pastille catégorie colorée, barre de confiance 46px (≥85=success / 70-84=warning / <70=danger)
3. La recherche texte filtre en temps réel sur `title + content` (insensible à la casse, côté client)
4. Le segmented control catégories (Toutes / Produit / Sales / Réglementaire / Veille) filtre par type, combiné avec le texte
5. Le bouton "Nouvelle fiche" est visible uniquement pour les `admin` (déjà via `/api/me`)
6. Un BlindspotPanel placeholder est affiché sous la grille (contenu complet en Story 3.4)

## Dev Notes

### Architecture API

**Route** : `GET /api/fiches`
- Auth : tout utilisateur authentifié (RLS Supabase : `published` lisibles par tous)
- Retourne toutes les fiches `status = 'published'`, triées `created_at DESC`
- Pas de pagination MVP — dataset petit, filtrage côté client
- `export const dynamic = 'force-dynamic'`

```ts
// app/api/fiches/route.ts
const { data } = await admin
  .from('fiches')
  .select('id, type, title, content, status, confidence_threshold, source, created_at, profil_cible')
  .eq('status', 'published')
  .order('created_at', { ascending: false })
```

Ne jamais sélectionner `embedding` côté client (vecteur 1536D = très lourd).

### Mapping type → catégorie (filtre UI)

```ts
const TYPE_TO_CATEGORY: Record<string, string> = {
  objection:       'Sales',
  concurrent:      'Sales',
  cas_client:      'Sales',
  guide_situation: 'Réglementaire',
  doc_certiplace:  'Produit',
  veille:          'Veille',
}

const CATEGORIES = ['Toutes', 'Produit', 'Sales', 'Réglementaire', 'Veille']
```

Filtrage côté client :
```ts
const filtered = fiches
  .filter(f => category === 'Toutes' || TYPE_TO_CATEGORY[f.type ?? ''] === category)
  .filter(f => !query || (f.title + f.content).toLowerCase().includes(query.toLowerCase()))
```

### Type labels & couleurs badges

```ts
const TYPE_META: Record<string, { label: string; bg: string; color: string }> = {
  objection:       { label: 'Objection',       bg: 'var(--danger-soft)',  color: 'var(--danger)'   },
  guide_situation: { label: 'Guide situation',  bg: 'var(--warning-soft)', color: 'var(--warning)'  },
  cas_client:      { label: 'Cas client',       bg: 'var(--success-soft)', color: 'var(--success)'  },
  concurrent:      { label: 'Concurrent',       bg: 'var(--accent-soft)',  color: 'var(--accent)'   },
  doc_certiplace:  { label: 'Produit',          bg: 'var(--primary-soft)', color: 'var(--primary)'  },
  veille:          { label: 'Veille',           bg: 'var(--surface-2)',    color: 'var(--text-muted)'},
}
```

### FicheCard — spec complète (UX-DR7)

```
┌─────────────────────────────────────────────┐
│ #a1b2c3de   ● Validée        [Cas client]   │  ← mono ID + dot badge + type chip
│ Titre de la fiche knowledge                 │  ← font-semibold 14px
│ Contenu de la fiche tronqué sur             │  ← text-muted 13px, -webkit-line-clamp: 3
│ exactement trois lignes...                  │
│                                             │
│ [████████████░░░░░░░░░░░░] 72%             │  ← barre 46px track
└─────────────────────────────────────────────┘
```

Hover : `transform: translateY(-1px)`, `box-shadow: var(--shadow-lg)`
Active : `border: 1.5px solid var(--primary)`, `box-shadow: 0 0 0 1px var(--primary)`
Transition : `all 0.12s ease`

Dot badge : `width: 7px; height: 7px; border-radius: 50%`
- published → `background: var(--success)` + label "Validée"
- draft → `background: var(--warning)` + label "À valider"

### Barre de confiance — 46px track

```tsx
function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 85 ? 'var(--success)' : pct >= 70 ? 'var(--warning)' : 'var(--danger)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{ width: 46, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
      <span className="mono" style={{ fontSize: 11, color, fontWeight: 600 }}>{pct}%</span>
    </div>
  )
}
```

Note : la ValidationCard dans la page imports a une barre similaire en `flex: 1`. Ici la spec UX-DR7 précise un track de **46px fixe**.

### Toolbar layout

```
[🔍 Rechercher...        ]  [Toutes][Produit][Sales][Réglementaire][Veille]  [+ Nouvelle fiche]
```

- Input : `flex: 1`, max-width 340px, fond `var(--bg)`, border `var(--border)`
- Segmented control : boutons côte à côte, actif = fond `var(--primary)` + texte blanc, inactif = fond `var(--surface)` + border
- "Nouvelle fiche" : fond `var(--primary)`, blanc, pill border-radius, visible admin uniquement

### BlindspotPanel placeholder (Story 3.4)

Afficher un bloc minimal sous la grille :
```tsx
<div style={{
  borderLeft: '3px solid var(--primary)', borderRadius: 'var(--radius)',
  padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--border)',
  marginTop: 32
}}>
  <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
    ✦ Angles morts — disponible en Story 3.4
  </p>
</div>
```

### isAdmin pattern

Réutiliser exactement le pattern de la page imports :
```ts
const [isAdmin, setIsAdmin] = useState(false)
useEffect(() => {
  fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => {
    if (d?.role === 'admin') setIsAdmin(true)
  })
}, [])
```

### Règles CSS / Design System

- Toujours `var(--token)` — jamais couleur Tailwind inline
- Pas de dépendance npm nouvelle
- `react-hooks/set-state-in-effect` : tout setState dans un effet dans une fonction async interne
- `export const dynamic = 'force-dynamic'` sur la route GET

### Fichiers à créer/modifier

- `app/api/fiches/route.ts` (NEW — GET published fiches)
- `app/(dashboard)/fiches/page.tsx` (REPLACE placeholder — grille + toolbar + FicheCard)

### Contexte : page imports (pattern à réutiliser)

La page `app/(dashboard)/imports/page.tsx` est la meilleure référence :
- Pattern `isAdmin` via `/api/me`
- `useSearchParams` wrappé dans `Suspense` (déjà en place dans le layout)
- Polling via `refreshKey`
- Inline components (pas de fichiers séparés)
- Barre de confiance déjà implémentée dans `ValidationCard`

## Tasks

- [ ] 1. Créer `app/api/fiches/route.ts` — GET fiches published, sans embedding
- [ ] 2. Remplacer `app/(dashboard)/fiches/page.tsx` — toolbar + grille FicheCard + BlindspotPanel placeholder
- [ ] 3. `npm run lint` → 0 erreur

## File List

- `app/api/fiches/route.ts` (NEW)
- `app/(dashboard)/fiches/page.tsx` (REPLACE)

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes
_à remplir_
