---
baseline_commit: d929af4
---

# Story 4.4 : MÃ©moire conversationnelle

Status: done

## Story

En tant que membre de l'Ã©quipe,
Je veux que l'assistant se souvienne de mes conversations prÃ©cÃ©dentes,
Afin de ne pas perdre le contexte Ã  chaque rechargement de page.

## Acceptance Criteria

1. Au chargement de la vue Assistant, les 10 derniers messages de l'utilisateur sont rechargÃ©s depuis la DB (ordre chronologique ASC)
2. Chaque Ã©change (message user + rÃ©ponse assistant) est sauvegardÃ© en DB aprÃ¨s la fin du stream
3. Les messages de plus de 90 jours sont supprimÃ©s automatiquement lors du chargement
4. Le bouton "â†º RÃ©initialiser" vide l'historique local (comportement existant, sans impact sur la DB)

> **Note d'adaptation** : l'AC original prÃ©voyait des historiques sÃ©parÃ©s par profil â€” les profils ayant Ã©tÃ© supprimÃ©s (Story 4.1), l'historique est simplement per-user sans segmentation.

## Dev Notes

### Architecture â€” fichiers Ã  crÃ©er/modifier

| Fichier | Action |
|---|---|
| `supabase/migrations/011_chat_messages.sql` | NEW |
| `lib/supabase/types.ts` | MODIFY â€” ajouter `ChatMessage` |
| `app/api/chat/messages/route.ts` | NEW â€” GET + POST |
| `app/(dashboard)/assistant/page.tsx` | MODIFY â€” load + save |

---

### Migration 011

```sql
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT        NOT NULL,
  sources     JSONB       DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages_own" ON public.chat_messages
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS chat_messages_user_created
  ON public.chat_messages(user_id, created_at DESC);
```

---

### Type `ChatMessage` (`lib/supabase/types.ts`)

```ts
export interface ChatMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  sources: Source[]
  created_at: string
}
```

`Source` est dÃ©jÃ  dÃ©fini dans `assistant/page.tsx` â€” ne pas importer depuis types.ts. Utiliser `unknown` ou `Record<string, unknown>[]` en DB, re-typer cÃ´tÃ© frontend.

---

### Route `GET /api/chat/messages`

```ts
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  // Purger les messages > 90 jours (fire-and-forget)
  supabase.from('chat_messages')
    .delete()
    .eq('user_id', user.id)
    .lt('created_at', new Date(Date.now() - 90 * 24 * 3_600_000).toISOString())
    .then()

  // Charger les 10 derniers messages, ordre chronologique
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, sources, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Remettre dans l'ordre chronologique (ASC) pour l'affichage chat
  return Response.json((data ?? []).reverse())
}
```

### Route `POST /api/chat/messages`

```ts
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const { role, content, sources } = await request.json()
  if (!role || !content) return Response.json({ error: 'role and content required' }, { status: 400 })

  const { error } = await supabase
    .from('chat_messages')
    .insert({ user_id: user.id, role, content, sources: sources ?? [] })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
```

**Note** : utiliser `createClient()` (user-scoped) â€” RLS gÃ¨re le filtrage par user_id automatiquement.

---

### Modifications `app/(dashboard)/assistant/page.tsx`

#### 1. Charger l'historique au montage

Ajouter un `useEffect` sÃ©parÃ© (aprÃ¨s celui de `loadUser`) :

```ts
useEffect(() => {
  async function loadHistory() {
    const res = await fetch('/api/chat/messages')
    if (!res.ok) return
    const msgs = await res.json() as Array<{
      id: string; role: 'user' | 'assistant'; content: string
      sources?: Source[]; created_at: string
    }>
    setMessages(msgs.map(m => ({
      id: m.id,
      role: m.role,
      text: m.content,
      sources: m.sources ?? [],
      loading: false,
    })))
  }
  loadHistory()
}, [])
```

#### 2. Sauvegarder aprÃ¨s le stream

Dans `sendMessage`, aprÃ¨s le `while (true)` loop, ajouter la sauvegarde fire-and-forget. Utiliser des variables locales pour capturer le texte et les sources finaux :

```ts
const sendMessage = useCallback(async (overrideText?: string) => {
  const question = (overrideText ?? input).trim()
  if (!question || loading) return

  // ... (code existant unchanged) ...

  let finalText = ''
  let finalSources: Source[] = []

  try {
    // ... fetch + reader setup ...

    for (const part of parts) {
      // ...
      if (event.type === 'text') {
        finalText += event.text
        setMessages(...)
      } else if (event.type === 'sources') {
        finalSources = event.sources
        setMessages(...)
      }
      // ...
    }

    // AprÃ¨s le while loop â€” sauvegarder (fire-and-forget)
    fetch('/api/chat/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user', content: question }),
    }).catch(() => {})
    fetch('/api/chat/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'assistant', content: finalText, sources: finalSources }),
    }).catch(() => {})

  } catch (err) { ... }
}, [input, loading])
```

Les `fetch` de sauvegarde sont fire-and-forget (`.catch(() => {})`) pour ne pas bloquer le stream.

---

### RÃ¨gles Ã  respecter

- `createClient()` (pas admin) pour les routes chat â€” RLS gÃ¨re le filtrage
- `export const dynamic = 'force-dynamic'` sur le GET
- setState dans `async function loadHistory()` â†’ pas directement dans le corps de l'effet
- Ne PAS await les fetch de sauvegarde dans `sendMessage` (ne pas bloquer l'UX)
- La purge 90j est fire-and-forget aussi (`.then()`)

## Tasks

- [x] 1. CrÃ©er `supabase/migrations/011_chat_messages.sql`
- [x] 2. Ajouter `ChatMessage` dans `lib/supabase/types.ts`
- [x] 3. CrÃ©er `app/api/chat/messages/route.ts` â€” GET (load 10 + purge 90j) + POST (save)
- [x] 4. Modifier `app/(dashboard)/assistant/page.tsx` â€” useEffect loadHistory au montage
- [x] 5. Modifier `app/(dashboard)/assistant/page.tsx` â€” sauvegarder user+bot dans sendMessage
- [x] 6. `npm run lint` â†’ 0 erreur

## File List

- `supabase/migrations/011_chat_messages.sql` (NEW)
- `lib/supabase/types.ts` (MODIFY)
- `app/api/chat/messages/route.ts` (NEW)
- `app/(dashboard)/assistant/page.tsx` (MODIFY)

## Dev Agent Record

### Completion Notes
- Migration 011 : table `chat_messages` (user_id, role, content, sources JSONB, created_at), RLS own-policy, index user_id+created_at DESC
- Type `ChatMessage` ajoutÃ© dans `lib/supabase/types.ts` (sources: Record<string,unknown>[])
- `GET /api/chat/messages` : purge fire-and-forget 90j, sÃ©lection last 10 DESC, .reverse() pour ordre ASC affichage
- `POST /api/chat/messages` : insert avec user_id depuis auth, role+content+sources
- `loadHistory` useEffect : charge les 10 derniers messages et hydrate `messages` state au montage
- `sendMessage` : `finalText`+`finalSources` accumulÃ©s pendant le stream, sauvegardÃ©s en fire-and-forget aprÃ¨s le while loop
- Profils supprimÃ©s â†’ historique per-user sans segmentation (AC3 original adaptÃ©)

