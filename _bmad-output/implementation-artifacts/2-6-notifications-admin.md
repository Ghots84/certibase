---
baseline_commit: 634ce6b
---

# Story 2.6 : Notifications admin [Should]

Status: review

## Story

En tant qu'Alex (Admin) — ou tout utilisateur authentifié,
Je veux être notifié quand un import termine son traitement,
Afin de savoir sans rester sur la page quand les drafts sont prêts à valider.

## Acceptance Criteria

1. La cloche topbar affiche une pastille orange (dot 7px) uniquement quand il y a des notifications non vues
2. Le count non-vu est calculé à partir de localStorage (clé `cb_seen_notifs`) — pas de table DB
3. Cliquer sur la cloche ouvre un dropdown inline (200-280px) avec les imports terminés (ready/error) des 48 dernières heures
4. Chaque ligne du dropdown : icône type colorée + nom tronqué + badge statut + "N drafts" si ready
5. Cliquer sur une ligne navigue vers `/imports?selected=<id>` et ferme le dropdown
6. À l'ouverture du dropdown, toutes les notifications visibles sont marquées vues (localStorage) → pastille disparaît
7. Le topbar poll toutes les 30s via `GET /api/notifications`
8. La page `/imports` lit `?selected=<id>` au montage et initialise `selectedId` en conséquence

## Dev Notes

### Architecture des notifications

**Pas de table DB** — la source de vérité est la table `imports` existante. Le polling
appelle `GET /api/notifications` qui retourne les imports avec `status IN ('ready', 'error')`
des 48 dernières heures. Les notifications "vues" sont stockées dans localStorage comme un
Set de IDs : `cb_seen_notifs = JSON.stringify([...ids])`.

```
unseenCount = notifications.filter(n => !seenIds.has(n.id)).length
```

### Route GET /api/notifications

```ts
// app/api/notifications/route.ts
// Auth : tout utilisateur connecté
// Non-admin : filtre uploaded_by = user.id
// Admin : tous les imports
// WHERE status IN ('ready', 'error')
//   AND created_at > NOW() - interval '48 hours'
// ORDER BY created_at DESC
// LIMIT 20
export const dynamic = 'force-dynamic'
```

Réponse : tableau d'objets `Import` (mêmes champs que GET /api/imports).

### Topbar — implémentation

Le topbar est un **client component** (`'use client'`). Il utilise déjà `usePathname`.

État à ajouter :
```ts
const [notifs, setNotifs] = useState<Import[]>([])
const [open, setOpen] = useState(false)
const [seenIds, setSeenIds] = useState<Set<string>>(new Set())
```

Init depuis localStorage (côté client uniquement, dans useEffect) :
```ts
useEffect(() => {
  try {
    const raw = localStorage.getItem('cb_seen_notifs')
    if (raw) setSeenIds(new Set(JSON.parse(raw)))
  } catch {}
}, [])
```

Polling toutes les 30s :
```ts
useEffect(() => {
  async function poll() {
    const res = await fetch('/api/notifications')
    if (res.ok) setNotifs(await res.json())
  }
  poll()
  const id = setInterval(poll, 30_000)
  return () => clearInterval(id)
}, [])
```

