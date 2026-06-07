---
baseline_commit: fdf9724
---

# Story 1.5 : Vue d'ensemble (Overview)

Status: done

## Story

En tant que membre de l'équipe,
Je veux voir un tableau de bord récapitulatif de la base de connaissance au démarrage,
Afin d'avoir une vue instantanée de l'état du système et d'accéder rapidement aux 3 surfaces.

## Acceptance Criteria

1. 4 stat-cards en grille 4 colonnes : Fiches validées (verte) / À valider (warning) / Angles morts (orange) / Imports actifs (neutre) — valeurs calculées depuis Supabase en temps réel
2. 3 shortcut-cards sous les stats avec hover translateY(-2px) + shadow → navigation vers Fiches / Imports / Assistant
3. Encart "Principe directeur" en bas de page

## Tasks / Subtasks

- [x] Task 1 — Page `/` (Server Component)
  - [x] Remplacer le placeholder `app/(dashboard)/page.tsx`
  - [x] Requêtes Supabase parallèles via client admin pour les compteurs
  - [x] Salutation personnalisée avec prénom depuis `profiles`

- [x] Task 2 — Composants visuels
  - [x] 4 stat-cards avec valeur colorée + sous-label
  - [x] 3 shortcut-cards avec icône SVG + description + lien "Ouvrir →"
  - [x] Hover CSS via classe `.cb-shortcut` dans `globals.css`
  - [x] Encart principe directeur avec icône étoile

## Notes techniques

- Hover des cards implémenté en CSS pur (`.cb-shortcut`) car Server Component ne supporte pas les event handlers
- Tous les accès Supabase passent par `createAdminClient()` pour bypasser RLS (cf. fix story 1.4)
- Le compteur "Angles morts" est hardcodé à 0 — sera alimenté par la story 3.4
