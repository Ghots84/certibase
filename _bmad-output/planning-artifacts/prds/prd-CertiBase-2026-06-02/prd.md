---
title: "CertiBase — Product Requirements Document"
status: draft
created: 2026-06-02
updated: 2026-06-06
version: 1.1
---

# CertiBase — Product Requirements Document

---

## 1. Vision & Problème

### Pourquoi CertiBase existe

CertiPlace est un SaaS de gestion pour organismes certificateurs. Avec sa croissance, la connaissance produite en interne — webinaires, appels commerciaux, présentations, documents de procédure — s'est dispersée et est devenue difficile à exploiter. Les équipes perdent du temps à chercher, les clients attendent des réponses, et les prospects quittent le site sans être qualifiés.

**CertiBase transforme cette connaissance dispersée en intelligence opérationnelle** — disponible 24h/24 pour les équipes internes, et (post-MVP) pour les clients et prospects.

### Les 4 problèmes à résoudre

| # | Problème | Impact mesurable |
|---|---|---|
| P1 | **Support saturé** : les CSM répondent en boucle aux mêmes questions L1/L2 | Tickets accumulés, satisfaction client en baisse |
| P2 | **Prospects perdus** : visiteurs sur certiplace.fr hors horaires sans interlocuteur | Pipeline commercial affaibli, conversions manquées |
| P3 | **Connaissance silotée** : webinaires, appels, PDFs dispersés et introuvables | Temps de recherche interne élevé, erreurs opérationnelles |
| P4 | **Équipes sans assistant IA** : pas d'outil pour interroger la base, préparer les appels, rédiger des drafts | Productivité CSM, Sales et Ops sous-optimale |

### La solution — 3 couches

| Couche | Description | Bénéficiaires |
|---|---|---|
| **Base de connaissance** | Imports enrichis par IA, fiches structurées, recherche sémantique (RAG vectoriel) | Tous les utilisateurs internes |
| **Agents externes** | CSM Digital dans CertiPlace, Sales Digital sur certiplace.fr | Clients & prospects *(post-MVP)* |
| **IA interne** | Assistant conversationnel accessible aux CSM, Sales, Ops dans l'application | Équipes CertiPlace |

---

## 2. Utilisateurs

### Alex — Admin / Knowledge Manager

Alex importe les contenus (webinaires, appels, PDFs, PPTX), valide les fiches générées par l'IA, et surveille la qualité de la base de connaissance. Il a besoin de voir les "angles morts" (ce que l'IA ne sait pas encore répondre), de contrôler ce que les agents disent, et d'avoir une boucle courte entre import et publication.

**Besoins clés :** Dashboard de validation rapide · Vue des imports en cours · Contrôle des seuils de confiance · Détection et traitement des lacunes

### Claire — CSM (Customer Success Manager)

Claire gère un portefeuille de clients. Elle veut déléguer les questions répétitives (L1) à l'agent IA, préparer un appel client en 2 minutes, et retrouver une procédure sans parcourir 5 documents.

**Besoins clés :** Accès rapide aux fiches "guide de situation" · Assistant pour préparer les appels · Délégation des tickets simples à l'agent

### Marc — Sales / Account Executive

Marc prospecte et gère le pipeline commercial. Il a besoin de répondre aux objections en temps réel, d'accéder aux fiches concurrents, et de recevoir les leads qualifiés par l'agent web même la nuit.

**Besoins clés :** Fiches objections prêtes à l'emploi · Fiches concurrents · Leads qualifiés transmis avec contexte · Réponses aux objections via l'assistant

### Sophie — Ops / Interne

Sophie prépare des comptes-rendus, résume des webinaires importés et génère des drafts de réponse pour des situations transverses (réunions stratégiques, onboarding, RH). Elle n'est pas technique et attend une interface conversationnelle simple.

**Job-to-be-done principal pour le MVP :** "Préparer le compte-rendu d'une réunion client en 5 minutes à partir d'un webinaire importé."