Marquer tout comme vu (à l'ouverture du dropdown) :
```ts
function openDropdown() {
  setOpen(true)
  const allIds = notifs.map(n => n.id)
  const next = new Set([...seenIds, ...allIds])
  setSeenIds(next)
  localStorage.setItem('cb_seen_notifs', JSON.stringify([...next]))
}
```

unseenCount :
```ts
const unseenCount = notifs.filter(n => !seenIds.has(n.id)).length
```

Fermer le dropdown au clic extérieur : `useRef` sur le conteneur + event listener `mousedown`.

### Dropdown UI

```
┌──────────────────────────────┐
│  Notifications               │
│ ─────────────────────────── │
│ 🎵  Webinar produit Q2   ✅  │  ← ready, "4 fiches"
│     audio · il y a 2h        │
│ ─────────────────────────── │
│ 📄  Pricing.pdf          ❌  │  ← error
│     pdf · il y a 5h          │
│ ─────────────────────────── │
│   Voir tous les imports →    │  ← lien /imports
└──────────────────────────────┘
```

Style : `position: absolute; right: 0; top: calc(100% + 8px)` sur un wrapper `position: relative`.
Largeur : 280px. Fond `var(--surface)`. Ombre `0 4px 20px rgba(0,0,0,0.12)`.
Scrollable si > 5 items (`max-height: 360px; overflow-y: auto`).

Icônes types réutilisées depuis `@/components/icons` : `IconAudio`, `IconVideo`, `IconPdf`, `IconLink`.

### Import page — lecture du query param

Dans `app/(dashboard)/imports/page.tsx`, la page est un **client component**.
Ajouter `useSearchParams` de `next/navigation` pour lire `?selected=<id>` :

```ts
import { useSearchParams } from 'next/navigation'

// Dans le composant :
const searchParams = useSearchParams()
const [selectedId, setSelectedId] = useState<string | null>(
  searchParams.get('selected')
)
```

Ceci remplace `useState<string | null>(null)` existant. C'est le seul changement sur la page.

**Attention** : `useSearchParams()` nécessite que le composant soit wrappé dans un `Suspense`
côté layout. Vérifier que `app/(dashboard)/layout.tsx` (ou le parent) a bien un boundary.
Si non, wrapper la page dans un `<Suspense>` au niveau du composant racine.

### Pattern de navigation depuis le dropdown

```ts
import { useRouter } from 'next/navigation'

// Dans le handler du clic sur une notification :
router.push(`/imports?selected=${notif.id}`)
setOpen(false)
```

### Règles CSS / Design System

- Toujours `var(--token)` — jamais de couleur Tailwind inline
- Badge statut : réutiliser `STATUS_MAP` de la page imports (mais le topbar ne peut pas l'importer directement car il est dans `app/`) → redéfinir un mini-mapping local dans le composant topbar
- Icône type : fond coloré 28×28, même palette que `FILE_TYPE_META` dans la page imports

### Fichiers

- `app/api/notifications/route.ts` (NEW)
- `components/topbar.tsx` (MODIFY — polling + dropdown)
- `app/(dashboard)/imports/page.tsx` (MODIFY — useSearchParams pour `?selected=`)

### Contraintes importantes

- Ne PAS ajouter de dépendance npm (tout en vanilla React + fetch)
- Ne PAS créer de table Supabase pour cette story
- Le polling 30s utilise `setInterval` + cleanup dans `useEffect` (pas de lib de polling)
- ESLint `react-hooks/set-state-in-effect` : tout setState dans les effets doit être dans une fonction async interne, pas directement dans le corps de l'effet
- L'hydratation localStorage ne doit se faire que dans `useEffect` (pas au render server)
- Aucune feature flag, aucun fallback de compatibilité arrière

## Tasks

- [x] 1. Créer `GET /api/notifications/route.ts` — imports ready/error 48h, filtré par user sauf admin
- [x] 2. Modifier `components/topbar.tsx` — ajouter polling 30s, unseenCount, dropdown complet
- [x] 3. Modifier `app/(dashboard)/imports/page.tsx` — initialiser `selectedId` depuis `useSearchParams`
- [x] 4. Vérifier Suspense boundary pour useSearchParams (layout ou page)
- [x] 5. `npm run lint` → 0 erreur

## File List

- `app/api/notifications/route.ts` (NEW)
- `components/topbar.tsx` (MODIFY)
- `app/(dashboard)/imports/page.tsx` (MODIFY)

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes
- Story déjà implémentée dans une session précédente ; story file mise à jour pour refléter l'état réel du code
- `app/api/notifications/route.ts` : GET, auth user, filtre `status IN ('ready','error')` 48h, non-admin filtré par `uploaded_by`
- `components/topbar.tsx` : polling 30s, unseenCount via localStorage `cb_seen_notifs`, dropdown 300px avec icônes type, badge statut, nav `/imports?selected=<id>`
- `app/(dashboard)/imports/page.tsx` : `useSearchParams()` + `useState(searchParams.get('selected'))` pour `selectedId`
- `app/(dashboard)/layout.tsx` : `<Suspense>{children}</Suspense>` déjà en place
- `npm run lint` → 0 erreur
