---
baseline_commit: 395fc02
---

# Story 1.6 : UX Polish — Interface globale & Assistant

Status: done

## Story

En tant qu'utilisateur de la console,
Je veux une interface plus soignée et cohérente,
Afin d'avoir une expérience fluide et professionnelle au quotidien.

## Acceptance Criteria

1. Animations d'entrée (`cbfade`, `cbbounce`, `cbcursor`) définies dans globals.css et appliquées sur toutes les vues principales
2. Toast global (`window.cbToast`) disponible dans le layout dashboard — déclenché sur "Nouvelle conversation"
3. Topbar : label `/users` présent, hover cloche en CSS pur, matching par préfixe pour les routes dynamiques
4. Assistant : conversation centrée sur 720px, avatar bot SVG, curseur clignotant pendant le streaming, focus ring sur l'input, empty state redesigné avec suggestions, 5 profils (CSM/Sales/Ops/Admin/Tous)
5. Sidebar : hover sur items inactifs en CSS, badges discrets, séparateur section Admin, dots agents animés, rôle `ops` partout

## Tasks / Subtasks

- [x] Task 1 — Fondation CSS (`globals.css`)
  - [x] Keyframes `cbfade`, `cbbounce`, `cbpulse`, `cbcursor`, `cbdotpulse`
  - [x] Classes utilitaires : `.cb-fade-in`, `.cb-icon-btn`, `.cb-input`, `.cb-nav-link`, `.cb-signout`, `.cb-dot-pulse`
  - [x] Variable font corrigée : `var(--font-public-sans)`
  - [x] `id="cb-root"` sur le body (`layout.tsx`)
  - [x] Dashboard layout `height: 100vh`

- [x] Task 2 — Toast global
  - [x] `components/toast-provider.tsx` avec `window.cbToast()`
  - [x] Intégré dans `app/(dashboard)/layout.tsx`
  - [x] Branché sur "Nouvelle conversation" dans l'assistant

- [x] Task 3 — Topbar
  - [x] `/users` ajouté à `ROUTE_LABELS`
  - [x] Hover cloche remplacé par `.cb-icon-btn`
  - [x] Matching par préfixe (tableau de tuples trié)

- [x] Task 4 — Assistant (`app/(dashboard)/assistant/page.tsx`)
  - [x] Conversation centrée `max-w: 720px`
  - [x] Empty state : icône SVG chat, profil actif coloré, chips de suggestions avec emoji
  - [x] Avatar bot : SVG robot sur fond `primary-soft`
  - [x] Curseur `.cb-cursor::after` pendant le streaming
  - [x] Focus ring animé sur le wrapper textarea
  - [x] 5 profils : CSM / Sales / Ops / Admin / Tous
  - [x] Bouton "↺ Réinitialiser" + toast
  - [x] Badges sources avec % dans un badge visuel

- [x] Task 5 — Sidebar
  - [x] Label de section `NAVIGATION` + `ADMIN`
  - [x] Séparateur visuel avant section admin (admin uniquement)
  - [x] Labels raccourcis : "Imports", "Assistant"
  - [x] Hover items inactifs via `.cb-nav-link` CSS
  - [x] Badges : chiffre mono discret (plus de pill orange)
  - [x] Dots agents animés `.cb-dot-pulse` pour les actifs
  - [x] Avatar utilisateur 32px
  - [x] `SignOutButton` en CSS pur (`.cb-signout`)
  - [x] Rôle `ops` ajouté dans sidebar, users page et API route

- [x] Task 6 — Overview / Login / Users
  - [x] `.cb-fade-in` sur les 3 pages
  - [x] Couleur conditionnelle "Imports actifs" (bleu si > 0)
  - [x] Empty state users avec `IconUsers`
  - [x] Formulaire login simplifié (suppression du mode signup)
  - [x] Focus inputs via `.cb-input` CSS

## Notes techniques

- La classe `.cb-nav-link` utilise `data-active` comme attribut pour le sélecteur CSS (évite les JS hover handlers dans un Client Component)
- Le curseur de streaming est un `::after` CSS — pas de re-render supplémentaire
- Le toast est exposé sur `window.cbToast` pour rester découplé des Server Components
- Le rôle `ops` est maintenant valide dans `VALID_ROLES` de l'API PATCH `/api/users/[id]`
