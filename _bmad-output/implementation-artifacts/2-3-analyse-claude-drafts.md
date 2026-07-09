---
baseline_commit: 101fd32
---

# Story 2.3 : Analyse Claude & gÃ©nÃ©ration de drafts

Status: done

## Story

En tant qu'Alex (Admin),
Je veux que Claude analyse le contenu extrait et gÃ©nÃ¨re des fiches draft structurÃ©es en un seul appel,
Afin d'obtenir rapidement de la connaissance Ã  valider.

## Acceptance Criteria

1. Un import en `status = analyzing` avec `transcription` renseignÃ©e â†’ 1 appel Claude â†’ JSON `{objections[], faq[], moments_cles[], angles_morts[]}`
2. Chaque Ã©lÃ©ment du JSON est insÃ©rÃ© dans `import_fiches_draft` avec `type`, `title`, `content`, `confidence` (0-1), `source_timestamp_sec` ou `source_page`
3. `imports.fiches_count` mis Ã  jour, `imports.status = ready`
4. JSON mal formÃ© â†’ `imports.status = error` avec message explicite
5. Relancer un import supprime les drafts existants avant de recrÃ©er (idempotence NFR-06)
6. La liste des imports affiche le nombre de fiches gÃ©nÃ©rÃ©es une fois `status = ready`

## Tasks / Subtasks

- [x] Task 1 â€” Ã‰tendre `POST /api/imports/[id]/process` : Ã©tape analyse aprÃ¨s extraction
  - [x] ChaÃ®ner l'analyse immÃ©diatement aprÃ¨s `status = analyzing`
  - [x] DELETE drafts existants pour cet import avant INSERT (idempotence)

- [x] Task 2 â€” Prompt Claude + parsing JSON
  - [x] System prompt contextualisÃ© CertiPlace / RNCP
  - [x] Schema JSON strict (4 clÃ©s, champs requis)
  - [x] Strip markdown code fences si Claude en ajoute
  - [x] `JSON.parse` avec try/catch â†’ error explicite

- [x] Task 3 â€” Insert `import_fiches_draft`
  - [x] Mapping clÃ©s JSON â†’ `DraftType` DB
  - [x] Batch insert via Supabase `insert([...])`
  - [x] Update `imports.fiches_count` + `imports.status = ready`

## Dev Notes

### Mapping JSON â†’ DraftType
```
objections[]   â†’ type = 'objection'
faq[]          â†’ type = 'guide_situation'
moments_cles[] â†’ type = 'cas_client'
angles_morts[] â†’ type = 'missing_info'
```

### Idempotence
Avant tout INSERT de drafts, supprimer les drafts existants liÃ©s Ã  cet import :
```ts
await admin.from('import_fiches_draft').delete().eq('import_id', id)
```

### Claude JSON output
Le modÃ¨le peut envelopper la rÃ©ponse en markdown ```json ... ```. Extraire avec regex avant `JSON.parse`.

## File List

- `app/api/imports/[id]/process/route.ts` (MODIFIED â€” ajout Ã©tape analyse)

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes
- `analyzeAndCreateDrafts()` ajoutÃ© dans le process route â€” chaÃ®nÃ© aprÃ¨s extraction, mÃªme try/catch
- Prompt system contextualisÃ© CertiPlace/RNCP, retour JSON strict (4 clÃ©s)
- Strip markdown code fences avant `JSON.parse`
- Idempotence : DELETE des drafts existants avant INSERT
- Mapping JSONâ†’DraftType : objectionsâ†’objection, faqâ†’guide_situation, moments_clesâ†’cas_client, angles_mortsâ†’missing_info
- `imports.fiches_count` + `imports.status = ready` mis Ã  jour en fin de pipeline
- Build Next.js propre â€” 0 erreur

