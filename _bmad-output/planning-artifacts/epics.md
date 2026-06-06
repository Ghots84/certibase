---
stepsCompleted: ["step-01", "step-02", "step-03"]
inputDocuments:
  - "_bmad-output/planning-artifacts/prds/prd-CertiBase-2026-06-02/prd.md"
  - "_bmad-output/planning-artifacts/prds/prd-CertiBase-2026-06-02/addendum.md"
  - "prototype/app.jsx"
  - "prototype/assistant.jsx"
  - "prototype/fiches.jsx"
  - "prototype/imports.jsx"
  - "prototype/styles.css"
  - "prototype/themes.js"
  - "prototype/data.js"
  - "prototype/ui.jsx"
  - "prototype/README.md"
---

# CertiBase - Epic Breakdown

## Overview

Ce document décompose les requirements du PRD CertiBase v1.1, du prototype UI hifi, et des spécifications techniques (addendum) en épics et stories actionnables pour l'agent développeur.

---

## Requirements Inventory

### Functional Requirements

FR-00: Spike de validation (S0) — créer 10-15 fiches manuellement, RAG minimal, tester avec 3 utilisateurs (Claire, Marc, Sophie). Critères : ≥ 70% similarité > 0,75, 2/3 utilisateurs trouvent la réponse utile.
FR-01: Import multi-format — accepter audio (mp3, m4a, wav), vidéo (mp4, mov), PDF, PPTX (converti automatiquement en PDF), URL (YouTube, Zoom). Sélection du type d'import et du profil cible.
FR-02: Pipeline de traitement automatique — après upload : extraction texte → analyse IA → drafts → notification admin. Statuts : pending → extracting → analyzing → ready / error.
FR-03: Extraction texte — Whisper API pour audio/vidéo, Claude natif pour PDF/PPTX, YouTube API pour sous-titres.
FR-04: Analyse IA — 1 seul appel Claude → JSON structuré : {objections[], faq[], moments_cles[], angles_morts[]}. Score de confiance (0-1) et référence source (timestamp ou page) par draft.
FR-05: Notification admin — notification in-app à la fin du traitement (statut ready ou error). [Should]
FR-06: 5 types de fiches publiées — objection (verbatim + réponse flash + preuve), guide de situation (déclencheur + étapes + messages type), cas client (problème + solution + résultat chiffré), concurrent (positionnement + pricing + arguments), doc CertiPlace (indexé automatiquement).
FR-07: Recherche sémantique RAG — fiches indexées en vecteurs, résultats en < 2s sans mots-clés exacts, seuil similarité 0,75 configurable par admin.
FR-08: Cycle de vie des fiches — statuts draft → published → archived. Seules les published sont interrogeables.
FR-09: Boucle auto-amélioration — question sans réponse satisfaisante (< seuil) → draft missing_info (question + contexte + date) → file admin prioritaire → guide les prochains imports.
FR-10: Création manuelle de fiches — admin crée une fiche sans import. [Should]
FR-11: CSM Digital — widget flottant React dans CertiPlace (injection script JS ou iframe, à décider). Accessible aux utilisateurs clients connectés.
FR-12: Contextualisation client temps réel — Scénario A (API CertiPlace disponible) : adapter les réponses au contexte client (certiplace_client_id). Scénario B (fallback) : réponses génériques depuis RAG. Décision avant S5.
FR-13: Escalade intelligente CSM — similarité < seuil → transfert vers CSM humain avec historique complet + question + données client.
FR-14: Mémoire conversationnelle CSM Digital — mémoriser les conversations par utilisateur client (rétention 90j par défaut).
FR-15: Sales Digital — chatbot sur certiplace.fr, disponible 24h/24, gère les objections commerciales.
FR-16: Qualification prospects — collecte via conversation naturelle : type organisme, nb certifications, besoin (support/gestion/reporting), urgence → score /100 transmis au Sales humain.
FR-17: Transmission contexte Sales — historique complet + score qualification au Sales humain lors de l'escalade.
FR-18: Mémoire conversationnelle Sales Digital — mémoriser les échanges par prospect identifié (email ou cookie, rétention 90j).
FR-19: Interface chat assistant interne — accessible à tous les utilisateurs authentifiés (CSM, Sales, Ops, Admin) depuis la navigation principale.
FR-20: RAG sur base de connaissance — chaque question → recherche sémantique → synthèse des fiches pertinentes avec citation des sources (titre + type).
FR-21: Réponses profil-aware — adapter contenu et niveau de détail selon le rôle : CSM → guides de situation, Sales → objections/arguments, Admin → vue complète, new → lecture seule.
FR-22: Génération de drafts à la demande — draft email, résumé de fiche, synthèse d'import récent — présenté dans le chat, prêt à copier.
FR-23: Mémoire conversationnelle interne — mémoriser contexte des conversations par utilisateur (rétention 90j, à valider RGPD). [Should]
FR-24: File de validation des drafts — dashboard affiche tous les drafts pending, groupés par import, priorisés (missing_info en tête, puis par confiance décroissante). Actions : approuver, rejeter, modifier.
FR-25: Vue d'ensemble des imports — liste avec statut temps réel, nb drafts générés, actions (relancer, supprimer, voir drafts).
FR-26: Gestion des utilisateurs — admin invite, assigne le rôle (admin/csm/sales/new), désactive. Rôle new = lecture seule assistant + fiches.

