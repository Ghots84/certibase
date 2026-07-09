---
baseline_commit: 7ef3e57
---

# Story 2.5 : Dashboard de validation des drafts

Status: done

## Story

En tant qu'Alex (Admin),
Je veux examiner, approuver ou rejeter les fiches gÃ©nÃ©rÃ©es par Claude,
Afin que seule la connaissance validÃ©e soit interrogeable par les agents.

## Acceptance Criteria

1. Panneau droit (ImportPanel) affiche les drafts de l'import sÃ©lectionnÃ© (status=ready)
2. Drafts triÃ©s : `missing_info` en tÃªte, puis par `confidence` dÃ©croissante
3. Chaque ValidationCard : ID mono, barre confiance colorÃ©e (â‰¥85=success/70-84=warning/<70=danger), titre, badge type, extrait 3 lignes, flag âš  si confidence < 0.7
4. Cliquer "Valider" â†’ `POST /api/drafts/[id]/approve` â†’ copie dans `fiches` (status=published), draft=approved, toast "Fiche validÃ©e â€” exposÃ©e aux agents"
5. Cliquer "Rejeter" â†’ `POST /api/drafts/[id]/reject` â†’ draft=rejected, card en opacitÃ© 45%
6. Compteur "{N}/{total} validÃ©es" dans le header du panneau

## Dev Notes

### Architecture â€” Fichiers implÃ©mentÃ©s

| Fichier | Action | Notes |
|---|---|---|
| `app/(dashboard)/imports/page.tsx` | MODIFY | ValidationCard + ImportPanel intÃ©grÃ©s dans le panneau droit |
| `app/api/imports/[id]/drafts/route.ts` | NEW | GET admin-only, tri missing_info + confidence |
| `app/api/drafts/[id]/approve/route.ts` | NEW | POST admin-only, insert fiches + update draft |
| `app/api/drafts/[id]/reject/route.ts` | NEW | POST admin-only, update draft status=rejected |

### Patterns utilisÃ©s

- `DraftState = 'pending' | 'approved' | 'rejected' | 'processing'` â€” Ã©tat local UI
- `draftStates: Record<string, DraftState>` â€” initialisÃ© depuis `draft.status` au chargement
- `handleApprove` / `handleReject` dans `ImportPanel` â€” optimistic UI + toast
- Tri cÃ´tÃ© serveur dans `/api/imports/[id]/drafts` : missing_info â†’ confidence desc
- `DRAFT_TO_FICHE_TYPE` mapping dans approve route
- Edge Function dÃ©clenchÃ©e automatiquement sur INSERT dans `fiches` (status=published)

## Tasks

- [x] 1. CrÃ©er `GET /api/imports/[id]/drafts` â€” admin-only, tri missing_info + confidence
- [x] 2. CrÃ©er `POST /api/drafts/[id]/approve` â€” insert fiches published + draft approved
- [x] 3. CrÃ©er `POST /api/drafts/[id]/reject` â€” draft rejected
- [x] 4. Ajouter `ValidationCard` + `ConfidenceBar` + `DraftState` dans imports/page.tsx
- [x] 5. IntÃ©grer `ImportPanel` â€” chargement drafts, approve/reject handlers, compteur
- [x] 6. `npm run lint` â†’ 0 erreur

## File List

- `app/(dashboard)/imports/page.tsx` (MODIFY)
- `app/api/imports/[id]/drafts/route.ts` (NEW)
- `app/api/drafts/[id]/approve/route.ts` (NEW)
- `app/api/drafts/[id]/reject/route.ts` (NEW)

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes
- Story implÃ©mentÃ©e dans une session prÃ©cÃ©dente ; story file crÃ©Ã©e a posteriori
- ValidationCard : 4 Ã©tats (pending/processing/approved/rejected), barre confiance colorÃ©e, flag âš  < 0.7
- ImportPanel : chargement via /api/imports/[id]/drafts, Ã©tat draftStates local, compteur approuvÃ©/total
- Approve : DRAFT_TO_FICHE_TYPE mapping, insert fiches published, validated_by + fiche_id sur draft
- Reject : simple PATCH draft.status = rejected
- Tri serveur : missing_info en tÃªte, puis confidence desc

