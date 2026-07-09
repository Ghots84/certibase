---
baseline_commit: 20f22ea
---

# Story 2.4 : Vue liste des imports

Status: done

## Story

En tant qu'Alex (Admin),
Je veux voir tous mes imports avec leur statut en temps rÃ©el et les actions disponibles,
Afin de suivre le pipeline et savoir quoi faire ensuite.

## Acceptance Criteria

1. Les imports sont listÃ©s avec icÃ´ne type colorÃ©e, nom, mÃ©ta mono (type Â· date), compteur fiches si terminÃ©, badge statut
2. Un import dont le statut change se met Ã  jour sans rechargement complet (polling 3s)
3. SÃ©lectionner un import affiche un panneau droit avec ses dÃ©tails (border primary + ring)
4. Un import `status = ready` affiche le nombre de fiches + bouton "Voir les N fiches â†’"
5. Un import `status = error` affiche le message d'erreur + bouton "Relancer le pipeline"
6. Un import en cours (`extracting`/`analyzing`) affiche une barre de progression indÃ©terminÃ©e

## File List

- `app/(dashboard)/imports/page.tsx` (REPLACE â€” layout 2 colonnes + ImportPanel + ProgressBar)
- `app/globals.css` (MODIFIED â€” keyframe cbprogress)

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes
- Layout 2 colonnes : liste flex-1 + panneau droit fixe 340px
- Composant `ImportPanel` â€” 3 Ã©tats : vide / en cours / prÃªt / erreur
- Composant `ProgressBar` â€” barre indÃ©terminÃ©e animÃ©e (cbprogress) pour extracting/analyzing
- Polling automatique toutes les 3s si un import est en cours (s'arrÃªte quand plus rien en cours)
- Bouton "Relancer" dans la liste ET dans le panneau droit pour les imports en erreur
- Build propre â€” 0 erreur TypeScript/ESLint

