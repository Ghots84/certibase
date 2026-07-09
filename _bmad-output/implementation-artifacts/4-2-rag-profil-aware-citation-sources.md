---
baseline_commit: eb77e7d
---

# Story 4.2 : RAG profil-aware & citation des sources

Status: done

## Story

En tant que Claire (CSM), Marc (Sales) ou Sophie (Ops),
Je veux poser des questions et recevoir des réponses adaptées à mon rôle et sourcées depuis la base,
Afin d'obtenir de l'information fiable et actionnable en quelques secondes.

## Acceptance Criteria

1. `match_documents()` est appelé avec `profile_filter` = rôle de l'utilisateur connecté (csm/sales/ops/admin/all)
2. Le system prompt adapte le ton et la priorité des fiches selon le rôle : CSM → guides/protocoles ; Sales → objections/arguments ; Admin → vue complète
3. Les SourceChips sont affichés après chaque réponse (déjà implémenté, à conserver)
4. Quand aucune fiche n'est pertinente, l'assistant l'indique explicitement et un draft `missing_info` est créé (déjà implémenté, à conserver)
5. La réponse est basée exclusivement sur les fiches RAG (NFR-11, déjà implémenté)

## Tasks

- [ ] 1. Modifier `app/api/rag/route.ts` — lookup rôle utilisateur + profile_filter dynamique + system prompt profil-aware
- [ ] 2. Modifier `app/(dashboard)/assistant/page.tsx` — stocker et afficher le profil actif dans le header
- [ ] 3. `npm run lint` → 0 erreur

## File List

- `app/api/rag/route.ts` (MODIFY)
- `app/(dashboard)/assistant/page.tsx` (MODIFY)

## Dev Agent Record

### Completion Notes
_à remplir_
