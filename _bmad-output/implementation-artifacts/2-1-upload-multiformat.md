---
baseline_commit: 0cc35b9
---

# Story 2.1 : Upload multi-format & stockage

Status: done

## Story

En tant qu'Alex (Admin),
Je veux dÃ©poser des fichiers audio, vidÃ©o, PDF, PPTX et des URLs YouTube/Zoom via une dropzone,
Afin d'initier l'ingestion de contenu dans la base de connaissance.

## Acceptance Criteria

1. La dropzone accepte les formats : mp3, m4a, wav (audio) ; mp4, mov (vidÃ©o) ; PDF ; PPTX
2. Les fichiers audio et vidÃ©o sont uploadÃ©s dans Supabase Storage (bucket `certibase-imports`)
3. Un record `imports` est crÃ©Ã© avec `status = pending`, le bon `file_type`, `import_type`, et `file_path` OU `file_url` renseignÃ©
4. Un PPTX est stockÃ© tel quel dans Supabase Storage avec `file_type = pdf` (l'extraction texte est dÃ©lÃ©guÃ©e Ã  Claude dans Story 2.2)
5. L'import apparaÃ®t immÃ©diatement dans la liste sous la dropzone avec le badge "En file"
6. En Ã©tat `dragOver`, la dropzone affiche une bordure orange et un fond `primary-soft`
7. Un format non supportÃ© dÃ©clenche un message d'erreur explicite â€” aucun record `imports` n'est crÃ©Ã©
8. La saisie d'une URL YouTube ou Zoom crÃ©e un record `imports` avec `file_type = url` et `file_url` renseignÃ©

## Tasks / Subtasks

- [x] Task 1 â€” Bucket Supabase Storage
  - [x] Documenter la crÃ©ation manuelle du bucket `certibase-imports` (public: false) depuis le dashboard Supabase
  - [x] Ajouter la policy RLS storage : INSERT/SELECT rÃ©servÃ©s aux `admin` via le service role

- [x] Task 2 â€” API route `POST /api/imports/upload`
  - [x] CrÃ©er `app/api/imports/upload/route.ts`
  - [x] Valider le MIME type / extension cÃ´tÃ© serveur (whitelist)
  - [x] Uploader le fichier dans Supabase Storage via client admin (`supabaseAdmin.storage.from('certibase-imports').upload(...)`)
  - [x] InsÃ©rer le record `imports` avec les champs adÃ©quats
  - [x] Retourner le record crÃ©Ã© en JSON

- [x] Task 3 â€” API route `POST /api/imports/url`
  - [x] CrÃ©er `app/api/imports/url/route.ts`
  - [x] Valider le domaine (youtube.com, youtu.be, zoom.us)
  - [x] CrÃ©er le record `imports` avec `file_type = url`, `file_url`

- [x] Task 4 â€” `GET /api/imports` (liste simple)
  - [x] CrÃ©er `app/api/imports/route.ts`
  - [x] Retourner les imports de l'utilisateur admin triÃ©s par `created_at DESC`
  - [x] ProtÃ©ger avec vÃ©rification rÃ´le admin

- [x] Task 5 â€” Vue Imports (remplacement du placeholder)
  - [x] Remplacer `app/(dashboard)/imports/page.tsx` par un Client Component complet
  - [x] Dropzone : `dragover` / `dragleave` / `drop` natifs HTML5 + `<input type="file" multiple accept="...">` masquÃ©
  - [x] 4 chips de type cliquables (Audio, VidÃ©o, PDF, URL) pour switcher le mode
  - [x] Mode URL : champ input texte + bouton "Ajouter"
  - [x] Liste des imports en dessous de la dropzone (donnÃ©es depuis `GET /api/imports`)
  - [x] Badge statut colorÃ© selon `status` : pending=warning, error=danger, ready=success
  - [x] Refresh de la liste aprÃ¨s chaque upload rÃ©ussi

## Dev Notes

### DÃ©cision PPTX
La conversion PPTXâ†’PDF est exclue de Story 2.1. Les fichiers PPTX sont stockÃ©s tels quels avec `file_type = 'pdf'`. En Story 2.2, Claude API lira le PPTX directement via l'API Files (base64), ce qui Ã©vite toute dÃ©pendance Ã  LibreOffice ou Python. Ce choix est conforme Ã  la contrainte "pas de PyMuPDF, pas de Python" tout en restant MVP-compatible.

### Bucket Supabase Storage
Le bucket doit Ãªtre crÃ©Ã© manuellement dans le dashboard Supabase (pas de migration SQL disponible pour storage). Chemin de fichier dans le bucket : `{user_id}/{timestamp}_{original_name}`.

### Supabase Storage upload depuis API route
Utiliser le client admin (`lib/supabase/admin.ts`) pour les uploads storage â€” le client anon a des permissions limitÃ©es cÃ´tÃ© serveur. L'URL du fichier dans storage n'est pas publique : `file_path` stocke le chemin relatif dans le bucket (ex: `userId/1717890000000_webinar.mp3`), pas une URL signÃ©e.

### Conventions Ã©tablies (Ã  respecter)
- Client admin Supabase : `createAdminClient()` depuis `lib/supabase/admin.ts`
- VÃ©rification rÃ´le admin dans chaque route API (pattern copiÃ© depuis `app/api/users/invite/route.ts`)
- `window.cbToast('message', 'success'|'error')` pour les toasts
- CSS tokens : `var(--primary)`, `var(--primary-soft)`, `var(--border)`, `var(--surface)`, etc. (pas de couleurs Tailwind en dur)
- Pas de `className` Tailwind pour les couleurs â€” utiliser `style={{ color: 'var(--text)' }}`
- Animations d'entrÃ©e : `className="cb-fade-in"` (dÃ©fini dans `globals.css`)
- Composant `cb-input` focus CSS dÃ©fini dans `globals.css`

### Formats acceptÃ©s
| Extension | MIME | file_type DB |
|-----------|------|-------------|
| mp3, m4a, wav | audio/* | audio |
| mp4, mov | video/* | video |
| pdf | application/pdf | pdf |
| pptx | application/vnd.openxmlformats... | pdf |
| youtube.com, zoom.us | â€” | url |

### Champs imports Ã  renseigner Ã  la crÃ©ation
```ts
{
  uploaded_by: user.id,       // UUID du user connectÃ©
  file_type: 'audio'|'video'|'pdf'|'url',
  import_type: 'webinar'|'presentation'|'sales_call'|'internal_doc'|'other',
  file_path: string|null,     // chemin relatif dans le bucket (null si URL)
  file_url: string|null,      // URL YouTube/Zoom (null si fichier)
  original_name: string|null, // nom du fichier original
  title: string|null,         // null Ã  la crÃ©ation, renseignÃ© plus tard
  profil_cible: 'all',        // dÃ©faut all, sÃ©lectionnable dans un futur step
  status: 'pending',
  fiches_count: 0
}
```

### UX Dropzone (spec UX-DR10)
- Dropzone pleine largeur, bordure `dashed 2px var(--border)`, fond `var(--bg)`
- `dragOver` â†’ `border-color: var(--primary)`, `background: var(--primary-soft)`
- Zone de texte centre : icÃ´ne + "Glissez vos fichiers ici" + "ou cliquez pour parcourir"
- 4 chips sous la zone : `Audio`, `VidÃ©o`, `PDF`, `URL` â€” cliquer sur URL switche vers un champ texte

### Badges statut
```
pending  â†’ fond warning-soft, texte warning   â†’ "En file"
extracting â†’ fond accent-soft, texte accent   â†’ "Extraction..."
analyzing  â†’ fond primary-soft, texte primary â†’ "Analyse..."
ready    â†’ fond success-soft, texte success   â†’ "PrÃªt"
error    â†’ fond danger-soft, texte danger     â†’ "Erreur"
```

## File List

- `app/(dashboard)/imports/page.tsx` (REPLACE â€” placeholder â†’ Client Component complet)
- `app/api/imports/upload/route.ts` (NEW)
- `app/api/imports/url/route.ts` (NEW)
- `app/api/imports/route.ts` (NEW)
- `components/icons.tsx` (MODIFIED â€” ajout IconAudio, IconVideo, IconPdf, IconLink, IconUpload)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes

- 3 API routes crÃ©Ã©es : `GET /api/imports`, `POST /api/imports/upload`, `POST /api/imports/url`
- Toutes les routes vÃ©rifient le rÃ´le admin via `createAdminClient()` (pattern existant)
- Upload fichier : validation extension whitelist cÃ´tÃ© serveur, upload Supabase Storage, insert `imports`
- URL : validation domaine (YouTube/Zoom), insert `imports` avec `file_type = url`
- Page imports : Client Component avec dropzone drag/drop, 4 chips de mode, liste avec badges statut
- Refresh via `refreshKey` state (Ã©vite le pattern `setState` direct dans `useEffect` flaguÃ© par le linter)
- PPTX stockÃ© avec `file_type = 'pdf'` â€” extraction texte dÃ©lÃ©guÃ©e Ã  Claude en Story 2.2
- Build Next.js propre (0 erreur TypeScript, 0 erreur ESLint, 2 warnings prÃ©-existants non liÃ©s)
- Bucket Supabase Storage `certibase-imports` Ã  crÃ©er manuellement dans le dashboard (non scriptable via SQL)

