---
baseline_commit: 7ef3e57
---

# Story 2.5 : Dashboard de validation des drafts

Status: review

## Story

En tant qu'Alex (Admin),
Je veux examiner, approuver ou rejeter les fiches générées par Claude,
Afin que seule la connaissance validée soit interrogeable par les agents.

## Acceptance Criteria

1. Panneau droit (ImportPanel) affiche les drafts de l'import sélectionné (status=ready)
2. Drafts triés : `missing_info` en tête, puis par `confidence` décroissante
3. Chaque ValidationCard : ID mono, barre confiance colorée (≥85=success/70-84=warning/<70=danger), titre, badge type, extrait 3 lignes, flag ⚠ si confidence < 0.7
4. Cliquer "Valider" → `POST /api/drafts/[id]/approve` → copie dans `fiches` (status=published), draft=approved, toast "Fiche validée — exposée aux agents"
5. Cliquer "Rejeter" → `POST /api/drafts/[id]/reject` → draft=rejected, card en opacité 45%
6. Compteur "{N}/{total} validées" dans le header du panneau

## Dev Notes

### Architecture — Fichiers implémentés

| Fichier | Action | Notes |
|---|---|---|
| `app/(dashboard)/imports/page.tsx` | MODIFY | ValidationCard + ImportPanel intégrés dans le panneau droit |
| `app/api/imports/[id]/drafts/route.ts` | NEW | GET admin-only, tri missing_info + confidence |
| `app/api/drafts/[id]/approve/route.ts` | NEW | POST admin-only, insert fiches + update draft |
| `app/api/drafts/[id]/reject/route.ts` | NEW | POST admin-only, update draft status=rejected |

### Patterns utilisés

- `DraftState = 'pending' | 'approved' | 'rejected' | 'processing'` — état local UI
- `draftStates: Record<string, DraftState>` — initialisé depuis `draft.status` au chargement
- `handleApprove` / `handleReject` dans `ImportPanel` — optimistic UI + toast
- Tri côté serveur dans `/api/imports/[id]/drafts` : missing_info → confidence desc
- `DRAFT_TO_FICHE_TYPE` mapping dans approve route
- Edge Function déclenchée automatiquement sur INSERT dans `fiches` (status=published)

## Tasks

- [x] 1. Créer `GET /api/imports/[id]/drafts` — admin-only, tri missing_info + confidence
- [x] 2. Créer `POST /api/drafts/[id]/approve` — insert fiches published + draft approved
- [x] 3. Créer `POST /api/drafts/[id]/reject` — draft rejected
- [x] 4. Ajouter `ValidationCard` + `ConfidenceBar` + `DraftState` dans imports/page.tsx
- [x] 5. Intégrer `ImportPanel` — chargement drafts, approve/reject handlers, compteur
- [x] 6. `npm run lint` → 0 erreur

## File List

- `app/(dashboard)/imports/page.tsx` (MODIFY)
- `app/api/imports/[id]/drafts/route.ts` (NEW)
- `app/api/drafts/[id]/approve/route.ts` (NEW)
- `app/api/drafts/[id]/reject/route.ts` (NEW)

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes
- Story implémentée dans une session précédente ; story file créée a posteriori
- ValidationCard : 4 états (pending/processing/approved/rejected), barre confiance colorée, flag ⚠ < 0.7
- ImportPanel : chargement via /api/imports/[id]/drafts, état draftStates local, compteur approuvé/total
- Approve : DRAFT_TO_FICHE_TYPE mapping, insert fiches published, validated_by + fiche_id sur draft
- Reject : simple PATCH draft.status = rejected
- Tri serveur : missing_info en tête, puis confidence desc
