---
baseline_commit: 7ef3e57
---

# Story 4.3 : Génération de drafts & résumés

Status: ready-for-dev

## Story

En tant que membre de l'équipe,
Je veux que l'assistant mette en évidence les brouillons rédigés dans un bloc dédié,
Afin de les copier facilement sans avoir à sélectionner le texte manuellement.

## Acceptance Criteria

1. Quand Claude génère un brouillon (email, réponse, script), le contenu est affiché dans un bloc "✨ Brouillon de réponse" avec bordure gauche `var(--primary)`, corps en italique
2. Un bouton "Copier" dans le header du bloc copie uniquement le contenu du brouillon (sans le reste du message) et déclenche un toast "Brouillon copié"
3. Pendant le streaming, le texte s'affiche normalement (balises `<draft>` masquées) ; le bloc s'affiche après la fin du stream
4. Un seul fichier backend modifié (`app/api/rag/route.ts`) — ajout dans le system prompt pour que Claude entoure les brouillons avec `<draft>...</draft>`

## Dev Notes

### Architecture — fichiers à modifier

- `app/api/rag/route.ts` (MODIFY — system prompt)
- `app/(dashboard)/assistant/page.tsx` (MODIFY — DraftBlock + parsing)

---

### Modification 1 — System prompt (`app/api/rag/route.ts`)

Ajouter cette règle dans `systemPrompt` (avant la section `## Fiches de connaissance`) :

```
- Si l'utilisateur demande de rédiger un email, un brouillon, une réponse client ou un script, entoure UNIQUEMENT le contenu rédigé avec les balises <draft> et </draft>. Le reste de ta réponse (explication, contexte) reste en dehors des balises. Exemple : "Voici un brouillon :\n\n<draft>Objet : ...\n\nBonjour,\n...</draft>"
```

### Modification 2 — DraftBlock component (`app/(dashboard)/assistant/page.tsx`)

Ajouter le composant `DraftBlock` avant `AssistantBubble` :

```tsx
function DraftBlock({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderLeft: '3px solid var(--primary)',
      borderRadius: 'var(--radius)',
      padding: '12px 14px',
      margin: '8px 0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--primary)' }}>
          ✨ Brouillon de réponse
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(content)
            window.cbToast?.('Brouillon copié')
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          style={{
            padding: '3px 10px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: copied ? 'var(--success-soft)' : 'var(--surface)',
            color: copied ? 'var(--success)' : 'var(--text-faint)',
            fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
          }}
        >
          {copied ? '✓ Copié' : 'Copier'}
        </button>
      </div>
      <p style={{
        margin: 0, fontSize: 13.5, color: 'var(--text-muted)',
        fontStyle: 'italic', lineHeight: 1.65, whiteSpace: 'pre-wrap',
      }}>
        {content}
      </p>
    </div>
  )
}
```

### Modification 3 — parseDraftBlocks helper

Ajouter avant `AssistantBubble` :

```ts
function parseDraftBlocks(text: string): Array<{ type: 'text' | 'draft'; content: string }> {
  const parts: Array<{ type: 'text' | 'draft'; content: string }> = []
  const regex = /<draft>([\s\S]*?)<\/draft>/g
  let last = 0
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: 'text', content: text.slice(last, match.index) })
    parts.push({ type: 'draft', content: match[1].trim() })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) })
  return parts.length ? parts : [{ type: 'text', content: text }]
}
```

### Modification 4 — AssistantBubble rendering

Dans `AssistantBubble`, remplacer le bloc de rendu du contenu (actuellement deux states : loading dots / prose-certibase) :

```tsx
{msg.loading && !msg.text ? (
  /* Dots */
  <div className="flex gap-1 items-center py-0.5">
    {[0, 1, 2].map(i => (
      <span key={i} className="rounded-full" style={{
        width: 7, height: 7, background: 'var(--primary)', opacity: 0.5,
        animation: `cbbounce 1.2s ease-in-out ${i * 0.18}s infinite`,
      }} />
    ))}
  </div>
) : msg.loading ? (
  /* Streaming — strip draft tags pour un affichage propre */
  <div className="prose-certibase cb-cursor">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {msg.text.replace(/<\/?draft>/g, '')}
    </ReactMarkdown>
  </div>
) : (
  /* Terminé — parser les blocs draft */
  <div>
    {parseDraftBlocks(msg.text).map((part, i) =>
      part.type === 'draft'
        ? <DraftBlock key={i} content={part.content} />
        : <div key={i} className="prose-certibase">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.content}</ReactMarkdown>
          </div>
    )}
  </div>
)}
```

### Règles à respecter

- `var(--token)` CSS uniquement
- Ne pas toucher au SSE streaming (reader, buffer, events) — NE PAS MODIFIER
- Ne pas toucher aux SourceChips, CopyButton du message entier, UserBubble — NE PAS MODIFIER
- Le CopyButton existant reste (copie le texte brut intégral avec balises supprimées n'est pas nécessaire — le DraftBlock a son propre bouton)

## Tasks

- [ ] 1. Modifier `app/api/rag/route.ts` — ajouter règle `<draft>` dans le system prompt
- [ ] 2. Ajouter `parseDraftBlocks()` dans `app/(dashboard)/assistant/page.tsx`
- [ ] 3. Ajouter composant `DraftBlock` dans `app/(dashboard)/assistant/page.tsx`
- [ ] 4. Modifier `AssistantBubble` — rendu en 3 états (dots / streaming / terminé+draft parsing)
- [ ] 5. `npm run lint` → 0 erreur

## File List

- `app/api/rag/route.ts` (MODIFY)
- `app/(dashboard)/assistant/page.tsx` (MODIFY)

## Dev Agent Record

### Completion Notes
_à remplir_