**Besoins clés :** Chat en langage naturel · Résumés d'imports à la demande · Drafts de réponse générés · Recherche sémantique sans mots-clés exacts

---

## 3. Périmètre MVP

### Dans le scope

- Spike de validation (S0) — valider l'hypothèse RAG avant le build complet
- Infrastructure RAG vectorielle (Supabase + pgvector)
- Module d'import : 5 types de contenus (audio, vidéo, PDF, PPTX, URL)
- Pipeline de traitement IA automatique (extraction + analyse + drafts)
- 5 types de fiches structurées (objection, guide de situation, cas client, concurrent, doc CertiPlace)
- Boucle d'auto-amélioration (détection des lacunes → drafts `missing_info` → notification admin)
- Dashboard de validation admin
- Assistant IA interne (chat conversationnel, profil-aware, RAG)
- CSM Digital — widget dans CertiPlace *(S7-S8)*
- Sales Digital — chatbot sur certiplace.fr *(S9-S10)*
- Mémoire conversationnelle par utilisateur (assistant interne + agents externes)
- Escalade intelligente vers humain avec contexte

### Hors scope MVP

- **Multi-tenant déployé aux clients CertiPlace** — CertiBase est en usage interne uniquement pour le MVP. La colonne `tenant_id` est préservée dans le schéma pour la future extension.
- Analytics avancés et tableaux de bord personnalisés
- Intégrations CRM tierces (Salesforce, HubSpot)
- Veille concurrentielle automatisée n8n *(Could — si temps disponible en S5-S6)*
- IA proactive (suggestions et alertes initiées par l'agent sans sollicitation)
- Export de fiches et rapports

### Clarification scope — Usage interne uniquement

Pour le MVP, CertiBase est déployé exclusivement pour les équipes CertiPlace (Alex, Claire, Marc, Sophie). Les agents externes (CSM Digital, Sales Digital) sont développés dans le MVP mais servent des usages internes de validation avant tout déploiement client. Les accès sont simplifiés : authentification Supabase Auth, 4 rôles (`admin`, `csm`, `sales`, `new`), pas de gestion multi-organismes.

**Rôle `new`** : les utilisateurs avec le rôle `new` ont accès en lecture seule à l'assistant interne et aux fiches publiées. Ils ne peuvent pas importer ni valider. L'admin les upgrade vers `csm` ou `sales` à l'onboarding.

---

## 4. Fonctionnalités

### 4.0 Spike de validation — Semaine 0

**FR-00 — Spike : valider l'hypothèse RAG avant le build**

Avant de lancer l'infrastructure complète, l'équipe crée manuellement 10 à 15 fiches représentatives (2-3 par type), les insère directement en base, et construit un RAG minimal (sans pipeline d'import). 3 utilisateurs internes (Claire, Marc, Sophie) interrogent l'assistant pendant 2-3 jours.

**Critères de succès du spike :**
- ≥ 70 % des questions testées obtiennent une réponse pertinente (similarité > 0,75)
- Au moins 2 utilisateurs sur 3 estiment que la réponse leur aurait fait gagner du temps

Si le spike échoue → révision des types de fiches et du prompt d'analyse avant S1. Si le spike réussit → S1 commence avec une base de fiches validée et une confiance dans la structure.

**Durée :** 3-5 jours. **Responsable :** Alex (import manuel) + équipe dev (RAG minimaliste).

---

### 4.1 Module Import & Pipeline

**FR-01 — Import multi-format**
Le système accepte 5 types de fichiers : audio (mp3, m4a, wav), vidéo (mp4, mov), PDF, PPTX (converti automatiquement en PDF avant traitement), et URL (YouTube, Zoom). L'utilisateur sélectionne le type d'import (webinaire, présentation, appel commercial, document interne) et le profil cible des fiches à générer.

**FR-02 — Pipeline de traitement automatique**
Après upload, le système déclenche automatiquement : (1) extraction du texte/transcription, (2) analyse IA et génération de drafts, (3) notification admin pour validation. L'utilisateur suit l'avancement via un indicateur de statut (`pending → extracting → analyzing → ready / error`).

**FR-03 — Extraction texte**
Le système transcrit les fichiers audio/vidéo via un service de transcription spécialisé. Les PDFs et PPTX (convertis en PDF) sont traités directement par l'IA sans dépendance externe supplémentaire. Les URLs YouTube utilisent l'API de sous-titres.

**FR-04 — Analyse IA et génération de drafts**
À partir du texte extrait, l'IA produit en un seul appel un ensemble de drafts structurés : objections détectées, FAQ, moments clés, angles morts. Chaque draft inclut un score de confiance (0–1) et une référence à la source (timestamp ou numéro de page).

**FR-05 — Notification admin à la fin du pipeline** *(Should)*
À la fin du traitement d'un import (statut `ready` ou `error`), l'admin reçoit une notification in-app. La notification par email est une évolution post-MVP.

### 4.2 Base de Connaissance & Fiches

**FR-06 — 5 types de fiches publiées**

| Type | Contenu clé | Profil cible |
|---|---|---|
| Objection | Verbatim + réponse flash + preuve | Sales, CSM |
| Guide de situation | Déclencheur + étapes + messages type | CSM |
| Cas client | Problème + solution + résultat chiffré | Sales, CSM |
| Concurrent | Positionnement + pricing + nos arguments | Sales |
| Doc CertiPlace | Contenu officiel indexé automatiquement | Tous |

**FR-07 — Recherche sémantique RAG**
Toutes les fiches publiées sont indexées en vecteurs. La recherche retourne les fiches pertinentes en moins de 2 secondes, sans nécessiter de mots-clés exacts. Le seuil de similarité par défaut est 0,75 — configurable par admin.

**FR-08 — Cycle de vie des fiches**
Une fiche passe par les statuts `draft → published → archived`. Seules les fiches `published` sont interrogeables par les agents et l'assistant interne. L'admin peut archiver une fiche expirée ou incorrecte.

**FR-09 — Boucle d'auto-amélioration (missing_info)**
Quand un agent ou l'assistant interne reçoit une question sans fiche pertinente (similarité < seuil), le système crée automatiquement un draft de type `missing_info` contenant : la question posée, le contexte de la conversation, et la date. Le dashboard admin affiche ces drafts en file prioritaire pour guider les prochains imports. C'est le mécanisme par lequel CertiBase s'améliore à l'usage.

**FR-10 — Création manuelle de fiches** *(Should)*
L'admin peut créer une fiche directement sans passer par un import. Cas d'usage : ajouter une connaissance urgente non capturée par le pipeline, corriger une fiche existante.

### 4.3 Agents Externes

#### CSM Digital (S7–S8)

**FR-11 — Widget flottant dans CertiPlace**
Un widget de chat s'intègre dans l'interface CertiPlace. Il est accessible aux utilisateurs clients connectés. `[ASSUMPTION]` L'intégration se fait via un script JS injecté dans CertiPlace — méthode à valider avec l'équipe CertiPlace avant S5.

**FR-12 — Contextualisation client temps réel (deux scénarios)**

*Scénario A — API CertiPlace disponible à S5 :* L'agent reçoit l'identifiant client (`certiplace_client_id`) et adapte ses réponses au contexte spécifique (phase d'onboarding, fonctionnalités activées, historique récent). Ce scénario offre la pleine valeur du CSM Digital.

*Scénario B — API CertiPlace non disponible à S5 :* Le CSM Digital fonctionne sans contextualisation client. Les réponses sont génériques (basées uniquement sur les fiches). La valeur est réduite mais le déploiement n'est pas bloqué. La contextualisation est ajoutée dès que l'API est disponible.

La décision A/B doit être prise avant S5. Par défaut, on planifie le Scénario B et on upgrade vers A si l'API est confirmée.

**FR-13 — Escalade intelligente**
Quand l'agent ne peut pas répondre avec confiance, il transfère la conversation au CSM humain avec le contexte complet : historique de la conversation, question en suspens, données client.

**FR-14 — Mémoire conversationnelle — CSM Digital**
L'agent mémorise les conversations précédentes par utilisateur client. Un client qui revient n'a pas à réexpliquer son contexte. La durée de rétention est de 90 jours par défaut `[ASSUMPTION]`.

#### Sales Digital (S9–S10)

**FR-15 — Chatbot sur certiplace.fr**
Un chatbot répond aux visiteurs du site marketing 24h/24. Il présente les fonctionnalités pertinentes selon les besoins exprimés et gère les objections commerciales courantes.

**FR-16 — Qualification des prospects**
L'agent collecte les informations de qualification via une conversation naturelle. Les critères de scoring sont : type d'organisme, nombre de certifications, besoin identifié (support / gestion / reporting), et niveau d'urgence. Un score sur 100 est calculé et transmis avec le contexte de la conversation au Sales humain.

**FR-17 — Transmission de contexte au Sales**
Quand un prospect souhaite être contacté ou que l'agent atteint ses limites, il transfère vers un Sales humain avec le contexte complet et le score de qualification.

**FR-18 — Mémoire conversationnelle — Sales Digital**
L'agent mémorise les échanges précédents avec un prospect identifié (email ou cookie). Un prospect qui revient trouve une conversation qui reprend là où elle s'est arrêtée.

### 4.4 IA Interne — Assistant CertiBase

**FR-19 — Interface chat accessible aux utilisateurs connectés**
Une interface de chat conversationnel est disponible dans l'application pour tous les utilisateurs authentifiés (CSM, Sales, Ops, Admin). Accessible depuis la navigation principale.

**FR-20 — RAG sur la base de connaissance**
Chaque question utilisateur déclenche une recherche sémantique sur les fiches publiées. L'assistant synthétise les résultats pertinents et cite les sources (titre de fiche, type).

**FR-21 — Réponses profil-aware**
L'assistant adapte le contenu et le niveau de détail de ses réponses selon le rôle de l'utilisateur connecté : un CSM reçoit des guides de situation et protocoles ; un Sales reçoit des objections et arguments commerciaux ; un Admin a accès à la vue complète.

**FR-22 — Génération de drafts à la demande**
L'utilisateur peut demander à l'assistant de générer un draft de réponse email, un résumé de fiche, ou une synthèse d'un import récent. Le draft est présenté dans le chat, prêt à être copié.

**FR-23 — Mémoire conversationnelle interne** *(Should)*
L'assistant mémorise le contexte des conversations précédentes pour chaque utilisateur. Durée de rétention : 90 jours `[ASSUMPTION]` — à valider avec les contraintes RGPD avant S7.

### 4.5 Dashboard Admin & Validation

**FR-24 — File de validation des drafts**
Le dashboard affiche tous les drafts en attente (`status = pending`), groupés par import et priorisés par type (`missing_info` en tête, puis par score de confiance décroissant). L'admin peut approuver, rejeter ou modifier chaque draft avant publication.

**FR-25 — Vue d'ensemble des imports**
Liste des imports récents avec statut en temps réel, nombre de drafts générés, et actions disponibles (relancer, supprimer, voir les drafts).

**FR-26 — Gestion des utilisateurs**
L'admin peut inviter de nouveaux utilisateurs, leur assigner un rôle (`admin`, `csm`, `sales`, `new`), et désactiver des comptes. Les utilisateurs `new` sont en lecture seule jusqu'à assignation d'un rôle actif.

---

## 5. Exigences Non-Fonctionnelles

### Performance

**NFR-01 — Latence RAG**
La recherche sémantique retourne des résultats en moins de 2 secondes (p95), pour une base allant jusqu'à 10 000 fiches. L'index vectoriel est créé dès la migration initiale S1-S2.

**NFR-02 — Latence assistant interne**
La première réponse (token stream initié) arrive en moins de 3 secondes après l'envoi du message (p95). Le streaming est activé pour les réponses longues.

**NFR-03 — Pipeline d'import**
Le traitement d'un fichier audio de 60 minutes se complète en moins de 15 minutes. L'utilisateur reçoit une notification in-app à la fin du traitement.

### Fiabilité

**NFR-04 — Escalade sur faible confiance**
Un agent externe qui ne trouve pas de fiche avec une similarité ≥ 0,75 ne doit pas inventer une réponse. Il propose systématiquement une escalade vers un humain et crée un draft `missing_info` (FR-09).

**NFR-05 — Graceful degradation**
Si le service d'IA est indisponible, le chat affiche un message explicite et les fiches restent consultables. Le pipeline d'import met les traitements en file d'attente.

**NFR-06 — Idempotence du pipeline**
Relancer un import en erreur ne crée pas de doublons de drafts. Les drafts existants pour cet import sont supprimés avant de relancer.

### Sécurité & Accès

**NFR-07 — Authentification obligatoire**
Toutes les routes de l'application (hors agents publics) exigent une authentification Supabase Auth.

**NFR-08 — Row Level Security (RLS)**
Les règles RLS garantissent qu'un utilisateur accède uniquement aux données autorisées par son rôle. Fiches publiées : lisibles par tous les authentifiés. Import / validation / écriture : réservés aux admins.

**NFR-09 — Isolation MVP interne**
Tous les utilisateurs appartiennent à l'organisation CertiPlace. Aucune donnée d'un client externe CertiPlace ne transite dans CertiBase MVP. Instance Supabase dédiée à CertiBase `[ASSUMPTION]`.

**NFR-10 — Clés API sécurisées**
Les clés Claude API, Whisper API et Supabase service role ne sont jamais exposées côté client. Tous les appels transitent par des routes API Next.js server-side.

### Qualité des Réponses IA

**NFR-11 — Non-hallucination**
Les agents et l'assistant basent leurs réponses exclusivement sur les fiches RAG retournées. Si le contexte est insuffisant, la réponse l'indique explicitement et déclenche FR-09.

**NFR-12 — Citation des sources**
Chaque réponse de l'assistant interne incluant des informations factuelles cite la fiche source (titre + type). Les agents externes citent en interne sans nécessairement afficher au client final.

---

## 6. Plan de Seeding Initial

La qualité des agents dépend directement de la qualité de la base. Sans fiches suffisantes, les agents escaladent en permanence et la valeur est nulle.

### Jalons de seeding

| Jalon | Cible | Responsable | Condition de déclenchement |
|---|---|---|---|
| S0 (spike) | 10-15 fiches manuelles | Alex | Avant démarrage S1 |
| Fin S4 | ≥ 30 fiches publiées | Alex + pipeline | Pipeline import opérationnel |
| Avant S7 | ≥ 50 fiches publiées | Alex | Condition préalable au déploiement CSM Digital |
| Avant S9 | ≥ 100 fiches publiées | Alex + auto-amélioration | Condition préalable au déploiement Sales Digital |

### Contenu prioritaire pour le seeding

1. Les 3 webinaires internes les plus riches (top objections, Q&A clients)
2. Les présentations commerciales principales (argumentaire, concurrents)
3. Les 5 procédures CSM les plus demandées
4. Les 3 cas clients les plus cités en appel

---

## 7. Métriques de Succès

### Métriques primaires

| Indicateur | Cible | Délai | Contre-métrique |
|---|---|---|---|
| **Réduction tickets support L1/L2** | −40 % | Dès le CSM Digital (S8) | Taux d'escalade agent > 50 % → base insuffisante |
| **Leads qualifiés 24h/24** | ≥ 1 lead qualifié / jour hors horaires | Dès le Sales Digital (S10) | Taux d'abandon > 40 % → agent trop agressif |
| **Réduction temps de recherche interne** | −60 % | Dès l'assistant interne V1 (S6) | Sessions chat abandonnées après 1 réponse > 40 % |

### Métriques de santé de la base

| Indicateur | Cible | Fréquence |
|---|---|---|
| Taux de couverture RAG | ≥ 80 % des questions avec similarité > 0,75 | Hebdomadaire |
| Fiches publiées actives | Jalons seeding respectés | Par sprint |
| Délai import → publication | < 24h | Par import |
| Taux de rejet des drafts admin | < 40 % (au-delà : qualité extraction à revoir) | Par sprint |

---

## 8. Roadmap MVP — 11 Semaines

| Sprint | Livrable | Valeur immédiate | Persona bénéficiaire |
|---|---|---|---|
| **S0** | Spike validation : 10-15 fiches manuelles + RAG minimal + test avec 3 utilisateurs | Validation de l'hypothèse RAG avant investissement | Claire, Marc, Sophie |
| **S1–S2** | Tables Supabase + pgvector + Edge Function embedding + `match_documents` | Infrastructure RAG opérationnelle | Alex |
| **S3–S4** | Module import complet (audio/vidéo/PDF/PPTX/URL) + pipeline Claude JSON + dashboard validation | Premiers imports traitables, fiches publiables | Alex |
| **S5–S6** | Interface fiches + boucle auto-amélioration + Assistant interne V1 (chat RAG, profil-aware) | Équipes assistées, −60 % temps recherche | Claire, Marc, Sophie |
| **S7–S8** | CSM Digital dans CertiPlace + escalade intelligente + mémoire (Scénario A ou B selon API) | −40 % tickets support L1/L2 | Claire, clients |
| **S9–S10** | Sales Digital sur certiplace.fr + qualification + score leads + mémoire prospect | Leads qualifiés 24h/24 | Marc, prospects |

### Dépendances critiques

- **S1 dépend de S0** : si le spike échoue, la structure des fiches est révisée avant de construire l'infrastructure
- **S3 dépend de S1** : l'infrastructure embedding doit être prête avant le pipeline import
- **S7 dépend du seeding** : ≥ 50 fiches publiées avant de déployer le CSM Digital
- **S9 dépend de S7** : les patterns d'escalade validés avec le CSM Digital avant le Sales Digital
- **FR-12 Scénario A/B** : décision avant S5 sur la disponibilité de l'API CertiPlace

---

## 9. Questions Ouvertes

| # | Question | Impact | Décision attendue |
|---|---|---|---|
| Q1 | **Intégration CSM Digital** : injection via script JS tiers ou iframe ? Validation équipe CertiPlace requise. | Architecture S7 | Avant S5 |
| Q2 | **API contexte client CertiPlace** : l'endpoint existe-t-il ? Quels champs expose-t-il ? Sinon → Scénario B par défaut. | FR-12 | Avant S5 |
| Q3 | **Seuil de confiance RAG** : uniforme à 0,75 ou différencié par type de fiche (ex : 0,85 pour concurrents) ? | NFR-04, FR-07 | Avant S3 |
| Q4 | **Rétention des historiques de conversation** : durée légale RGPD ? Impact sur la mémoire (FR-14, FR-18, FR-23). | Conformité | Avant S7 |
| Q5 | **Veille concurrentielle n8n** : quels sites ? Quelle fréquence ? Validation légale du scraping ? | FR Could | Avant S5 si priorisé |
| Q6 | **Résultats du spike S0** : la structure de fiches actuelle est-elle validée ou doit-elle être révisée ? | Toute la roadmap | Fin S0 |
| Q7 | **Critères de scoring leads** : les 4 critères proposés (FR-16) sont-ils validés par Marc ? | FR-16 | Avant S9 |
| Q8 | **Staging agents externes** : quels critères de passage staging → production pour CSM Digital et Sales Digital ? | DoD S7-S10 | Avant S7 |
