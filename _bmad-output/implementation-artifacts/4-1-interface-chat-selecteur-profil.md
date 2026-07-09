---
baseline_commit: 64999ba
---

# Story 4.1 : Interface chat & sÃ©lecteur de profil

Status: done

## Story

En tant que membre de l'Ã©quipe,
Je veux accÃ©der Ã  une interface de chat adaptÃ©e Ã  mon rÃ´le avec des suggestions contextuelles,
Afin de commencer Ã  interroger la base immÃ©diatement.

## Acceptance Criteria

1. Header affiche H1 "Assistant CertiBase" + sous-titre colorÃ© avec la couleur du profil actif (ex : "Mode CSM" en #2D7DD2)
2. ProfilePicker : 4 boutons uniquement â€” CSM #2D7DD2 / Sales #E8651E / Ops #1F8A5B / Admin #7A5AF8 (le profil "all/Tous" est supprimÃ©)
3. Empty state : icÃ´ne bot sur fond colorÃ© avec la couleur du profil, "Bonjour \<prÃ©nom\> ðŸ‘‹", 3 suggestions chips propres au profil actif
4. Changer de profil â†’ rÃ©initialise la conversation + met Ã  jour suggestions + met Ã  jour couleurs (icon, header sous-titre)
5. Cliquer une suggestion â†’ envoie le message automatiquement (pas seulement pre-fill)
6. Le prÃ©nom est rÃ©cupÃ©rÃ© depuis `/api/me` (`full_name`, premiÃ¨re partie avant l'espace)

## Dev Notes

### Architecture â€” fichier unique Ã  modifier

**Seul fichier modifiÃ© :** `app/(dashboard)/assistant/page.tsx`

La page chat est dÃ©jÃ  complÃ¨te et fonctionnelle (SSE streaming, bubbles, sources, copy). Cette story est **purement frontend** â€” aucune nouvelle route API, aucune migration.

---

### Analyse du fichier existant

**Ã‰tat actuel de `app/(dashboard)/assistant/page.tsx` :**

```ts
const PROFILS = [
  { value: 'csm',   label: 'CSM',   color: '#2D7DD2' },
  { value: 'sales', label: 'Sales', color: '#E8651E' },
  { value: 'ops',   label: 'Ops',   color: '#7A5AF8' },  // â† MAUVAISE couleur
  { value: 'admin', label: 'Admin', color: '#1F8A5B' },  // â† MAUVAISE couleur
  { value: 'all',   label: 'Tous',  color: '#5B6675' },  // â† Ã€ SUPPRIMER
]
```

Couleurs correctes selon l'epic :
- CSM â†’ #2D7DD2 âœ…
- Sales â†’ #E8651E âœ…
- Ops â†’ **#1F8A5B** âŒ (actuellement #7A5AF8)
- Admin â†’ **#7A5AF8** âŒ (actuellement #1F8A5B)
- "all/Tous" â†’ **Ã  supprimer** (l'epic ne le mentionne pas)

**Suggestions actuelles** : hardcodÃ©es, non per-profil, click = pre-fill seulement.

**Empty state actuel** : icÃ´ne chat bubble, fond `var(--primary-soft)`, texte fixe "Comment puis-je vous aider ?", pas de salutation personnalisÃ©e.

**Header sous-titre** : fixe "RÃ©ponses basÃ©es sur les fiches de connaissance indexÃ©es" â€” pas colorÃ© per-profil.

**Changement de profil** : pas de reset de conversation.

---

### Modifications Ã  apporter

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

**Profil par dÃ©faut** : dÃ©tecter depuis `/api/me` (rÃ´le de l'utilisateur). Si le rÃ´le est 'new' ou non mappÃ© â†’ dÃ©faut 'csm'. Si admin â†’ dÃ©faut 'admin'.

#### 2. Suggestions per-profil

Remplacer la constante `SUGGESTIONS` par un Record par profil :

```ts
const PROFIL_SUGGESTIONS: Record<Profil, { icon: string; text: string }[]> = {
  csm: [
    { icon: 'âš™ï¸', text: "Comment configurer l'espace candidat ?" },
    { icon: 'ðŸ“‹', text: 'Quelles sont les Ã©tapes du parcours de certification ?' },
    { icon: 'ðŸ”„', text: 'Comment gÃ©rer un dossier en attente de validation ?' },
  ],
  sales: [
    { icon: 'ðŸ’°', text: "Comment gÃ©rer l'objection sur le prix ?" },
    { icon: 'ðŸ†', text: 'Quelles sont les diffÃ©rences Standard / Premium ?' },
    { icon: 'ðŸ¤', text: 'Quels arguments face Ã  un concurrent ?' },
  ],
  ops: [
    { icon: 'ðŸ“Š', text: 'Quels sont les indicateurs de suivi Ã  surveiller ?' },
    { icon: 'ðŸ”§', text: 'Comment rÃ©soudre un problÃ¨me technique courant ?' },
    { icon: 'ðŸ“', text: 'Quelles sont les procÃ©dures de validation interne ?' },
  ],
  admin: [
    { icon: 'ðŸ‘¥', text: 'Comment gÃ©rer les accÃ¨s utilisateurs ?' },
    { icon: 'ðŸ“ˆ', text: "Quel est l'Ã©tat de la base de connaissance ?" },
    { icon: 'ðŸ”', text: 'Quelles fiches sont en attente de validation ?' },
  ],
}
```

#### 3. RÃ©cupÃ©rer le prÃ©nom depuis `/api/me`

Ajouter un state `firstName` et un useEffect de chargement au montage :

```ts
const [firstName, setFirstName] = useState<string>('')
const [profil, setProfil] = useState<Profil>('csm') // dÃ©faut avant chargement

useEffect(() => {
  async function loadUser() {
    const res = await fetch('/api/me')
    if (res.ok) {
      const me = await res.json()
      // Extraire le prÃ©nom : premiÃ¨re partie de full_name
      const name = (me.full_name ?? '').split(' ')[0] || me.email?.split('@')[0] || ''
      setFirstName(name)
      // Mapper le rÃ´le au profil par dÃ©faut
      const roleToProfile: Record<string, Profil> = {
        admin: 'admin', csm: 'csm', sales: 'sales', new: 'csm',
      }
      setProfil(roleToProfile[me.role] ?? 'csm')
    }
  }
  loadUser()
}, [])
```

**Important** : `react-hooks/set-state-in-effect` â†’ tout setState dans la fonction `loadUser()` interne. âœ… Ce pattern est dÃ©jÃ  correct ci-dessus.

#### 4. Header sous-titre colorÃ©

Remplacer le sous-titre fixe par le profil actif colorÃ© :

```tsx
<p className="text-[12.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
  Mode{' '}
  <span style={{ color: activeProfil.color, fontWeight: 600 }}>
    {activeProfil.label}
  </span>
  {' '}Â· questions sur les offres, objections et cas clients
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

#### 6. Empty state avec icÃ´ne bot colorÃ©e + "Bonjour prÃ©nom ðŸ‘‹"

```tsx
{messages.length === 0 && (
  <div className="flex flex-col items-center gap-4 pt-16 pb-8 text-center">
    {/* IcÃ´ne bot sur fond couleur du profil */}
    <div
      className="flex items-center justify-center rounded-2xl"
      style={{
        width: 64, height: 64,
        background: activeProfil.color + '20', // 12% opacitÃ©
        color: activeProfil.color,
      }}
    >
      <IconBot size={30} />  {/* voir ci-dessous â€” ajouter prop size */}
    </div>

    <div>
      <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text)' }}>
        {firstName ? `Bonjour ${firstName} ðŸ‘‹` : 'Bonjour ðŸ‘‹'}
      </p>
      <p className="text-[13px] max-w-[380px]" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Profil actif :{' '}
        <span className="font-semibold" style={{ color: activeProfil.color }}>
          {activeProfil.label}
        </span>
        {' '}Â· posez votre question ou choisissez une suggestion.
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

Ajouter `sendSuggestion` qui prÃ©-remplit et envoie immÃ©diatement :

```ts
const sendSuggestion = useCallback((text: string) => {
  setInput(text)
  // DÃ©clencher sendMessage avec le texte directement
  // (sendMessage lit `input` via closure â€” utiliser version avec paramÃ¨tre)
}, [])
```

**ProblÃ¨me** : `sendMessage` lit `input` depuis la closure. Pour Ã©viter le doublon de logique, refactoriser `sendMessage` pour accepter un `text` optionnel :

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

### Couleur avec opacitÃ© hex

Pour `background: activeProfil.color + '20'` (12% opacitÃ©) :
- `#2D7DD220` = CSM bleu
- `#E8651E20` = Sales orange
- `#1F8A5B20` = Ops vert
- `#7A5AF820` = Admin violet

Ce pattern est plus simple que `rgba()` et fonctionne avec les hex colors fixes. âœ…

---

### RÃ¨gles Ã  respecter (carryover)

- `var(--token)` CSS uniquement pour les variables design system â€” mais les couleurs profil (#hex) sont des constantes figÃ©es, ok en inline
- `react-hooks/set-state-in-effect` : setState dans `async function loadUser()` interne au useEffect âœ…
- Ne jamais supprimer les autres fonctionnalitÃ©s existantes (bubbles, sources, copy, streaming SSE)
- Le `PROFILS` avec 'all' est actuellement utilisÃ© comme valeur par dÃ©faut de `profil` state et dans le body de la requÃªte `/api/rag`. La suppression de 'all' implique : changer le type `Profil`, changer la valeur par dÃ©faut du state (â†’ 'csm'), et le handler `/api/rag` gÃ¨re dÃ©jÃ  `profil ?? 'all'` en fallback cÃ´tÃ© serveur
- Ne pas casser `sendMessage` pour les utilisateurs qui tapent manuellement (le paramÃ¨tre `overrideText` est optionnel)

---

### Ce qui NE change pas (Ã  prÃ©server)

- Tout le systÃ¨me SSE streaming (reader, buffer, events text/sources/done/error) â€” NE PAS TOUCHER
- `UserBubble`, `AssistantBubble`, `SourceChip`, `CopyButton` â€” NE PAS TOUCHER
- L'input textarea auto-resize â€” NE PAS TOUCHER  
- Le bouton "â†º RÃ©initialiser" existant â€” NE PAS TOUCHER (bonus: il reset dÃ©jÃ  messages)
- La prop `profil` passÃ©e Ã  `/api/rag` â€” NE PAS TOUCHER
- Les styles `.prose-certibase` â€” NE PAS TOUCHER

---

## Tasks

- [x] 1. Corriger `PROFILS` : couleurs Ops/Admin (swap), supprimer 'all' ; mettre Ã  jour le type `Profil`
- [x] 2. Ajouter state `firstName` + useEffect pour charger `/api/me` + set profil par dÃ©faut selon le rÃ´le
- [x] 3. Remplacer `SUGGESTIONS` par `PROFIL_SUGGESTIONS` (Record par profil, 3 suggestions chacun)
- [x] 4. Mettre Ã  jour le header : sous-titre colorÃ© avec couleur du profil actif
- [x] 5. Ajouter `handleProfilChange` : reset messages + setProfil
- [x] 6. Refactoriser `sendMessage(overrideText?)` + ajouter `sendSuggestion` (auto-send)
- [x] 7. Mettre Ã  jour l'empty state : icÃ´ne bot colorÃ©e, "Bonjour prÃ©nom ðŸ‘‹", suggestions per-profil avec auto-send
- [x] 8. Ajouter prop `size` Ã  `IconBot`
- [x] 9. `npm run lint` â†’ 0 erreur

## File List

- `app/(dashboard)/assistant/page.tsx` (MODIFY)

## Dev Agent Record

### Completion Notes
- `PROFILS` : suppression de 'all', swap couleurs Ops (#1F8A5B) â†” Admin (#7A5AF8) ; type `Profil` sans 'all'
- `PROFIL_SUGGESTIONS` : Record<Profil, ...> avec 3 suggestions par profil (csm/sales/ops/admin)
- `IconBot` : prop `size?: number` (dÃ©faut 16), utilisÃ©e Ã  30px dans l'empty state
- `loadUser` useEffect : charge `/api/me`, extrait prÃ©nom (split ' ')[0], mappe role â†’ profil par dÃ©faut
- Header sous-titre : "Mode <Profil colorÃ©> Â· questionsâ€¦" avec `activeProfil.color`
- `handleProfilChange` : `setProfil(p); setMessages([])` â†’ reset conversation au changement de profil
- `sendMessage(overrideText?)` : utilise `(overrideText ?? input).trim()` pour supporter l'auto-send
- `sendSuggestion(text)` : useCallback â†’ appelle `sendMessage(text)` directement
- Empty state : fond `activeProfil.color + '20'` (12% opacitÃ©), salutation prÃ©nom, chips per-profil avec auto-send
- ProfilePicker : `onClick={() => handleProfilChange(p.value)}` (reset conversation)
- `npm run lint` â†’ 0 erreur (1 warning pre-existing dans toast-provider.tsx)