### NonFunctional Requirements

NFR-01: Latence RAG — recherche sémantique < 2s p95 jusqu'à 10 000 fiches. Index ivfflat obligatoire dès S1-S2.
NFR-02: Latence assistant interne — premier token < 3s p95. Streaming activé pour les réponses longues.
NFR-03: Pipeline d'import — traitement audio 60min < 15 minutes. Notification in-app à la fin.
NFR-04: Escalade sur faible confiance — similarité < 0,75 → pas d'invention, escalade systématique + draft missing_info.
NFR-05: Graceful degradation — si IA indisponible : message explicite dans le chat, fiches consultables manuellement, imports en file d'attente.
NFR-06: Idempotence du pipeline — relancer un import en erreur supprime les drafts existants avant de recréer.
NFR-07: Authentification obligatoire — toutes les routes (hors agents publics) exigent une session Supabase Auth valide.
NFR-08: Row Level Security — fiches published lisibles par tous les authentifiés. Import/validation/écriture réservés aux admins. Basé sur 4 rôles (admin/csm/sales/new).
NFR-09: Isolation MVP interne — tous les utilisateurs appartiennent à CertiPlace. Instance Supabase dédiée.
NFR-10: Clés API sécurisées — Claude API, Whisper API, Supabase service role : jamais exposées côté client. Tous les appels via routes API Next.js server-side.
NFR-11: Non-hallucination — réponses basées exclusivement sur les fiches RAG retournées. Si contexte insuffisant → signaler explicitement + déclencher FR-09.
NFR-12: Citation des sources — chaque réponse factuelle de l'assistant interne cite la fiche source (titre + type).

### Additional Requirements

- Supabase : activer l'extension pgvector avant création des tables
- Tables : profiles (+ trigger on_auth_user_created SECURITY DEFINER), tenants, imports, import_fiches_draft, fiches
- Index obligatoire : CREATE INDEX USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100) sur fiches.embedding
- Fonction RPC : match_documents(query_embedding, match_threshold, match_count, profile_filter) → fiches publiées triées par similarité cosinus
- Edge Function Supabase : générer l'embedding (text-embedding-3-small, 1536D) automatiquement à la publication d'une fiche
- Contrainte imports : file_path OU file_url non null (CHECK)
- PPTX → PDF : conversion côté client avant envoi à l'API Claude (pas de PyMuPDF, pas de Python)
- 1 appel Claude = 1 JSON → pas de pipeline multi-passes
- Stack cible : Next.js 14 (App Router) + Tailwind CSS + Supabase (PostgreSQL + pgvector) + Claude API (claude-sonnet-4-6) + Whisper API (OpenAI) + Node.js 20+
- n8n webhook pour veille concurrentielle (Could, S5-S6 si temps disponible)

### UX Design Requirements

