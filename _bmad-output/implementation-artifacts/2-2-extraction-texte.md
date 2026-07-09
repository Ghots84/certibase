---
baseline_commit: 8dfcc17
---

# Story 2.2 : Extraction texte (Whisper + Claude natif)

Status: done

## Story

En tant qu'Alex (Admin),
Je veux que le texte soit automatiquement extrait de mes fichiers sans intervention manuelle,
Afin d'avoir du contenu brut prÃªt pour l'analyse IA.

## Acceptance Criteria

1. Un import `audio`/`video` en `status = pending` â†’ Whisper API transcrit le fichier â†’ `transcription` sauvegardÃ©e, `status = analyzing`
2. Un import `pdf` en `status = pending` â†’ Claude API lit le document nativement (base64) â†’ `transcription` sauvegardÃ©e, `status = analyzing`
3. Un import `url` YouTube en `status = pending` â†’ sous-titres rÃ©cupÃ©rÃ©s â†’ `transcription` sauvegardÃ©e, `status = analyzing`
4. Une erreur d'extraction â†’ `status = error`, `error_message` explicite
5. Relancer un import en erreur est idempotent (Ã©crase la transcription prÃ©cÃ©dente, pas de doublon)
6. Le pipeline se dÃ©clenche automatiquement aprÃ¨s chaque upload (Story 2.1)
7. La liste des imports affiche un bouton "Relancer" pour les imports en `status = error`

## Tasks / Subtasks

- [x] Task 1 â€” Route pipeline `POST /api/imports/[id]/process`
  - [x] VÃ©rification admin + import existe
  - [x] Transitions de statut : `pending â†’ extracting â†’ analyzing` (ou `error`)
  - [x] Idempotence : Ã©crase `transcription` si re-run

- [x] Task 2 â€” Extraction audio/vidÃ©o via Whisper
  - [x] TÃ©lÃ©charger le fichier depuis Supabase Storage (`admin.storage.download`)
  - [x] Envoyer Ã  `openai.audio.transcriptions.create` (model: `whisper-1`, language: `fr`)
  - [x] Sauvegarder dans `imports.transcription`

- [x] Task 3 â€” Extraction PDF/PPTX via Claude API
  - [x] TÃ©lÃ©charger le fichier depuis Supabase Storage
  - [x] Encoder en base64
  - [x] Appel Claude avec `type: 'document'` (lecture native)
  - [x] Sauvegarder dans `imports.transcription`

- [x] Task 4 â€” Extraction URL YouTube
  - [x] Extraire le `videoId` depuis l'URL
  - [x] Appel YouTube timedtext API (`youtube.com/api/timedtext`)
  - [x] Parser le XML â†’ texte brut
  - [x] Fallback gracieux si pas de sous-titres disponibles

- [x] Task 5 â€” Auto-trigger depuis les routes d'upload
  - [x] Modifier `app/api/imports/upload/route.ts` â€” appel fire-and-forget aprÃ¨s crÃ©ation
  - [x] Modifier `app/api/imports/url/route.ts` â€” appel fire-and-forget aprÃ¨s crÃ©ation

- [x] Task 6 â€” Bouton "Relancer" dans la vue imports
  - [x] Afficher le bouton uniquement sur les imports en `status = error`
  - [x] Appel `POST /api/imports/[id]/process`
  - [x] Toast + refresh de la liste

## Dev Notes

### Architecture pipeline
Route `POST /api/imports/[id]/process` â€” server-side uniquement, appelÃ©e en fire-and-forget depuis les routes upload. Ne pas bloquer la rÃ©ponse upload sur le pipeline.

### Fire-and-forget depuis les routes upload
```ts
const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
fetch(`${baseUrl}/api/imports/${record.id}/process`, { method: 'POST' }).catch(() => {})
```
Le pipeline tourne en arriÃ¨re-plan. Pas d'await â€” la rÃ©ponse upload retourne immÃ©diatement.

### Whisper API (openai SDK existant)
```ts
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
// TÃ©lÃ©charger depuis Storage â†’ Blob â†’ File
const transcription = await openai.audio.transcriptions.create({
  file: new File([blob], originalName, { type: 'audio/mpeg' }),
  model: 'whisper-1',
  language: 'fr',
  response_format: 'text',
})
```

### Claude document API (PDF/PPTX)
Le SDK Anthropic supporte les documents base64 avec `type: 'document'`.
```ts
const base64 = Buffer.from(await blob.arrayBuffer()).toString('base64')
const res = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 4096,
  messages: [{
    role: 'user',
    content: [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
      { type: 'text', text: 'Extrait tout le texte de ce document, structure et contenu complets.' }
    ]
  }]
})
```
Pour les PPTX : utiliser `media_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'` ou simplement `application/pdf` si Claude le gÃ¨re (Ã  tester â€” fallback: traiter comme octet-stream et demander Ã  Claude d'extraire le texte visible).

### YouTube timedtext
URL d'extraction : `https://www.youtube.com/api/timedtext?v={videoId}&lang=fr`
RÃ©ponse en XML, format `<text start="..." dur="...">contenu</text>`.
Si pas de sous-titres FR â†’ essayer `lang=en`, puis fallback error.

### Conventions
- Authentification : `createClient()` + `createAdminClient()` (pattern existant)
- Variables env : `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` (dÃ©jÃ  utilisÃ©es dans `/api/rag`)
- Nouvelle var : `NEXT_PUBLIC_APP_URL` pour l'auto-trigger

## File List

- `app/api/imports/[id]/process/route.ts` (NEW)
- `app/api/imports/upload/route.ts` (MODIFIED â€” auto-trigger)
- `app/api/imports/url/route.ts` (MODIFIED â€” auto-trigger)
- `app/(dashboard)/imports/page.tsx` (MODIFIED â€” bouton Relancer)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes

- Route `POST /api/imports/[id]/process` crÃ©Ã©e â€” dispatche selon `file_type` (audio/video â†’ Whisper, pdf â†’ Claude document API, url â†’ YouTube timedtext)
- Auth dual : session cookie (appels manuels admin) OU header `x-internal-pipeline` (fire-and-forget interne)
- Auto-trigger depuis `upload` et `url` routes (fire-and-forget, pas d'await)
- Polling automatique cÃ´tÃ© client (toutes les 3s tant qu'un import est en `extracting`/`analyzing`)
- Bouton "Relancer" affichÃ© uniquement sur les imports `status = error`, avec Ã©tat dÃ©sactivÃ© pendant le retry
- Idempotence : re-run Ã©crase `transcription` et repart de `extracting`
- Build Next.js propre â€” 0 erreur TypeScript/ESLint

