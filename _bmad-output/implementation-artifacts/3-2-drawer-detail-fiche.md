---
baseline_commit: baa8a54
---

# Story 3.2 : Drawer de détail d'une fiche

Status: done

## Story

En tant que membre de l'équipe,
Je veux ouvrir une fiche et voir tous ses détails dans un panneau latéral,
Afin d'obtenir le contexte complet sans quitter la liste.

## Acceptance Criteria

1. Cliquer sur une FicheCard ouvre un drawer 392px depuis la droite (animation slide-in 0.28s)
2. La card sélectionnée a une bordure primary + ring 1px (déjà implémenté en 3.1, à conserver)
3. La grille passe de `minmax(270px, 1fr)` à `minmax(240px, 1fr)` quand le drawer est ouvert
4. Le drawer contient (UX-DR8) : header (ID mono + titre 19px + bouton fermer) ; badges (statut, catégorie, confiance) ; corps scrollable (résumé/contenu, Points clés, Source, Profil cible, Exposée aux agents) ; footer (Dupliquer + Valider/Modifier selon statut+rôle)
5. Cliquer fermer ou une autre card ferme/change le drawer
6. "Exposée aux agents" : si `status = published` → badges "CSM Digital" + "Sales Digital" ; sinon → message warning orange

## Dev Notes

### Où modifier le code

**Un seul fichier à modifier** : `app/(dashboard)/fiches/page.tsx`

La page 3.1 a déjà tous les patterns nécessaires. Le drawer est un composant inline `FicheDrawer` ajouté dans le même fichier, exactement comme `ImportPanel` dans la page imports. Ne pas créer de fichier séparé.

**Un fichier CSS à modifier** : `app/globals.css` — ajouter le keyframe `cbslide`.

### Keyframe cbslide à ajouter dans globals.css

```css
@keyframes cbslide {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
```

L'ajouter après `@keyframes cbprogress` (ligne ~93 dans globals.css).

### Layout avec drawer (modification du return de FichesPage)

Quand `activeId !== null`, le layout passe en flex row :

```tsx
<div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
  {/* Zone grille + blindspot */}
  <div style={{ flex: 1, minWidth: 0 }}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(${activeId ? '240px' : '270px'}, 1fr))`,
      gap: 14,
      transition: 'grid-template-columns 0.2s ease',
    }}>
      {/* FicheCard components */}
    </div>
    <BlindspotPlaceholder />
  </div>

  {/* Drawer latéral */}
  {activeFiche && (
    <FicheDrawer
      fiche={activeFiche}
      isAdmin={isAdmin}
      onClose={() => setActiveId(null)}
    />
  )}
</div>
```

`activeFiche` = `fiches.find(f => f.id === activeId) ?? null`

### Composant FicheDrawer — spec complète (UX-DR8)

```
┌─────────────────────────────────────────────┐  ← 392px, sticky, max-height calc(100vh-130px)
│ #a1b2c3de                              [✕]  │  ← header
│ Titre de la fiche complet               19px│
│ ─────────────────────────────────────────── │
│ ● Validée   [Cas client]   ████ 78%         │  ← badges + confiance
│ ─────────────────────────────────────────── │  ← corps scrollable
│ Contenu complet de la fiche...              │
│                                             │
│ ✓ Points clés (si lignes "-" détectées)    │
│   ✓ Point 1                                │
│   ✓ Point 2                                │
│                                             │
│ Source                                      │
│ 📄 Webinar · 12 mai 2026                   │
│                                             │
│ Profil cible                               │
│ [Tous les profils]                          │
│                                             │
│ Exposée aux agents                          │
│ [CSM Digital] [Sales Digital]               │
│   ← ou ⚠ "Non exposée — fiche non validée" │
│ ─────────────────────────────────────────── │
│ [Dupliquer]              [Valider / Modifier]│  ← footer admin
└─────────────────────────────────────────────┘
```

Style du drawer :
```ts
{
  width: 392,
  flexShrink: 0,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  maxHeight: 'calc(100vh - 130px)',
  position: 'sticky',
  top: 16,
  animation: 'cbslide 0.28s ease',
}
```

### Parsing "Points clés"

Le champ `content` est du texte libre généré par Claude. Tenter de détecter des listes :

```ts
function parseContent(content: string): { summary: string; bullets: string[] } {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
  const bullets = lines.filter(l => l.startsWith('- ') || l.startsWith('• ')).map(l => l.replace(/^[-•]\s+/, ''))
  const textLines = lines.filter(l => !l.startsWith('- ') && !l.startsWith('• '))
  return {
    summary: textLines.join(' ').slice(0, 400),
    bullets,
  }
}
```

Si `bullets.length === 0`, ne pas afficher la section "Points clés".

### Source labels

```ts
const SOURCE_LABEL: Record<string, string> = {
  manual:       'Création manuelle',
  webinar:      'Webinar',
  presentation: 'Présentation',
  sales_call:   'Appel commercial',
  doc:          'Document',
  n8n:          'Veille auto',
}

const SOURCE_ICON: Record<string, string> = {
  manual:       '✏️',
  webinar:      '🎥',
  presentation: '📊',
  sales_call:   '📞',
  doc:          '📄',
  n8n:          '🤖',
}
```

### Profil cible labels

```ts
const PROFIL_LABEL: Record<string, string> = {
  all:      'Tous les profils',
  csm:      'CSM',
  sales:    'Sales',
  new:      'Nouveau',
  csm_sales:'CSM + Sales',
}
```

### Footer — logique admin/statut

- **Dupliquer** : visible tous → toast `window.cbToast('Duplication — disponible en Story 3.3')`
- **Valider** : `isAdmin && fiche.status === 'draft'` → toast `window.cbToast('Validation — disponible en Story 3.3')`
- **Modifier** : `isAdmin && fiche.status === 'published'` → toast `window.cbToast('Édition — disponible en Story 3.3')`

(L'implémentation réelle de ces actions est en Story 3.3 — ici on pose les boutons avec des toasts placeholder.)

### Variables à ajouter dans FichesPage

```ts
const activeFiche = fiches.find(f => f.id === activeId) ?? null
```

(Pas de nouveau state nécessaire — `activeId` existe déjà depuis Story 3.1.)

### Règles CSS / Design System

- Toujours `var(--token)` — jamais couleur Tailwind inline
- Animation `cbslide` définie dans globals.css avant usage
- `react-hooks/set-state-in-effect` : setState uniquement dans des fonctions async internes
- Ne pas recréer `ConfidenceBar` — elle existe déjà dans la page, la réutiliser directement

### Fichiers à modifier

- `app/(dashboard)/fiches/page.tsx` (MODIFY — ajouter FicheDrawer + ajuster layout)
- `app/globals.css` (MODIFY — ajouter @keyframes cbslide)

## Tasks

- [ ] 1. Ajouter `@keyframes cbslide` dans `app/globals.css`
- [ ] 2. Ajouter le composant `FicheDrawer` inline dans `app/(dashboard)/fiches/page.tsx`
- [ ] 3. Modifier le layout de `FichesPage` : flex row quand drawer ouvert, grid minmax adaptatif
- [ ] 4. `npm run lint` → 0 erreur

## File List

- `app/(dashboard)/fiches/page.tsx` (MODIFY)
- `app/globals.css` (MODIFY)

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes
_à remplir_
