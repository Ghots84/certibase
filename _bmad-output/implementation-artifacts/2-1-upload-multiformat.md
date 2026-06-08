---
baseline_commit: 0cc35b9
---

# Story 2.1 : Upload multi-format & stockage

Status: review

## Story

En tant qu'Alex (Admin),
Je veux déposer des fichiers audio, vidéo, PDF, PPTX et des URLs YouTube/Zoom via une dropzone,
Afin d'initier l'ingestion de contenu dans la base de connaissance.

## Acceptance Criteria

1. La dropzone accepte les formats : mp3, m4a, wav (audio) ; mp4, mov (vidéo) ; PDF ; PPTX
2. Les fichiers audio et vidéo sont uploadés dans Supabase Storage (bucket `certibase-imports`)
3. Un record `imports` est créé avec `status = pending`, le bon `file_type`, `import_type`, et `file_path` OU `file_url` renseigné
4. Un PPTX est stocké tel quel dans Supabase Storage avec `file_type = pdf` (l'extraction texte est déléguée à Claude dans Story 2.2)
5. L'import apparaît immédiatement dans la liste sous la dropzone avec le badge "En file"
6. En état `dragOver`, la dropzone affiche une bordure orange et un fond `primary-soft`
7. Un format non supporté déclenche un message d'erreur explicite — aucun record `imports` n'est créé
8. La saisie d'une URL YouTube ou Zoom crée un record `imports` avec `file_type = url` et `file_url` renseigné

## Tasks / Subtasks

- [x] Task 1 — Bucket Supabase Storage
  - [x] Documenter la création manuelle du bucket `certibase-imports` (public: false) depuis le dashboard Supabase
  - [x] Ajouter la policy RLS storage : INSERT/SELECT réservés aux `admin` via le service role

- [x] Task 2 — API route `POST /api/imports/upload`
  - [x] Créer `app/api/imports/upload/route.ts`
  - [x] Valider le MIME type / extension côté serveur (whitelist)
  - [x] Uploader le fichier dans Supabase Storage via client admin (`supabaseAdmin.storage.from('certibase-imports').upload(...)`)
  - [x] Insérer le record `imports` avec les champs adéquats
  - [x] Retourner le record créé en JSON

- [x] Task 3 — API route `POST /api/imports/url`
  - [x] Créer `app/api/imports/url/route.ts`
  - [x] Valider le domaine (youtube.com, youtu.be, zoom.us)
  - [x] Créer le record `imports` avec `file_type = url`, `file_url`

- [x] Task 4 — `GET /api/imports` (liste simple)
  - [x] Créer `app/api/imports/route.ts`
  - [x] Retourner les imports de l'utilisateur admin triés par `created_at DESC`
  - [x] Protéger avec vérification rôle admin

- [x] Task 5 — Vue Imports (remplacement du placeholder)
  - [x] Remplacer `app/(dashboard)/imports/page.tsx` par un Client Component complet
  - [x] Dropzone : `dragover` / `dragleave` / `drop` natifs HTML5 + `<input type="file" multiple accept="...">` masqué
  - [x] 4 chips de type cliquables (Audio, Vidéo, PDF, URL) pour switcher le mode
  - [x] Mode URL : champ input texte + bouton "Ajouter"
  - [x] Liste des imports en dessous de la dropzone (données depuis `GET /api/imports`)
  - [x] Badge statut coloré selon `status` : pending=warning, error=danger, ready=success
  - [x] Refresh de la liste après chaque upload réussi

## Dev Notes

### Décision PPTX
La conversion PPTX→PDF est exclue de Story 2.1. Les fichiers PPTX sont stockés tels quels avec `file_type = 'pdf'`. En Story 2.2, Claude API lira le PPTX directement via l'API Files (base64), ce qui évite toute dépendance à LibreOffice ou Python. Ce choix est conforme à la contrainte "pas de PyMuPDF, pas de Python" tout en restant MVP-compatible.

### Bucket Supabase Storage
Le bucket doit être créé manuellement dans le dashboard Supabase (pas de migration SQL disponible pour storage). Chemin de fichier dans le bucket : `{user_id}/{timestamp}_{original_name}`.

### Supabase Storage upload depuis API route
Utiliser le client admin (`lib/supabase/admin.ts`) pour les uploads storage — le client anon a des permissions limitées côté serveur. L'URL du fichier dans storage n'est pas publique : `file_path` stocke le chemin relatif dans le bucket (ex: `userId/1717890000000_webinar.mp3`), pas une URL signée.

### Conventions établies (à respecter)
- Client admin Supabase : `createAdminClient()` depuis `lib/supabase/admin.ts`
- Vérification rôle admin dans chaque route API (pattern copié depuis `app/api/users/invite/route.ts`)
- `window.cbToast('message', 'success'|'error')` pour les toasts
- CSS tokens : `var(--primary)`, `var(--primary-soft)`, `var(--border)`, `var(--surface)`, etc. (pas de couleurs Tailwind en dur)
- Pas de `className` Tailwind pour les couleurs — utiliser `style={{ color: 'var(--text)' }}`
- Animations d'entrée : `className="cb-fade-in"` (défini dans `globals.css`)
- Composant `cb-input` focus CSS défini dans `globals.css`

### Formats acceptés
| Extension | MIME | file_type DB |
|-----------|------|-------------|
| mp3, m4a, wav | audio/* | audio |
| mp4, mov | video/* | video |
| pdf | application/pdf | pdf |
| pptx | application/vnd.openxmlformats... | pdf |
| youtube.com, zoom.us | — | url |

### Champs imports à renseigner à la création
```ts
{
  uploaded_by: user.id,       // UUID du user connecté
  file_type: 'audio'|'video'|'pdf'|'url',
  import_type: 'webinar'|'presentation'|'sales_call'|'internal_doc'|'other',
  file_path: string|null,     // chemin relatif dans le bucket (null si URL)
  file_url: string|null,      // URL YouTube/Zoom (null si fichier)
  original_name: string|null, // nom du fichier original
  title: string|null,         // null à la création, renseigné plus tard
  profil_cible: 'all',        // défaut all, sélectionnable dans un futur step
  status: 'pending',
  fiches_count: 0
}
```

### UX Dropzone (spec UX-DR10)
- Dropzone pleine largeur, bordure `dashed 2px var(--border)`, fond `var(--bg)`
- `dragOver` → `border-color: var(--primary)`, `background: var(--primary-soft)`
- Zone de texte centre : icône + "Glissez vos fichiers ici" + "ou cliquez pour parcourir"
- 4 chips sous la zone : `Audio`, `Vidéo`, `PDF`, `URL` — cliquer sur URL switche vers un champ texte

### Badges statut
```
pending  → fond warning-soft, texte warning   → "En file"
extracting → fond accent-soft, texte accent   → "Extraction..."
analyzing  → fond primary-soft, texte primary → "Analyse..."
ready    → fond success-soft, texte success   → "Prêt"
error    → fond danger-soft, texte danger     → "Erreur"
```

## File List

- `app/(dashboard)/imports/page.tsx` (REPLACE — placeholder → Client Component complet)
- `app/api/imports/upload/route.ts` (NEW)
- `app/api/imports/url/route.ts` (NEW)
- `app/api/imports/route.ts` (NEW)
- `components/icons.tsx` (MODIFIED — ajout IconAudio, IconVideo, IconPdf, IconLink, IconUpload)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes

- 3 API routes créées : `GET /api/imports`, `POST /api/imports/upload`, `POST /api/imports/url`
- Toutes les routes vérifient le rôle admin via `createAdminClient()` (pattern existant)
- Upload fichier : validation extension whitelist côté serveur, upload Supabase Storage, insert `imports`
- URL : validation domaine (YouTube/Zoom), insert `imports` avec `file_type = url`
- Page imports : Client Component avec dropzone drag/drop, 4 chips de mode, liste avec badges statut
- Refresh via `refreshKey` state (évite le pattern `setState` direct dans `useEffect` flagué par le linter)
- PPTX stocké avec `file_type = 'pdf'` — extraction texte déléguée à Claude en Story 2.2
- Build Next.js propre (0 erreur TypeScript, 0 erreur ESLint, 2 warnings pré-existants non liés)
- Bucket Supabase Storage `certibase-imports` à créer manuellement dans le dashboard (non scriptable via SQL)
