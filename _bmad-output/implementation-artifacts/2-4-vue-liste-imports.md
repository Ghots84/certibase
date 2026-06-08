---
baseline_commit: 20f22ea
---

# Story 2.4 : Vue liste des imports

Status: review

## Story

En tant qu'Alex (Admin),
Je veux voir tous mes imports avec leur statut en temps réel et les actions disponibles,
Afin de suivre le pipeline et savoir quoi faire ensuite.

## Acceptance Criteria

1. Les imports sont listés avec icône type colorée, nom, méta mono (type · date), compteur fiches si terminé, badge statut
2. Un import dont le statut change se met à jour sans rechargement complet (polling 3s)
3. Sélectionner un import affiche un panneau droit avec ses détails (border primary + ring)
4. Un import `status = ready` affiche le nombre de fiches + bouton "Voir les N fiches →"
5. Un import `status = error` affiche le message d'erreur + bouton "Relancer le pipeline"
6. Un import en cours (`extracting`/`analyzing`) affiche une barre de progression indéterminée

## File List

- `app/(dashboard)/imports/page.tsx` (REPLACE — layout 2 colonnes + ImportPanel + ProgressBar)
- `app/globals.css` (MODIFIED — keyframe cbprogress)

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes
- Layout 2 colonnes : liste flex-1 + panneau droit fixe 340px
- Composant `ImportPanel` — 3 états : vide / en cours / prêt / erreur
- Composant `ProgressBar` — barre indéterminée animée (cbprogress) pour extracting/analyzing
- Polling automatique toutes les 3s si un import est en cours (s'arrête quand plus rien en cours)
- Bouton "Relancer" dans la liste ET dans le panneau droit pour les imports en erreur
- Build propre — 0 erreur TypeScript/ESLint
