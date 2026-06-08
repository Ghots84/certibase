---
baseline_commit: 101fd32
---

# Story 2.3 : Analyse Claude & génération de drafts

Status: review

## Story

En tant qu'Alex (Admin),
Je veux que Claude analyse le contenu extrait et génère des fiches draft structurées en un seul appel,
Afin d'obtenir rapidement de la connaissance à valider.

## Acceptance Criteria

1. Un import en `status = analyzing` avec `transcription` renseignée → 1 appel Claude → JSON `{objections[], faq[], moments_cles[], angles_morts[]}`
2. Chaque élément du JSON est inséré dans `import_fiches_draft` avec `type`, `title`, `content`, `confidence` (0-1), `source_timestamp_sec` ou `source_page`
3. `imports.fiches_count` mis à jour, `imports.status = ready`
4. JSON mal formé → `imports.status = error` avec message explicite
5. Relancer un import supprime les drafts existants avant de recréer (idempotence NFR-06)
6. La liste des imports affiche le nombre de fiches générées une fois `status = ready`

## Tasks / Subtasks

- [x] Task 1 — Étendre `POST /api/imports/[id]/process` : étape analyse après extraction
  - [x] Chaîner l'analyse immédiatement après `status = analyzing`
  - [x] DELETE drafts existants pour cet import avant INSERT (idempotence)

- [x] Task 2 — Prompt Claude + parsing JSON
  - [x] System prompt contextualisé CertiPlace / RNCP
  - [x] Schema JSON strict (4 clés, champs requis)
  - [x] Strip markdown code fences si Claude en ajoute
  - [x] `JSON.parse` avec try/catch → error explicite

- [x] Task 3 — Insert `import_fiches_draft`
  - [x] Mapping clés JSON → `DraftType` DB
  - [x] Batch insert via Supabase `insert([...])`
  - [x] Update `imports.fiches_count` + `imports.status = ready`

## Dev Notes

### Mapping JSON → DraftType
```
objections[]   → type = 'objection'
faq[]          → type = 'guide_situation'
moments_cles[] → type = 'cas_client'
angles_morts[] → type = 'missing_info'
```

### Idempotence
Avant tout INSERT de drafts, supprimer les drafts existants liés à cet import :
```ts
await admin.from('import_fiches_draft').delete().eq('import_id', id)
```

### Claude JSON output
Le modèle peut envelopper la réponse en markdown ```json ... ```. Extraire avec regex avant `JSON.parse`.

## File List

- `app/api/imports/[id]/process/route.ts` (MODIFIED — ajout étape analyse)

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes
- `analyzeAndCreateDrafts()` ajouté dans le process route — chaîné après extraction, même try/catch
- Prompt system contextualisé CertiPlace/RNCP, retour JSON strict (4 clés)
- Strip markdown code fences avant `JSON.parse`
- Idempotence : DELETE des drafts existants avant INSERT
- Mapping JSON→DraftType : objections→objection, faq→guide_situation, moments_cles→cas_client, angles_morts→missing_info
- `imports.fiches_count` + `imports.status = ready` mis à jour en fin de pipeline
- Build Next.js propre — 0 erreur