UX-DR1: AppShell global — flex row 100vh, min-width 1080px (desktop uniquement). Sidebar 250px fixe (marine #122E47) + main (flex column : topbar 60px + zone scrollable). Thème "Clarté" uniquement (police Public Sans, tokens CSS sur #cb-root). Ne pas implémenter les directions "Focus" et "Console" présentes dans themes.js.
UX-DR2: Sidebar — de haut en bas : logo "CB" carré orange 38px + "CertiBase / Console interne" ; 4 nav items (icône 18px + label + badge compteur optionnel) ; spacer ; carte "Agents alimentés" (3 lignes : CSM Digital actif, Sales Digital actif, Assistant interne V1) ; bloc utilisateur (avatar initiales + nom + rôle).
UX-DR3: Nav items — fond sidebar-active-bg + barre gauche 3px orange sur item actif. Badge compteur orange pill en haut à droite.
UX-DR4: Topbar — fil d'ariane gauche ("CertiBase › vue active") + cloche notifications (avec pastille) à droite. Pas de sélecteur de direction/thème.
UX-DR5: Vue Overview — 4 stat-cards (grid 4col, valeurs colorées) + 3 shortcut-cards (grid 3col, hover translateY-2px + shadow) + encart "Principe directeur". Navigation depuis les raccourcis.
UX-DR6: Vue Fiches — toolbar (recherche texte + segmented control catégories : Toutes/Produit/Sales/Réglementaire/Veille) + grille auto-fill fiches + drawer latéral 392px sticky + BlindspotPanel sous la grille.
UX-DR7: FicheCard — ID mono + badge statut (Validée=success dot / À valider=warning dot) + titre + résumé (clamp 3 lignes) + pastille catégorie + barre de confiance (46px track, couleur selon seuil : ≥85=success, 70-84=warning, <70=danger). Hover : translateY(-1px) + shadow-lg. Active : bordure primary + ring 1px.
UX-DR8: Drawer FicheDetail — 392px, sticky, max-height calc(100vh-130px), animation slide-in 0.28s. Contenu : header (ID + titre 19px + fermer) + badges meta + corps scrollable (résumé, points clés avec checks verts, source, tags accent, agents exposés, compteur citations) + footer (Dupliquer + Valider/Modifier).
UX-DR9: BlindspotPanel — bordure gauche 3px orange, header avec icône étincelle, grille 2 colonnes d'items. Chaque item : pastille sévérité (haute=danger+halo / moyenne=warning+halo) + question + note + stats mono + CTA "Créer une fiche ↑" déclenche toast.
UX-DR10: Vue Imports — dropzone pleine largeur (bordure dashed, drag-over → fond primary-soft + bordure orange) + grille 2 colonnes (liste imports gauche / panneau validation droite 1.25fr).
UX-DR11: ImportRow — icône type (fond coloré : video=accent-soft, audio=primary-soft, link=warning-soft, pdf=surface-2) + nom + méta mono + barre de progression (si en cours) ou compteur fiches + badge statut. Sélectionnée = bordure primary + ring.
UX-DR12: ValidationCard — ID mono + barre confiance + titre + badge type + extrait + flag warning optionnel + actions (Rejeter hover danger / Éditer / Valider vert plein). Post-décision : état is-accept (bordure+fond success) ou is-reject (opacité réduite). Chaque action → toast.
UX-DR13: Vue Assistant — colonne flex max-width 900px. Header (H1 + sous-titre rôle coloré) + ProfilePicker 4 boutons (CSM #2D7DD2 / Sales #E8651E / Ops #1F8A5B / Admin #7A5AF8). Zone chat (carte top) + composer (carte bottom). Changer de profil réinitialise la conversation.
UX-DR14: État vide assistant — grosse icône bot (fond couleur profil) + "Bonjour <prénom> 👋" + 3 suggestions chips pleine largeur (propres au rôle, icône étincelle). Cliquer envoie la question.
UX-DR15: Messages assistant — user : bulle orange droite (max 75%) ; bot : avatar 32px + texte bold inline + liste étapes numérotées (puces rondes mono primary-soft) + SourceChips (label "Sources" + chips F-018 + titre) + bloc brouillon optionnel (header "Brouillon" + bouton Copier + corps italique).
UX-DR16: Indicateur typing — 3 points bounce (animation cbbounce), affiché ~900ms avant réponse.
UX-DR17: Composer — mini-chips suggestions (3 max, si conversation déjà commencée) + barre input + bouton send carré orange 38px désactivé si vide + footer mono "RAG · pgvector · match_documents — répond uniquement depuis la base validée".
UX-DR18: Toast global — position fixed bottom-center, fond dark, icône check vert, durée ~2.6s, animation cbtoast. Accessible via window.cbToast(msg).
UX-DR19: Animations — entrée de vue : translateY(7px) → 0 en 0.35s (cbfade) ; drawer : slide-in 0.28s (cbslide) ; hover cartes : translateY + shadow ; transitions couleur/fond 0.12s.
UX-DR20: Icônes — jeu SVG stroke maison (objet Icon dans ui.jsx) : search, plus, check, x, alert, pdf, video, audio, link, chevron, spark, bot, doc, send, grid, copy, bell, etc. Recommandation : remplacer par Lucide (mêmes métaphores) en production Next.js.

### FR Coverage Map

FR-00: Epic 1 — Spike validation RAG
FR-01: Epic 2 — Import multi-format (audio, vidéo, PDF, PPTX, URL)
FR-02: Epic 2 — Pipeline de traitement automatique
FR-03: Epic 2 — Extraction texte (Whisper + Claude natif + YouTube API)
FR-04: Epic 2 — Analyse IA → JSON structuré (1 appel Claude)
FR-05: Epic 2 — Notification admin fin de traitement [Should]
FR-06: Epic 3 — 5 types de fiches publiées
FR-07: Epic 3 — Recherche sémantique RAG
FR-08: Epic 3 — Cycle de vie des fiches (draft → published → archived)
FR-09: Epic 3 — Boucle auto-amélioration (missing_info)
FR-10: Epic 3 — Création manuelle de fiches [Should]
FR-11 à FR-14: HORS SCOPE MVP — CSM Digital (reporté)
FR-15 à FR-18: HORS SCOPE MVP — Sales Digital (reporté)
FR-19: Epic 4 — Interface chat assistant interne
FR-20: Epic 4 — RAG sur base de connaissance
FR-21: Epic 4 — Réponses profil-aware
FR-22: Epic 4 — Génération de drafts à la demande
FR-23: Epic 4 — Mémoire conversationnelle interne [Should]
FR-24: Epic 2 — File de validation des drafts (dashboard admin)
FR-25: Epic 2 — Vue d'ensemble des imports
FR-26: Epic 1 — Gestion des utilisateurs
NFR-01, 04, 11, 12: Epic 3 — Performance RAG + qualité IA
NFR-02: Epic 4 — Latence assistant interne
NFR-03, 05, 06: Epic 2 — Pipeline fiabilité
NFR-07 à 10: Epic 1 — Sécurité & accès

## Epic List

### Epic 1 — Fondation & Accès sécurisé
L'équipe CertiPlace peut accéder à la console CertiBase selon son rôle (admin/csm/sales/new). L'infrastructure RAG est opérationnelle et l'hypothèse de base est validée par le spike.
**FRs couverts :** FR-00, FR-26
**NFRs :** NFR-07, NFR-08, NFR-09, NFR-10

### Epic 2 — Import & Pipeline de traitement
Alex peut importer du contenu (audio, vidéo, PDF, PPTX, URL) et le pipeline Claude génère automatiquement des fiches structurées prêtes à valider depuis un dashboard dédié.
**FRs couverts :** FR-01, FR-02, FR-03, FR-04, FR-05, FR-24, FR-25
**NFRs :** NFR-03, NFR-05, NFR-06

### Epic 3 — Base de connaissance vivante
L'équipe parcourt, filtre, valide et gère les fiches. La base détecte ses propres lacunes (angles morts) et guide Alex vers les prochains imports à prioriser.
**FRs couverts :** FR-06, FR-07, FR-08, FR-09, FR-10
**NFRs :** NFR-01, NFR-04, NFR-11, NFR-12

### Epic 4 — Assistant Interne IA
Claire, Marc et Sophie interrogent la base en langage naturel, génèrent des drafts et préparent leurs interactions — avec des réponses adaptées à leur rôle.
**FRs couverts :** FR-19, FR-20, FR-21, FR-22, FR-23
**NFRs :** NFR-02

---

## Epic 1 : Fondation & Accès sécurisé

L'équipe CertiPlace peut accéder à la console CertiBase selon son rôle. L'infrastructure RAG est opérationnelle et l'hypothèse de base est validée par le spike.

### Story 1.1 : Infrastructure Supabase & RAG

En tant qu'Alex (Admin),
Je veux que la base de données et l'infrastructure vectorielle soient configurées,
Afin que les fiches puissent être stockées, indexées et interrogées sémantiquement.

**Acceptance Criteria :**

**Given** un projet Supabase vide avec l'extension pgvector activée
**When** les migrations sont exécutées
**Then** les 5 tables existent : `profiles`, `tenants`, `imports`, `import_fiches_draft`, `fiches`
**And** la colonne `fiches.embedding VECTOR(1536)` est présente
**And** l'index `ivfflat (embedding vector_cosine_ops) WITH (lists = 100)` est créé sur `fiches`
**And** la fonction RPC `match_documents(query_embedding, match_threshold, match_count, profile_filter)` retourne les fiches publiées triées par similarité cosinus
**And** une Edge Function Supabase génère automatiquement l'embedding (`text-embedding-3-small`, 1536D) à chaque publication de fiche (`status = published`)
**And** le trigger `on_auth_user_created` crée automatiquement un profil dans `profiles` (SECURITY DEFINER) à chaque inscription Supabase Auth
**And** les règles RLS sont actives : fiches `published` lisibles par tous les authentifiés ; INSERT/UPDATE/DELETE sur `fiches` et `imports` réservés aux `admin`

---

### Story 1.2 : Authentification & AppShell

En tant que membre de l'équipe CertiPlace,
Je veux me connecter et accéder à la console avec une interface claire,
Afin de naviguer entre les 4 vues selon mon rôle.

**Acceptance Criteria :**

**Given** un utilisateur non authentifié
**When** il accède à n'importe quelle route protégée
**Then** il est redirigé vers `/login`

**Given** un utilisateur avec des identifiants Supabase Auth valides
**When** il soumet le formulaire de connexion
**Then** il est redirigé vers la Vue d'ensemble
**And** l'AppShell est affiché : sidebar 250px marine (#122E47) + topbar 60px + zone scrollable

**Given** un utilisateur authentifié dans l'AppShell
**When** la sidebar est affichée
**Then** elle contient : logo "CB" carré orange 38px + "CertiBase / Console interne" ; 4 nav items (Vue d'ensemble, Fiches, Imports & validation, Assistant interne) avec badges compteurs ; carte "Agents alimentés" (CSM Digital actif, Sales Digital actif, Assistant interne V1) ; bloc utilisateur (avatar initiales + nom + rôle depuis `profiles`)
**And** le topbar affiche le fil d'ariane "CertiBase › <vue active>" et la cloche notifications avec pastille
**And** l'item actif a fond `sidebar-active-bg` et barre gauche 3px orange (#E8651E)
**And** les tokens CSS de la direction "Clarté" (Public Sans, orange #E8651E, marine #122E47) sont appliqués sur `#cb-root`

---

### Story 1.3 : Spike de validation RAG

En tant qu'Alex (Admin),
Je veux insérer manuellement 10 à 15 fiches de test et les interroger,
Afin de valider que la structure de fiches et le RAG retournent des réponses pertinentes avant de construire le pipeline complet.

**Acceptance Criteria :**

**Given** que l'infrastructure de la Story 1.1 est en place
**When** Alex insère 10 à 15 fiches via un script de seed (2-3 par type : objection, guide de situation, cas client, concurrent, doc CertiPlace)
**Then** chaque fiche génère automatiquement son embedding via l'Edge Function
**And** les fiches ont `status = published` et sont interrogeables via `match_documents()`

**Given** un utilisateur connecté (Claire, Marc ou Sophie)
**When** il pose une question en rapport avec les fiches insérées via la vue Assistant (ou un playground dédié)
**Then** au moins 70% des questions testées retournent une fiche avec `similarity > 0.75`
**And** les résultats s'affichent avec le titre de la fiche et son type

**Given** les résultats du spike
**When** le critère 70% est atteint par 2/3 utilisateurs testeurs
**Then** l'équipe valide la structure de fiches et démarre Epic 2
**When** le critère n'est pas atteint
**Then** la structure des types de fiches est révisée avant de démarrer Epic 2

---

### Story 1.4 : Gestion des utilisateurs

En tant qu'Alex (Admin),
Je veux inviter des membres de l'équipe, leur assigner un rôle et gérer leurs accès,
Afin que chacun accède à CertiBase avec les permissions adaptées à sa fonction.

**Acceptance Criteria :**

**Given** Alex connecté avec le rôle `admin` sur la page de gestion des utilisateurs
**When** la page se charge
**Then** il voit la liste des utilisateurs avec email, rôle actuel et statut

**Given** Alex qui invite un utilisateur par email
**When** il soumet l'invitation
**Then** Supabase Auth envoie un email d'invitation
**And** le compte est créé avec le rôle `new` par défaut
**And** le profil apparaît dans la liste

**Given** Alex qui assigne un rôle (`csm`, `sales` ou `admin`) à un utilisateur `new`
**When** le rôle est sauvegardé
**Then** `profiles.role` est mis à jour immédiatement
**And** les règles RLS s'appliquent au prochain appel de l'utilisateur

**Given** un utilisateur avec le rôle `new` connecté
**When** il navigue dans l'application
**Then** il peut consulter les fiches publiées et l'assistant en lecture seule
**And** toute action d'écriture (import, validation, gestion) lui est refusée

### Story 1.5 : Vue d'ensemble (Overview)

En tant que membre de l'équipe,
Je veux voir un tableau de bord récapitulatif de la base de connaissance au démarrage,
Afin d'avoir une vue instantanée de l'état du système et d'accéder rapidement aux 3 surfaces.

**Acceptance Criteria :**

**Given** un utilisateur authentifié qui accède à `/` (route par défaut)
**When** la Vue d'ensemble est affichée
**Then** 4 stat-cards sont visibles en grille 4 colonnes : "Fiches validées" (valeur verte, sous-label "sur N au total") ; "À valider" (valeur warning, "extractions en attente") ; "Angles morts" (valeur orange, "détectés par l'IA") ; "Imports actifs" (neutre, "dans le pipeline")
**And** les valeurs sont calculées depuis Supabase en temps réel (count des fiches published, drafts pending, blindspots, imports actifs)

**Given** les 4 stat-cards affichées
**When** 3 shortcut-cards sont sous les stats
**Then** chaque card contient : icône 42px fond `primary-soft`, titre, description, lien "Ouvrir →" orange
**And** cliquer sur une card navigue vers la vue correspondante (Fiches, Imports & validation, Assistant interne)
**And** au survol : `translateY(-2px)` + `shadow-lg`

**Given** le bas de la Vue d'ensemble
**When** la page est complète
**Then** l'encart "Principe directeur" est affiché : icône étincelle + "20 fiches parfaitement structurées valent mieux que 200 pages de doc mal indexées..."

---

## Epic 2 : Import & Pipeline de traitement

Alex peut importer du contenu (audio, vidéo, PDF, PPTX, URL) et le pipeline Claude génère automatiquement des fiches structurées prêtes à valider depuis un dashboard dédié.

### Story 2.1 : Upload multi-format & stockage

En tant qu'Alex (Admin),
Je veux déposer des fichiers audio, vidéo, PDF, PPTX et des URLs via une dropzone,
Afin d'initier l'ingestion de contenu dans la base de connaissance.

**Acceptance Criteria :**

**Given** Alex sur la vue "Imports & validation"
**When** il dépose un fichier (mp3/m4a/wav, mp4/mov, PDF, PPTX) dans la dropzone ou colle une URL YouTube/Zoom
**Then** le fichier est uploadé dans Supabase Storage (audio/vidéo) ou traité directement (PDF)
**And** un record `imports` est créé avec `status = pending`, le bon `file_type` et `import_type`, et `file_path` OU `file_url` renseigné
**And** un PPTX est automatiquement converti en PDF côté serveur (sans PyMuPDF) avant envoi à Claude
**And** l'import apparaît dans la liste avec le statut "En file"

**Given** la dropzone en état `dragOver`
**When** l'utilisateur survole la zone
**Then** la bordure devient orange et le fond passe à `primary-soft`

**Given** un format de fichier non supporté
**When** il est déposé
**Then** un message d'erreur explicite s'affiche, aucun record `imports` n'est créé

---

### Story 2.2 : Extraction texte (Whisper + Claude natif)

En tant qu'Alex (Admin),
Je veux que le texte soit automatiquement extrait de mes fichiers sans intervention manuelle,
Afin d'avoir du contenu brut prêt pour l'analyse IA.

**Acceptance Criteria :**

**Given** un import `status = pending` avec `file_type = audio` ou `video`
**When** le pipeline démarre
**Then** l'API Whisper est appelée, la transcription est stockée dans `imports.transcription`
**And** le statut passe `pending → extracting → analyzing`

**Given** un import avec `file_type = pdf`
**When** le pipeline démarre
**Then** le PDF est envoyé à Claude API (lecture native, 1 appel), le texte est stocké dans `imports.transcription`

**Given** un import avec `file_type = url`
**When** le pipeline démarre
**Then** les sous-titres YouTube sont récupérés via l'API YouTube et stockés dans `imports.transcription`

**Given** une erreur d'extraction (API indisponible, fichier corrompu)
**When** l'extraction échoue
**Then** `imports.status = error` avec `error_message` explicite
**And** relancer le traitement est idempotent (aucun doublon de drafts)

---

### Story 2.3 : Analyse Claude & génération de drafts

En tant qu'Alex (Admin),
Je veux que Claude analyse le contenu extrait et génère des fiches draft structurées en un seul appel,
Afin d'obtenir rapidement de la connaissance à valider.

**Acceptance Criteria :**

**Given** un import avec `status = analyzing` et `transcription` renseignée
**When** Claude API est appelé avec le prompt structuré (1 seul appel)
**Then** le JSON retourné contient les clés : `objections[]`, `faq[]`, `moments_cles[]`, `angles_morts[]`
**And** chaque élément est inséré dans `import_fiches_draft` avec `type`, `title`, `content`, `confidence` (0-1), et `source_timestamp_sec` ou `source_page`
**And** `imports.fiches_count` est mis à jour, `imports.status = ready`

**Given** un JSON mal formé retourné par Claude
**When** le parsing échoue
**Then** `imports.status = error` avec message d'erreur
**And** relancer supprime les drafts partiels avant de recréer (idempotence)

---

### Story 2.4 : Vue liste des imports

En tant qu'Alex (Admin),
Je veux voir tous mes imports avec leur statut en temps réel et les actions disponibles,
Afin de suivre le pipeline et savoir quoi faire ensuite.

**Acceptance Criteria :**

**Given** Alex sur la vue "Imports & validation"
**When** la page se charge
**Then** les imports sont listés avec : icône type colorée (vidéo=accent-soft, audio=primary-soft, lien=warning-soft, pdf=surface-2), nom, méta mono (taille · auteur · date), barre de progression si en cours (transcription/queue), compteur fiches si terminé, badge statut
**And** la dropzone est affichée en haut avec 4 chips de type (Audio, Vidéo, PDF, URL)

**Given** un import dont le statut change
**When** le statut est mis à jour en base
**Then** l'interface se met à jour sans rechargement complet (polling ou Supabase Realtime)

**Given** Alex qui sélectionne un import terminé (`status = done`)
**When** le panneau droit s'affiche
**Then** il indique le nombre de fiches validées et un bouton "Voir les N fiches"

---

### Story 2.5 : Dashboard de validation des drafts

En tant qu'Alex (Admin),
Je veux examiner, approuver ou rejeter les fiches générées par Claude,
Afin que seule la connaissance validée soit interrogeable par les agents.

**Acceptance Criteria :**

**Given** Alex qui sélectionne un import au statut `validation`
**When** le panneau de validation s'affiche
**Then** il voit le header (nb drafts pending + nom import + pilule "Extrait par Claude") et les ValidationCards en grille 2 colonnes
**And** les cards sont triées : `missing_info` en tête, puis par `confidence` décroissante
**And** chaque card affiche : ID mono, barre confiance colorée (≥85=success/70-84=warning/<70=danger), titre, badge type, extrait, flag warning si confidence < 0.7

**Given** Alex qui clique "Valider"
**When** l'action est confirmée
**Then** le draft est copié dans `fiches` (`status = published`), `import_fiches_draft.status = approved`, l'Edge Function génère l'embedding
**And** la card passe en `is-accept` (fond success) et un toast "Fiche validée — exposée aux agents" s'affiche

**Given** Alex qui clique "Rejeter"
**When** l'action est confirmée
**Then** `import_fiches_draft.status = rejected`, la card passe en `is-reject` (opacité réduite)

---

### Story 2.6 : Notifications admin [Should]

En tant qu'Alex (Admin),
Je veux être notifié quand un import termine son traitement,
Afin de savoir quand les drafts sont prêts à valider.

**Acceptance Criteria :**

**Given** un import qui passe à `status = ready` ou `error`
**When** le traitement se termine
**Then** une notification in-app apparaît (pastille dot orange sur la cloche topbar)

**Given** Alex qui clique sur la cloche
**When** il consulte les notifications
**Then** il voit les imports récents terminés (nom + statut + nb drafts)
**And** cliquer navigue vers l'import concerné

---

## Epic 3 : Base de connaissance vivante

L'équipe parcourt, filtre, valide et gère les fiches. La base détecte ses propres lacunes et guide Alex vers les prochains imports à prioriser.

### Story 3.1 : Vue Fiches — grille & recherche

En tant que membre de l'équipe,
Je veux parcourir et filtrer les fiches publiées par texte et catégorie,
Afin de trouver rapidement la connaissance dont j'ai besoin.

**Acceptance Criteria :**

**Given** un utilisateur authentifié sur la vue "Fiches"
**When** la page se charge
**Then** les fiches `status = published` sont en grille `auto-fill minmax(270px, 1fr)`
**And** chaque FicheCard affiche : ID mono, badge statut (Validée=success dot / À valider=warning dot), titre, résumé 3 lignes clampées, pastille catégorie colorée, barre de confiance 46px (≥85=success/70-84=warning/<70=danger)
**And** le bouton "Nouvelle fiche" est visible pour les `admin`

**Given** un utilisateur qui tape dans le champ de recherche
**When** il saisit du texte
**Then** la grille filtre en temps réel sur `title + summary + tags` (insensible à la casse)

**Given** un utilisateur qui sélectionne une catégorie (Toutes / Produit / Sales / Réglementaire / Veille)
**When** il clique
**Then** seules les fiches de cette catégorie s'affichent, combiné avec le filtre texte

---

### Story 3.2 : Drawer de détail d'une fiche

En tant que membre de l'équipe,
Je veux ouvrir une fiche et voir tous ses détails dans un panneau latéral,
Afin d'obtenir le contexte complet sans quitter la liste.

**Acceptance Criteria :**

**Given** un utilisateur qui clique sur une FicheCard
**When** la card est cliquée
**Then** un drawer 392px s'ouvre depuis la droite (animation slide-in 0.28s)
**And** la card sélectionnée a une bordure primary + ring 1px
**And** la grille passe en `minmax(240px, 1fr)`

**Given** le drawer ouvert
**When** il est affiché
**Then** il contient : ID + titre 19px + bouton fermer ; badges (statut, catégorie, type, confiance) ; résumé ; "Points clés" (checks verts) ; "Source" (icône + label + date mono) ; "Tags" (chips accent) ; "Exposée aux agents" (badges ou message warning si non validée) ; compteur citations ; footer (Dupliquer + Valider/Modifier selon statut)

**Given** l'utilisateur qui clique fermer ou une autre fiche
**When** l'action est effectuée
**Then** le drawer se ferme ou affiche la nouvelle fiche

---

### Story 3.3 : Cycle de vie & gestion des fiches

En tant qu'Alex (Admin),
Je veux gérer le cycle de vie des fiches et créer des fiches manuellement,
Afin de maintenir la base à jour et précise.

**Acceptance Criteria :**

**Given** Alex qui clique "Valider la fiche" sur une fiche `draft`
**When** l'action est confirmée
**Then** `fiches.status = published`, l'embedding est généré si absent, le badge passe à "Validée"

**Given** Alex qui clique "Modifier" sur une fiche publiée
**When** il sauvegarde les changements
**Then** `fiches` est mis à jour et l'embedding est régénéré

**Given** Alex qui archive une fiche
**When** l'archivage est confirmé
**Then** `fiches.status = archived`, la fiche disparaît de la grille et des résultats RAG

**Given** Alex qui clique "Nouvelle fiche"
**When** il remplit le formulaire (titre, type, contenu, profil cible)
**Then** une fiche est créée avec `source = manual`, `status = draft`
**And** il peut la valider immédiatement ou la retrouver dans la liste

---

### Story 3.4 : Boucle auto-amélioration — Angles morts

En tant qu'Alex (Admin),
Je veux voir les questions sans réponse satisfaisante et créer facilement les fiches manquantes,
Afin que la base de connaissance s'améliore continuellement avec l'usage.

**Acceptance Criteria :**

**Given** un agent ou l'assistant qui reçoit une question avec similarity RAG < 0.75
**When** aucune fiche satisfaisante n'est trouvée
**Then** un draft `missing_info` est créé dans `import_fiches_draft` avec : question posée, canal source, date, `confidence = 0`
**And** ce draft est priorisé en tête de la file de validation (Story 2.5)

**Given** Alex sur la vue "Fiches"
**When** il fait défiler vers le bas
**Then** le BlindspotPanel est affiché : bordure gauche 3px orange, header avec icône étincelle, grille 2 colonnes
**And** chaque item affiche : pastille sévérité (haute=danger+halo si asked≥8 / moyenne=warning+halo), question, note, stats mono ("N× demandé · canal"), CTA "Créer une fiche ↑"

**Given** Alex qui clique "Créer une fiche ↑"
**When** le CTA est cliqué
**Then** un toast "Brouillon de fiche créé pour : «question»" s'affiche
**And** un draft est créé dans `import_fiches_draft` avec la question pré-remplie

---

## Epic 4 : Assistant Interne IA

Claire, Marc et Sophie interrogent la base en langage naturel, génèrent des drafts et préparent leurs interactions — avec des réponses adaptées à leur rôle.

### Story 4.1 : Interface chat & sélecteur de profil

En tant que membre de l'équipe,
Je veux accéder à une interface de chat adaptée à mon rôle avec des suggestions contextuelles,
Afin de commencer à interroger la base immédiatement.

**Acceptance Criteria :**

**Given** un utilisateur authentifié sur la vue "Assistant interne"
**When** la page se charge
**Then** l'AssistantView est affichée : header (H1 "Assistant CertiBase" + sous-titre rôle actif coloré) + ProfilePicker 4 boutons (CSM #2D7DD2 / Sales #E8651E / Ops #1F8A5B / Admin #7A5AF8)
**And** l'état vide affiche : icône bot sur fond de couleur du profil, "Bonjour <prénom> 👋", 3 suggestions chips propres au profil

**Given** un utilisateur qui change de profil
**When** il sélectionne un autre profil
**Then** la conversation est réinitialisée, les suggestions changent, les couleurs reflètent le nouveau profil

**Given** un utilisateur qui clique sur une suggestion
**When** la suggestion est cliquée
**Then** le message est envoyé automatiquement

---

### Story 4.2 : RAG profil-aware & citation des sources

En tant que Claire (CSM), Marc (Sales) ou Sophie (Ops),
Je veux poser des questions et recevoir des réponses sourcées depuis la base,
Afin d'obtenir de l'information fiable en quelques secondes.

**Acceptance Criteria :**

**Given** un utilisateur qui envoie un message
**When** le message est soumis
**Then** l'indicateur typing (3 points bounce ~900ms) s'affiche
**And** `/api/chat` est appelé côté serveur (message + rôle + historique récent)
**And** `match_documents()` est appelé avec l'embedding de la question et `profile_filter` du rôle
**And** la réponse est streamée (premier token < 3s p95, NFR-02)

**Given** des fiches pertinentes trouvées (similarity ≥ 0.75)
**When** la réponse est générée
**Then** le system prompt est adapté au rôle : CSM → guides/protocoles ; Sales → objections/arguments ; Admin → vue complète
**And** les SourceChips sont affichés (label "Sources" + chips ID mono + titre fiche)
**And** la réponse est basée exclusivement sur les fiches RAG (NFR-11)

**Given** aucune fiche pertinente (similarity < 0.75)
**When** la réponse est générée
**Then** l'assistant indique explicitement l'absence d'information
**And** un draft `missing_info` est créé automatiquement (Story 3.4)
**And** aucun SourceChip n'est affiché

---

### Story 4.3 : Génération de drafts & résumés

En tant que Marc (Sales) ou Sophie (Ops),
Je veux demander à l'assistant de générer des drafts et des résumés d'imports,
Afin de produire du contenu de qualité rapidement.

**Acceptance Criteria :**

**Given** un utilisateur qui demande un draft de réponse email ou un résumé
**When** l'assistant génère une réponse avec du contenu rédigé
**Then** un bloc brouillon est affiché dans le message bot : header "✨ Brouillon de réponse" + bouton "Copier" + corps en italique

**Given** un utilisateur qui clique "Copier"
**When** le bouton est cliqué
**Then** le contenu est copié dans le presse-papier et un toast "Brouillon copié" s'affiche

**Given** Sophie qui demande de résumer un webinaire par titre
**When** l'assistant traite la demande
**Then** il retourne les points clés, objections et moments importants
**And** les fiches sources sont citées dans les SourceChips

---

### Story 4.4 : Mémoire conversationnelle [Should]

En tant que membre de l'équipe,
Je veux que l'assistant se souvienne de mes conversations précédentes,
Afin de ne pas devoir réexpliquer mon contexte à chaque session.

**Acceptance Criteria :**

**Given** un utilisateur qui revient sur la vue Assistant lors d'une session ultérieure
**When** la vue se charge
**Then** les N derniers messages sont rechargés (N configurable, défaut 10)
**And** l'assistant peut faire référence au contexte précédent

**Given** un historique de plus de 90 jours
**When** la rétention est vérifiée
**Then** les messages de plus de 90 jours sont supprimés automatiquement

**Given** un utilisateur qui change de profil
**When** le profil change
**Then** l'historique affiché correspond au profil sélectionné (historiques séparés par profil)
