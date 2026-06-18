---
baseline_commit: 64999ba
---

# Story 4.1 : Interface chat & sélecteur de profil

Status: review

## Story

En tant que membre de l'équipe,
Je veux accéder à une interface de chat adaptée à mon rôle avec des suggestions contextuelles,
Afin de commencer à interroger la base immédiatement.

## Acceptance Criteria

1. Header affiche H1 "Assistant CertiBase" + sous-titre coloré avec la couleur du profil actif (ex : "Mode CSM" en #2D7DD2)
2. ProfilePicker : 4 boutons uniquement — CSM #2D7DD2 / Sales #E8651E / Ops #1F8A5B / Admin #7A5AF8 (le profil "all/Tous" est supprimé)
3. Empty state : icône bot sur fond coloré avec la couleur du profil, "Bonjour \<prénom\> 👋", 3 suggestions chips propres au profil actif
4. Changer de profil → réinitialise la conversation + met à jour suggestions + met à jour couleurs (icon, header sous-titre)
5. Cliquer une suggestion → envoie le message automatiquement (pas seulement pre-fill)
6. Le prénom est récupéré depuis `/api/me` (`full_name`, première partie avant l'espace)

## Dev Notes

### Architecture — fichier unique à modifier

**Seul fichier modifié :** `app/(dashboard)/assistant/page.tsx`

La page chat est déjà complète et fonctionnelle (SSE streaming, bubbles, sources, copy). Cette story est **purement frontend** — aucune nouvelle route API, aucune migration.

---

### Analyse du fichier existant

**État actuel de `app/(dashboard)/assistant/page.tsx` :**

```ts
const PROFILS = [
  { value: 'csm',   label: 'CSM',   color: '#2D7DD2' },
  { value: 'sales', label: 'Sales', color: '#E8651E' },
  { value: 'ops',   label: 'Ops',   color: '#7A5AF8' },  // ← MAUVAISE couleur
  { value: 'admin', label: 'Admin', color: '#1F8A5B' },  // ← MAUVAISE couleur
  { value: 'all',   label: 'Tous',  color: '#5B6675' },  // ← À SUPPRIMER
]
```

Couleurs correctes selon l'epic :
- CSM → #2D7DD2 ✅
- Sales → #E8651E ✅
- Ops → **#1F8A5B** ❌ (actuellement #7A5AF8)
- Admin → **#7A5AF8** ❌ (actuellement #1F8A5B)
- "all/Tous" → **à supprimer** (l'epic ne le mentionne pas)

**Suggestions actuelles** : hardcodées, non per-profil, click = pre-fill seulement.

**Empty state actuel** : icône chat bubble, fond `var(--primary-soft)`, texte fixe "Comment puis-je vous aider ?", pas de salutation personnalisée.

**Header sous-titre** : fixe "Réponses basées sur les fiches de connaissance indexées" — pas coloré per-profil.

**Changement de profil** : pas de reset de conversation.

---

### Modifications à apporter

#### 1. Corriger PROFILS (supprimer "all", corriger les couleurs)

```ts
const PROFILS: { value: Profil; label: string; color: string }[] = [
  { value: 'csm',   label: 'CSM',   color: '#2D7DD2' },
  { value: 'sales', label: 'Sales', color: '#E8651E' },
  { value: 'ops',   label: 'Ops',   color: '#1F8A5B' },
  { value: 'admin', label: 'Admin', color: '#7A5AF8' },
]

type Profil = 'csm' | 'sales' | 'ops' | 'admin'
```

**Profil par défaut** : détecter depuis `/api/me` (rôle de l'utilisateur). Si le rôle est 'new' ou non mappé → défaut 'csm'. Si admin → défaut 'admin'.

#### 2. Suggestions per-profil

Remplacer la constante `SUGGESTIONS` par un Record par profil :

```ts
const PROFIL_SUGGESTIONS: Record<Profil, { icon: string; text: string }[]> = {
  csm: [
    { icon: '⚙️', text: "Comment configurer l'espace candidat ?" },
    { icon: '📋', text: 'Quelles sont les étapes du parcours de certification ?' },
    { icon: '🔄', text: 'Comment gérer un dossier en attente de validation ?' },
  ],
  sales: [
    { icon: '💰', text: "Comment gérer l'objection sur le prix ?" },
    { icon: '🏆', text: 'Quelles sont les différences Standard / Premium ?' },
    { icon: '🤝', text: 'Quels arguments face à un concurrent ?' },
  ],
  ops: [
    { icon: '📊', text: 'Quels sont les indicateurs de suivi à surveiller ?' },
    { icon: '🔧', text: 'Comment résoudre un problème technique courant ?' },
    { icon: '📝', text: 'Quelles sont les procédures de validation interne ?' },
  ],
  admin: [
    { icon: '👥', text: 'Comment gérer les accès utilisateurs ?' },
    { icon: '📈', text: "Quel est l'état de la base de connaissance ?" },
    { icon: '🔍', text: 'Quelles fiches sont en attente de validation ?' },
  ],
}
```

#### 3. Récupérer le prénom depuis `/api/me`

Ajouter un state `firstName` et un useEffect de chargement au montage :

```ts
const [firstName, setFirstName] = useState<string>('')
const [profil, setProfil] = useState<Profil>('csm') // défaut avant chargement

useEffect(() => {
  async function loadUser() {
    const res = await fetch('/api/me')
    if (res.ok) {
      const me = await res.json()
      // Extraire le prénom : première partie de full_name
      const name = (me.full_name ?? '').split(' ')[0] || me.email?.split('@')[0] || ''
      setFirstName(name)
      // Mapper le rôle au profil par défaut
      const roleToProfile: Record<string, Profil> = {
        admin: 'admin', csm: 'csm', sales: 'sales', new: 'csm',
      }
      setProfil(roleToProfile[me.role] ?? 'csm')
    }
  }
  loadUser()
}, [])
```

**Important** : `react-hooks/set-state-in-effect` → tout setState dans la fonction `loadUser()` interne. ✅ Ce pattern est déjà correct ci-dessus.

#### 4. Header sous-titre coloré

Remplacer le sous-titre fixe par le profil actif coloré :

```tsx
<p className="text-[12.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
  Mode{' '}
  <span style={{ color: activeProfil.color, fontWeight: 600 }}>
    {activeProfil.label}
  </span>
  {' '}· questions sur les offres, objections et cas clients
</p>
```

#### 5. Reset conversation au changement de profil

Modifier le handler `setProfil` :

```tsx
function handleProfilChange(p: Profil) {
  setProfil(p)
  setMessages([])
}
```

Remplacer `onClick={() => setProfil(p.value)}` par `onClick={() => handleProfilChange(p.value)}`.

#### 6. Empty state avec icône bot colorée + "Bonjour prénom 👋"

```tsx
{messages.length === 0 && (
  <div className="flex flex-col items-center gap-4 pt-16 pb-8 text-center">
    {/* Icône bot sur fond couleur du profil */}
    <div
      className="flex items-center justify-center rounded-2xl"
      style={{
        width: 64, height: 64,
        background: activeProfil.color + '20', // 12% opacité
        color: activeProfil.color,
      }}
    >
      <IconBot size={30} />  {/* voir ci-dessous — ajouter prop size */}
    </div>

    <div>
      <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text)' }}>
        {firstName ? `Bonjour ${firstName} 👋` : 'Bonjour 👋'}
      </p>
      <p className="text-[13px] max-w-[380px]" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Profil actif :{' '}
        <span className="font-semibold" style={{ color: activeProfil.color }}>
          {activeProfil.label}
        </span>
        {' '}· posez votre question ou choisissez une suggestion.
      </p>
    </div>

    <div className="flex flex-wrap justify-center gap-2 mt-1">
      {PROFIL_SUGGESTIONS[profil].map(s => (
        <button
          key={s.text}
          onClick={() => sendSuggestion(s.text)}  {/* auto-send */}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12.5px] cb-shortcut"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span>{s.icon}</span>
          <span>{s.text}</span>
        </button>
      ))}
    </div>
  </div>
)}
```

#### 7. Auto-send des suggestions

Ajouter `sendSuggestion` qui pré-remplit et envoie immédiatement :

```ts
const sendSuggestion = useCallback((text: string) => {
  setInput(text)
  // Déclencher sendMessage avec le texte directement
  // (sendMessage lit `input` via closure — utiliser version avec paramètre)
}, [])
```

**Problème** : `sendMessage` lit `input` depuis la closure. Pour éviter le doublon de logique, refactoriser `sendMessage` pour accepter un `text` optionnel :

```ts
const sendMessage = useCallback(async (overrideText?: string) => {
  const question = (overrideText ?? input).trim()
  if (!question || loading) return
  // ... reste identique, utiliser `question` au lieu de `input`
  setInput('')  // vider le champ dans tous les cas
  resetInput()
  // ...
}, [input, loading, profil])

const sendSuggestion = useCallback((text: string) => {
  sendMessage(text)
}, [sendMessage])
```

#### 8. `IconBot` : ajouter prop `size`

```tsx
function IconBot({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" ...>
```

---

### Couleur avec opacité hex

Pour `background: activeProfil.color + '20'` (12% opacité) :
- `#2D7DD220` = CSM bleu
- `#E8651E20` = Sales orange
- `#1F8A5B20` = Ops vert
- `#7A5AF820` = Admin violet

Ce pattern est plus simple que `rgba()` et fonctionne avec les hex colors fixes. ✅

---

### Règles à respecter (carryover)

- `var(--token)` CSS uniquement pour les variables design system — mais les couleurs profil (#hex) sont des constantes figées, ok en inline
- `react-hooks/set-state-in-effect` : setState dans `async function loadUser()` interne au useEffect ✅
- Ne jamais supprimer les autres fonctionnalités existantes (bubbles, sources, copy, streaming SSE)
- Le `PROFILS` avec 'all' est actuellement utilisé comme valeur par défaut de `profil` state et dans le body de la requête `/api/rag`. La suppression de 'all' implique : changer le type `Profil`, changer la valeur par défaut du state (→ 'csm'), et le handler `/api/rag` gère déjà `profil ?? 'all'` en fallback côté serveur
- Ne pas casser `sendMessage` pour les utilisateurs qui tapent manuellement (le paramètre `overrideText` est optionnel)

---

### Ce qui NE change pas (à préserver)

- Tout le système SSE streaming (reader, buffer, events text/sources/done/error) — NE PAS TOUCHER
- `UserBubble`, `AssistantBubble`, `SourceChip`, `CopyButton` — NE PAS TOUCHER
- L'input textarea auto-resize — NE PAS TOUCHER  
- Le bouton "↺ Réinitialiser" existant — NE PAS TOUCHER (bonus: il reset déjà messages)
- La prop `profil` passée à `/api/rag` — NE PAS TOUCHER
- Les styles `.prose-certibase` — NE PAS TOUCHER

---

## Tasks

- [x] 1. Corriger `PROFILS` : couleurs Ops/Admin (swap), supprimer 'all' ; mettre à jour le type `Profil`
- [x] 2. Ajouter state `firstName` + useEffect pour charger `/api/me` + set profil par défaut selon le rôle
- [x] 3. Remplacer `SUGGESTIONS` par `PROFIL_SUGGESTIONS` (Record par profil, 3 suggestions chacun)
- [x] 4. Mettre à jour le header : sous-titre coloré avec couleur du profil actif
- [x] 5. Ajouter `handleProfilChange` : reset messages + setProfil
- [x] 6. Refactoriser `sendMessage(overrideText?)` + ajouter `sendSuggestion` (auto-send)
- [x] 7. Mettre à jour l'empty state : icône bot colorée, "Bonjour prénom 👋", suggestions per-profil avec auto-send
- [x] 8. Ajouter prop `size` à `IconBot`
- [x] 9. `npm run lint` → 0 erreur

## File List

- `app/(dashboard)/assistant/page.tsx` (MODIFY)

## Dev Agent Record

### Completion Notes
- `PROFILS` : suppression de 'all', swap couleurs Ops (#1F8A5B) ↔ Admin (#7A5AF8) ; type `Profil` sans 'all'
- `PROFIL_SUGGESTIONS` : Record<Profil, ...> avec 3 suggestions par profil (csm/sales/ops/admin)
- `IconBot` : prop `size?: number` (défaut 16), utilisée à 30px dans l'empty state
- `loadUser` useEffect : charge `/api/me`, extrait prénom (split ' ')[0], mappe role → profil par défaut
- Header sous-titre : "Mode <Profil coloré> · questions…" avec `activeProfil.color`
- `handleProfilChange` : `setProfil(p); setMessages([])` → reset conversation au changement de profil
- `sendMessage(overrideText?)` : utilise `(overrideText ?? input).trim()` pour supporter l'auto-send
- `sendSuggestion(text)` : useCallback → appelle `sendMessage(text)` directement
- Empty state : fond `activeProfil.color + '20'` (12% opacité), salutation prénom, chips per-profil avec auto-send
- ProfilePicker : `onClick={() => handleProfilChange(p.value)}` (reset conversation)
- `npm run lint` → 0 erreur (1 warning pre-existing dans toast-provider.tsx)
