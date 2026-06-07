---
baseline_commit: fdf9724
---

# Story 1.4 : Gestion des utilisateurs & rôles

Status: done

## Story

En tant qu'Alex (Admin),
Je veux inviter des membres et gérer leurs rôles depuis une interface dédiée,
Afin de contrôler qui a accès à CertiBase et avec quelles permissions.

## Acceptance Criteria

1. La page `/users` est accessible uniquement aux admins (redirection sinon)
2. La liste des membres affiche : avatar initiales, nom, email, rôle, date d'invitation
3. Le sélecteur de rôle inline permet de changer le rôle d'un membre sans recharger la page
4. Le formulaire d'invitation envoie un email via Supabase Auth admin et crée le profil
5. L'API `POST /api/users/invite` crée l'utilisateur via le client service role (bypass RLS)
6. L'API `PATCH /api/users/[id]` met à jour le rôle dans `profiles`
7. Le nav item "Utilisateurs" dans la sidebar est visible uniquement pour les admins
8. Tous les accès à `profiles` passent par le client admin pour éviter la récursion RLS

## Tasks / Subtasks

- [x] Task 1 — Page /users admin-only (AC: 1, 2)
  - [x] Créer `app/(dashboard)/users/page.tsx` (Server Component, vérification rôle admin)
  - [x] Afficher la liste des membres avec leurs informations

- [x] Task 2 — Sélecteur de rôle inline (AC: 3)
  - [x] Créer `app/(dashboard)/users/role-select.tsx` (Client Component)
  - [x] Appel `PATCH /api/users/[id]` au changement de valeur

- [x] Task 3 — Formulaire d'invitation (AC: 4)
  - [x] Créer `app/(dashboard)/users/invite-form.tsx` (Client Component)
  - [x] Validation email + appel `POST /api/users/invite`

- [x] Task 4 — API routes (AC: 5, 6)
  - [x] Créer `app/api/users/invite/route.ts` (POST — Supabase admin.createUser)
  - [x] Créer `app/api/users/[id]/route.ts` (PATCH — mise à jour rôle)

- [x] Task 5 — Client admin Supabase (AC: 8)
  - [x] Créer `lib/supabase/admin.ts` (createClient avec service role key)
  - [x] Migrer tous les accès profiles vers le client admin

- [x] Task 6 — Sidebar conditionnel (AC: 7)
  - [x] Modifier `components/sidebar.tsx` — nav item Utilisateurs visible si rôle admin
  - [x] Ajouter icône utilisateurs dans `components/icons.tsx`

## Dev Notes

- Le client `lib/supabase/admin.ts` utilise `SUPABASE_SERVICE_ROLE_KEY` pour bypasser les policies RLS
- La policy RLS sur `profiles` créait une récursion infinie quand le client anon essayait de lire son propre profil — résolu en passant par le client admin côté serveur
- `app/(dashboard)/users/page.tsx` vérifie le rôle admin avant tout rendu et redirige les non-admins

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### File List

- lib/supabase/admin.ts (NEW)
- app/(dashboard)/users/page.tsx (NEW)
- app/(dashboard)/users/role-select.tsx (NEW)
- app/(dashboard)/users/invite-form.tsx (NEW)
- app/api/users/invite/route.ts (NEW)
- app/api/users/[id]/route.ts (NEW)
- components/sidebar.tsx (MODIFIED — nav item Utilisateurs conditionnel admin)
- components/icons.tsx (MODIFIED — icône utilisateurs)
