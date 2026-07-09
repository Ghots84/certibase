---
baseline_commit: NO_VCS
---

# Story 1.3 : Spike de validation RAG

Status: done

## Story

En tant qu'Alex (Admin),
Je veux insérer 13 fiches de test et les interroger via la page Assistant,
Afin de valider que la structure de fiches et le RAG retournent des réponses pertinentes avant de construire le pipeline complet.

## Acceptance Criteria

1. 13 fiches de test (2-3 par type) sont insérées dans Supabase avec `status = published` et leur embedding généré (VECTOR 1536D)
2. Les 5 types sont couverts : `objection`, `guide_situation`, `cas_client`, `concurrent`, `doc_certiplace`
3. Chaque fiche a un `profil_cible` adapté et un contenu riche (≥ 150 mots)
4. La page `/assistant` expose un chat fonctionnel : input → appel RAG → réponse Claude avec sources citées
5. Au moins 70% des questions de validation retournent une fiche avec `similarity > 0.75`
6. Chaque réponse affiche le titre et le type de la fiche source
7. Le taux de couverture est documenté → décision Go/No-Go Epic 2

## Tasks / Subtasks

- [ ] Task 1 — Script de seed (AC: 1, 2, 3)
  - [ ] Créer `scripts/seed-fiches.ts` (Node.js + OpenAI + Supabase service role)
  - [ ] 13 fiches : 3 doc_certiplace + 3 objection + 3 guide_situation + 2 cas_client + 2 concurrent
  - [ ] Contenu basé sur doc.certiplace.fr (tarifs, espace candidat, blocs compétences, etc.)
  - [ ] Générer l'embedding via OpenAI text-embedding-3-small avant insertion (bypass webhook)
  - [ ] Ajouter commande npm `"seed": "tsx scripts/seed-fiches.ts"` dans package.json

- [ ] Task 2 — Route API RAG (AC: 4, 5, 6)
  - [ ] Créer `app/api/rag/route.ts` (POST, server-side)
  - [ ] Étape 1 : générer l'embedding de la question (OpenAI text-embedding-3-small)
  - [ ] Étape 2 : appeler `match_documents()` via Supabase RPC (server client)
  - [ ] Étape 3 : appeler Claude API (claude-sonnet-4-6) avec les fiches comme contexte
  - [ ] Streaming activé (NFR-02 : premier token < 3s)
  - [ ] Retourner : stream SSE avec chunks texte + event `sources` en fin de stream

- [ ] Task 3 — Page Assistant minimale (AC: 4, 6)
  - [ ] Remplacer le placeholder `app/(dashboard)/assistant/page.tsx`
  - [ ] Client Component avec état : messages[], input, loading
  - [ ] ProfilePicker : 4 boutons (CSM / Sales / Ops / Admin)
  - [ ] Affichage messages user (bulle droite orange) + bot (texte + SourceChips)
  - [ ] SourceChips : chips cliquables titre + badge type sous chaque réponse bot
  - [ ] Appel POST /api/rag avec `{ question, profil }` + lecture du stream SSE

- [ ] Task 4 — Validation du spike (AC: 5, 7)
  - [ ] Exécuter `npm run seed` après déploiement de l'Edge Function webhook
  - [ ] Tester les 10 questions du protocole (section Dev Notes)
  - [ ] Documenter taux de couverture → décision Go/No-Go Epic 2

## Dev Notes

### ⚠️ CRITIQUE — Lire la doc Next.js 16.2.6 AVANT de coder

Lire avant la route API : `node_modules/next/dist/docs/01-app/03-building-your-application/01-routing/12-route-handlers.md`
Lire avant le composant chat : `node_modules/next/dist/docs/01-app/03-building-your-application/02-data-fetching/03-server-actions-and-mutations.md`

### Architecture du spike

```
User question
    │
    ▼
POST /api/rag { question, profil }
    │
    ├─ OpenAI text-embedding-3-small → query_embedding VECTOR(1536)
    │
    ├─ Supabase RPC match_documents(query_embedding, 0.75, 5, profil)
    │   └─ retourne ≤5 fiches {id, title, content, type, similarity}
    │
    ├─ Claude claude-sonnet-4-6 (streaming)
    │   prompt système : "Réponds uniquement depuis les fiches suivantes : [fiches]"
    │   prompt utilisateur : question
    │
    └─ SSE stream → chunks texte + event final "sources"
```

### Pourquoi un script de seed Node.js plutôt qu'un SQL pur

L'Edge Function `generate-embedding` est déclenchée par un Database Webhook Supabase
(configuré manuellement dans le Dashboard). Si le webhook n'est pas actif, les INSERTs SQL
n'ont pas d'embedding → `match_documents()` ne retourne rien.

`scripts/seed-fiches.ts` génère les embeddings directement avant insertion, sans dépendre
du webhook. Idéal pour le spike.

### Variables d'environnement requises

Toutes déjà dans `.env.local` :
- `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` → Supabase admin
- `OPENAI_API_KEY` → embeddings text-embedding-3-small
- `ANTHROPIC_API_KEY` → réponse Claude

### Packages à installer

```bash
npm install @anthropic-ai/sdk openai
```

### Les 13 fiches de seed (contenu inspiré de doc.certiplace.fr)

#### doc_certiplace — 3 fiches (profil_cible: 'all', source: 'doc')

**Fiche D1 — "Offres et tarifs CertiPlace : Standard, Premium et Access"**
```
CertiPlace propose trois offres adaptées aux organismes certificateurs selon leur volume de dossiers et leurs besoins en automatisation.

L'offre Standard est facturée 9,90€ HT par dossier avec un plafond de 500 dossiers par mois. Elle inclut l'accès complet à l'API, les webhooks, et les intégrations natives (Slack, Salesforce, Zapier). Les frais de mise en service s'élèvent à 990€ HT. Cette offre convient aux certificateurs qui souhaitent piloter CertiPlace via leur propre système d'information.

L'offre Premium est facturée 8,90€ HT par dossier plus un abonnement de 199€ HT par mois. Au-delà de 500 dossiers, les dossiers supplémentaires sont offerts, avec un plafond de facturation à 4 450€ HT par mois. Elle inclut toutes les fonctionnalités Standard plus : l'accrochage automatique CDC, la synchronisation France Compétences, l'Espace Candidat, la génération automatique de parchemins et les sessions de jury. Les frais de mise en service sont de 990€ HT.

L'offre Access est identique au Premium (8,90€ HT/dossier + 49€ HT/mois) mais est réservée aux petits organismes et nouveaux certificateurs traitant moins de 100 dossiers annuels. Au-delà de ce seuil, le basculement vers Premium est automatique. Frais de mise en service réduits à 495€ HT.

Tous les plans incluent le stockage sécurisé des dossiers, la génération automatique de documents, les envois automatisés de notifications, l'accès à l'API REST et le support technique CertiPlace.
```
type: doc_certiplace, profil_cible: all

**Fiche D2 — "Espace Candidat CertiPlace : fonctionnement et accès"**
```
L'Espace Candidat CertiPlace est une interface dédiée permettant aux candidats en certification d'accéder en temps réel à l'ensemble de leurs données de dossier. C'est une fonctionnalité disponible sur les offres Premium et Access.

Les candidats accèdent à l'Espace Candidat via un lien pérenne transmis par l'organisme certificateur. Deux modes d'authentification sont disponibles : l'Identité Numérique (FranceConnect) ou un lien magique envoyé par email.

Depuis cet espace, le candidat peut consulter ses informations personnelles, les dates d'inscription à l'examen, les résultats et scores saisis par l'organisme, son parchemin de certification une fois émis, et les documents déposés à son dossier. Les commentaires internes et tags de l'organisme restent invisibles pour le candidat.

Les fonctionnalités clés pour les candidats incluent : le téléchargement des documents de certification, le dépôt de documents complémentaires (si configuré par l'organisme), le partage de réussite sur les réseaux sociaux, et la mise à jour de ses données personnelles pour faciliter l'accrochage au Passeport de Compétences (CDC).

L'organisme certificateur conserve le contrôle total sur les fichiers : les candidats ne peuvent pas modifier les pièces déposées par l'organisme. Les envois de lien d'accès peuvent être automatisés via l'application Messages et Notifications de CertiPlace.
```
type: doc_certiplace, profil_cible: all

**Fiche D3 — "Blocs de compétences RNCP dans CertiPlace"**
```
Les certifications RNCP sont organisées en blocs de compétences, qui peuvent eux-mêmes être subdivisés en compétences individuelles. CertiPlace gère automatiquement la structure des blocs (récupérés depuis les données publiques France Compétences) et permet une gestion manuelle des compétences détaillées.

Configuration par l'organisme certificateur : sur chaque certification, l'organisme peut activer la division par blocs de compétences. Ce mode permet à un candidat d'obtenir une certification partielle : un parcours sans tous les blocs n'est pas certifiant mais reste traçable. C'est fondamental pour les certifications RNCP modulaires.

Gestion au niveau des partenariats : les partenariats entre un certificateur et un organisme de formation peuvent être limités à un sous-ensemble de blocs. Cette restriction optionnelle matérialise une contrainte contractualisée et définit précisément quels blocs seront disponibles pour les dossiers associés à ce partenariat.

Gestion au niveau des dossiers : chaque dossier de certification doit spécifier les blocs visés. Sans formation liée, les blocs doivent être renseignés manuellement par l'administrateur. Avec une formation liée, les blocs se propagent automatiquement à tous les dossiers de la même formation.

Pour les organismes de formation partenaires, la sélection des blocs se fait lors de la création d'une session de formation, garantissant la cohérence entre contenu pédagogique et blocs déclarés à la certification.
```
type: doc_certiplace, profil_cible: all

#### objection — 3 fiches (profil_cible: 'sales', source: 'sales_call')

**Fiche O1 — "Objection prix : 9,90€ par dossier c'est trop cher"**
```
Verbatim fréquent : "Vos tarifs à 9,90€ par dossier représentent un coût important pour nous. On gère nos certifications avec des outils internes moins coûteux."

Réponse flash : Le coût par dossier CertiPlace remplace en réalité plusieurs postes de coûts cachés : temps de saisie manuelle, erreurs de synchronisation CDC, support candidats par email, relances manuelles. Nos clients estiment économiser entre 20 et 40 minutes par dossier sur les tâches administratives.

Éléments de preuve et arguments :
- Le plafonnement à 4 450€ HT/mois en Premium protège les gros volumes : au-delà de 500 dossiers/mois, les dossiers supplémentaires sont gratuits.
- La mise en service unique (990€ HT) est amortie dès le premier mois pour tout organisme traitant 50+ dossiers mensuels.
- L'automatisation CDC (accrochage automatique, synchronisation France Compétences) élimine les rejets et les relances manuelles qui coûtent en moyenne 2 à 3h par dossier rejeté.
- L'offre Access à 49€ HT/mois + 8,90€/dossier permet d'entrer avec un budget réduit pour les petits certificateurs.

Contre-objection : "Pouvez-vous chiffrer votre coût actuel par dossier (saisie + contrôle + envoi + CDC) ?" Souvent, le coût réel dépasse 15-20€ par dossier en incluant le temps humain.
```
type: objection, profil_cible: sales

**Fiche O2 — "Objection technique : l'API est trop complexe à intégrer"**
```
Verbatim fréquent : "Notre équipe technique est petite, on n'a pas les ressources pour développer une intégration API complète avec CertiPlace."

Réponse flash : CertiPlace propose plusieurs niveaux d'intégration selon les capacités techniques de l'organisme. L'offre Premium et Access donnent accès à l'interface graphique complète sans aucune ligne de code nécessaire pour les opérations courantes.

Éléments de preuve et arguments :
- L'offre Standard (API-first) est destinée aux organismes avec une équipe technique. Pour les autres, Premium et Access incluent une interface no-code complète pour gérer dossiers, candidats, parchemins et accrochage CDC.
- L'option Processus Métiers Automatisés (49€ HT/mois) permet de créer des automatisations sans code via une interface visuelle intuitive.
- CertiPlace propose un accompagnement sur mesure pour la conception de processus métiers (prestation complémentaire) pour les organismes qui souhaitent être guidés.
- Les webhooks sortants (notifications automatiques vers Slack, Salesforce, Zapier) ne nécessitent aucun développement côté organisme, juste une configuration dans le dashboard.
- La documentation API est publique et complète sur doc.certiplace.fr, avec des exemples d'intégration pour les cas d'usage courants.

Reformulation : "Quelle est la principale opération que vous souhaitez automatiser ? Nous pouvons vous montrer comment la réaliser sans une seule ligne de code."
```
type: objection, profil_cible: sales

**Fiche O3 — "Objection statu quo : on gère déjà ça avec Excel et email"**
```
Verbatim fréquent : "On s'en sort avec Excel pour suivre nos dossiers et des emails pour communiquer avec les candidats et envoyer à la CDC. Pourquoi changer ?"

Réponse flash : Excel et email fonctionnent jusqu'à un certain volume. Au-delà de 50-100 dossiers par mois, les risques d'erreurs CDC, les pertes de données et le temps de saisie deviennent des problèmes critiques pour la conformité RNCP.

Éléments de preuve et arguments :
- L'accrochage CDC manuel via Excel est source d'erreurs fréquentes (format XML, données manquantes) qui génèrent des rejets. CertiPlace automatise la génération du XML CDC et gère les statuts d'accrochage en temps réel.
- La synchronisation France Compétences (mise à jour automatique des données RNCP) est impossible avec Excel : CertiPlace récupère automatiquement les blocs de compétences et les données certifications.
- L'Espace Candidat remplace des dizaines d'emails hebdomadaires : les candidats consultent eux-mêmes leur statut, leurs documents et leur parchemin.
- La traçabilité est intégrée : CertiPlace conserve l'historique complet de chaque dossier avec horodatage, ce qu'Excel ne garantit pas.
- En cas d'audit France Compétences, CertiPlace génère automatiquement les exports réglementaires. Avec Excel, cet audit nécessite une préparation manuelle de plusieurs jours.

Question diagnostic : "Combien de temps votre équipe passe-t-elle par semaine sur la saisie et le suivi CDC ?"
```
type: objection, profil_cible: sales

#### guide_situation — 3 fiches (profil_cible: 'csm', source: 'manual')

**Fiche G1 — "Guider un client hésitant entre Standard et Premium"**
```
Déclencheur : Un prospect ou client actuel en Standard demande si l'upgrade Premium vaut le surcoût, ou un nouveau prospect ne sait pas quelle offre choisir.

Critères décisionnels clés :
- Volume de dossiers : En dessous de 50 dossiers/mois → Standard suffit. Entre 50 et 200 → analyser les besoins fonctionnels. Au-dessus de 200 → Premium souvent rentable grâce au plafonnement.
- Besoin CDC : Si l'organisme doit accrocher des dossiers à la CDC (certifications RNCP financées CPF), l'accrochage automatique Premium est indispensable. Sinon, la gestion manuelle XML est laborieuse et risquée.
- Candidats B2C : Si les candidats veulent consulter leur dossier en autonomie (résultats, parchemin), l'Espace Candidat Premium est un argument fort.
- Automatisation des documents : Si l'organisme génère des parchemins, attestations et convocations en volume, la génération automatique Premium économise plusieurs heures par semaine.

Étapes de qualification :
1. Demander le volume mensuel de dossiers et la tendance (croissance prévue ?)
2. Vérifier si la certification est RNCP avec financement CPF (obligation CDC)
3. Demander si des parchemins sont émis et à quelle fréquence
4. Évaluer la maturité technique (l'équipe veut-elle piloter en API ou en interface ?)

Messages type :
- "Avec [X] dossiers par mois et un financement CPF, l'accrochage automatique Premium vous fera économiser [estimation] heures par mois sur la gestion CDC."
- "L'offre Access est conçue pour votre situation : vous bénéficiez de toutes les fonctionnalités Premium mais avec un abonnement de 49€/mois au lieu de 199€, idéal pour démarrer."
```
type: guide_situation, profil_cible: csm

**Fiche G2 — "Accompagner la mise en place de l'Espace Candidat"**
```
Déclencheur : Un client Premium veut activer l'Espace Candidat pour la première fois, ou un client se plaint que ses candidats appellent trop souvent pour connaître leur statut.

Prérequis techniques :
- Offre Premium ou Access active
- Authentification : choisir entre Identité Numérique (FranceConnect) et lien magique email
- Décider quels documents les candidats peuvent déposer (pièce d'identité, diplômes, etc.)
- Préparer le modèle de message pour l'envoi du lien d'accès

Étapes de déploiement :
1. Activer l'Espace Candidat dans les paramètres de la certification concernée
2. Configurer les documents téléchargeables (parchemin activé automatiquement si généré)
3. Configurer les dépôts documents candidats autorisés (optionnel)
4. Créer le message automatique d'envoi du lien via Messages & Notifications
5. Tester avec un dossier pilote avant déploiement à grande échelle
6. Former l'équipe sur les cas d'usage : que voit le candidat ? Que ne voit-il pas ?

Points d'attention :
- Les commentaires internes et tags CertiPlace ne sont jamais visibles par le candidat.
- Le candidat peut modifier ses données personnelles dans l'Espace Candidat pour l'accrochage CDC : prévoir une communication claire sur ce point.
- Pour les certifications RNCP CPF, l'Identité Numérique est recommandée : elle facilite l'accrochage Passeport de Compétences.

Message type post-activation : "Votre Espace Candidat est actif. Vos candidats reçoivent maintenant un lien automatique dès l'inscription. Résultat attendu : réduction de 60-80% des appels entrants sur le statut de dossier."
```
type: guide_situation, profil_cible: csm

**Fiche G3 — "Gérer un rejet d'accrochage CDC avec un client"**
```
Déclencheur : Un client signale que des dossiers sont bloqués en statut "rejet CDC" ou que la Caisse des Dépôts a retourné des erreurs sur des dossiers RNCP.

Causes fréquentes de rejet :
1. Numéro de sécurité sociale manquant ou incorrect (obligatoire pour l'accrochage)
2. Données du Passeport de Compétences non complétées par le candidat (identité, date de naissance)
3. Incohérence entre les blocs de compétences déclarés et ceux enregistrés France Compétences
4. Dossier en statut "Prêt à passer" alors que l'examen a déjà eu lieu (date non mise à jour)
5. Format XML non conforme (survient généralement si des champs obligatoires sont vides)

Étapes de résolution :
1. Identifier la cause depuis l'onglet "Statut d'accrochage CertiPlace" du dossier concerné
2. Si données candidat manquantes : envoyer le lien Passeport de Compétences au candidat via Messages & Notifications avec message d'urgence
3. Si numéro SS manquant : demander au candidat de le renseigner dans l'Espace Candidat (si l'organisme est habilité à collecter cette donnée)
4. Si incohérence blocs : vérifier la configuration des blocs sur le partenariat et les corriger
5. Relancer l'accrochage depuis l'interface CertiPlace une fois les corrections effectuées

Prévention :
- Activer les messages automatiques en cas d'accrochage échoué (paramétrable dans Messages & Notifications)
- Vérifier systématiquement la complétude des données avant envoi à la CDC via le checklist CertiPlace
- Pour les certifications CPF, imposer l'Identité Numérique à la candidature : les données sont pré-remplies et fiables.
```
type: guide_situation, profil_cible: csm

#### cas_client — 2 fiches (profil_cible: 'sales', source: 'manual')

**Fiche C1 — "CFA Métitech : réduction de 65% du temps de gestion CDC"**
```
Profil client : CFA Métitech, organisme certificateur RNCP gérant 180 dossiers par mois en BTS et Licence Professionnelle, anciennement sur process Excel + emails manuels.

Problème initial : L'équipe administrative passait en moyenne 35 minutes par dossier sur les tâches CDC : saisie des données dans le fichier XML, vérification des champs obligatoires, envoi manuel, suivi des rejets et relances candidats. Avec 180 dossiers/mois, cela représentait environ 100 heures de travail administratif mensuel, soit 1,25 ETP dédié.

Le taux de rejet CDC atteignait 12% des dossiers, générant en cascade des relances manuelles et des retards dans le financement CPF pour les candidats.

Solution déployée : Passage à CertiPlace Premium avec activation de l'accrochage automatique CDC, de l'Espace Candidat et de la génération automatique des parchemins. Déploiement en 3 semaines avec accompagnement CertiPlace.

Résultats mesurés à 3 mois :
- Temps de gestion par dossier réduit de 35 min à 12 min (−65%)
- Taux de rejet CDC tombé de 12% à 2,3% grâce à la vérification automatique des données avant envoi
- Volume d'appels entrants candidats réduit de 70% grâce à l'Espace Candidat
- ROI calculé : économie de 80h/mois × coût chargé → le plan Premium amorti en 2,5 mois

Citation : "On a récupéré l'équivalent d'un mi-temps sur les tâches administratives. Notre équipe se concentre maintenant sur l'accompagnement pédagogique."
```
type: cas_client, profil_cible: sales

**Fiche C2 — "Institut de Certification Proforma : taux d'accrochage CDC à 98%"**
```
Profil client : Institut de Certification Proforma, certificateur RNCP spécialisé en certifications commerciales et management, 90 dossiers/mois, fortement exposé aux financements CPF.

Problème initial : Proforma rencontrait des difficultés récurrentes avec l'accrochage CDC. Le taux de succès stagnait à 78%, entraînant des délais de remboursement CPF de 3 à 6 semaines supplémentaires pour les candidats concernés. La cause principale : des données candidats incomplètes ou erronées (numéro SS, identité, blocs de compétences) détectées seulement lors de l'envoi à la CDC.

Solution déployée : CertiPlace Access (puis upgrade Premium à 6 mois) avec déploiement de l'Identité Numérique obligatoire à la candidature. Les candidats s'authentifient via FranceConnect dès l'inscription, pré-remplissant automatiquement les données d'identité et le Passeport de Compétences. Activation des alertes automatiques de données manquantes avant soumission CDC.

Résultats mesurés à 6 mois :
- Taux d'accrochage CDC réussi du premier coup : 98% (vs 78% avant)
- Délai moyen de remboursement CPF : réduit de 38 jours à 12 jours
- Suppression des relances manuelles sur données manquantes : économie estimée à 15h/mois
- Satisfaction candidats : note de satisfaction post-certification passée de 3,8 à 4,6/5

Citation : "L'obligation d'Identité Numérique à la candidature a tout changé. On n'a presque plus de rejets CDC et nos candidats sont remboursés beaucoup plus vite."
```
type: cas_client, profil_cible: sales

#### concurrent — 2 fiches (profil_cible: 'sales', source: 'manual')

**Fiche V1 — "CertiPlace vs gestion manuelle (Excel + email + XML manuel)"**
```
Contexte concurrentiel : La majorité des petits et moyens certificateurs RNCP gèrent encore leurs dossiers avec un assemblage de fichiers Excel, d'emails manuels et d'exports XML construits à la main pour la CDC. Ce statu quo est le principal "concurrent" de CertiPlace sur le segment des certificateurs < 200 dossiers/mois.

Positionnement CertiPlace :
CertiPlace est la solution SaaS dédiée à la certification professionnelle RNCP, conçue pour automatiser l'intégralité du cycle de vie du dossier de certification : de la création à l'accrochage CDC, en passant par la communication candidat et la génération documentaire.

Comparatif objectif :

| Dimension | Excel + Email | CertiPlace Standard | CertiPlace Premium |
|-----------|--------------|--------------------|--------------------|
| Temps/dossier | 35-45 min | 10-15 min | 8-12 min |
| Accrochage CDC | Manuel XML | API + webhooks | Automatique |
| Espace Candidat | Non | Non | Oui |
| Taux rejet CDC moyen | 10-15% | 3-5% | <3% |
| Traçabilité | Partielle | Complète | Complète |
| Coût/dossier estimé | 12-18€ (temps humain) | 9,90€ | 8,90€ + abo |

Arguments différenciants face au statu quo :
- Conformité RNCP : CertiPlace est maintenu à jour des évolutions réglementaires CDC. Excel nécessite une veille manuelle.
- Scalabilité : passer de 50 à 300 dossiers/mois avec Excel multiplie la charge par 6. Avec CertiPlace, la charge administrative reste quasi-constante.
- Risque d'audit : CertiPlace génère automatiquement les rapports d'activité et exports réglementaires. Excel = risque de non-conformité en cas de contrôle France Compétences.
```
type: concurrent, profil_cible: sales

**Fiche V2 — "CertiPlace vs développement interne sur mesure"**
```
Contexte concurrentiel : Certains certificateurs disposant d'une DSI envisagent de développer leur propre outil de gestion des certifications plutôt que d'adopter une solution SaaS. Ce choix est présenté comme plus adapté à leurs besoins spécifiques et moins coûteux à long terme.

Positionnement CertiPlace :
CertiPlace est un SaaS métier éprouvé, intégrant 5 ans de retours d'expérience terrain sur les contraintes CDC, France Compétences et RNCP. Développer en interne équivaut à recréer ces connaissances métier depuis zéro.

Arguments contre le développement interne :

Coût réel :
- Un développeur senior = 60-80k€/an chargé. Un outil de gestion certifications minimal (CRUD + CDC + documents) nécessite 6 à 12 mois de développement initial.
- Maintenance réglementaire continue : les mises à jour CDC (format XML, nouvelles obligations) représentent 1 à 2 mois de développement supplémentaire par an.
- CertiPlace Access : 495€ de setup + 49€/mois = moins de 1 100€ la première année.

Risque réglementaire :
- L'accrochage CDC et la synchronisation France Compétences sont soumis à des mises à jour fréquentes (format dictionnaire XML, nouvelles règles d'éligibilité CPF). CertiPlace absorbe ces évolutions sans coût supplémentaire. Une DSI interne doit les anticiper, les tester et les déployer sous contrainte de délai.

Time-to-market :
- CertiPlace : opérationnel en 3 à 4 semaines.
- Développement interne : 6 à 18 mois avant la première mise en production.

Quand le développement interne est pertinent :
- Si l'organisme a des besoins très spécifiques non couverts par l'API CertiPlace et refuse toute standardisation. Dans ce cas, l'API CertiPlace peut servir de backend certifications tout en laissant la liberté UI.

Conclusion : CertiPlace et développement interne ne sont pas nécessairement opposés — l'API CertiPlace peut être intégrée dans une application sur mesure.
```
type: concurrent, profil_cible: sales

### Protocole de validation (Task 4)

10 questions de test réparties par profil :

**Profil Sales :**
1. "Quelle est la différence entre l'offre Standard et Premium ?"
2. "Combien coûte CertiPlace par dossier ?"
3. "Comment répondre à un prospect qui dit que c'est trop cher ?"
4. "Qu'est-ce que CertiPlace a de mieux qu'Excel pour gérer des certifications RNCP ?"

**Profil CSM :**
5. "Comment aider un client qui a des rejets CDC ?"
6. "Quand conseiller le passage de Standard à Premium ?"
7. "Comment mettre en place l'Espace Candidat pour un client ?"

**Profil All :**
8. "C'est quoi les blocs de compétences dans CertiPlace ?"
9. "Comment fonctionne le Passeport de Compétences ?"
10. "Quels sont les frais de mise en service ?"

Critère de succès : ≥ 7/10 questions retournent une fiche avec similarity > 0.75 → Go Epic 2.

### Structure de fichiers à créer

```
scripts/
  seed-fiches.ts          ← Task 1

app/
  api/
    rag/
      route.ts            ← Task 2
  (dashboard)/
    assistant/
      page.tsx            ← Task 3 (remplace placeholder)
      chat-interface.tsx  ← Task 3 (Client Component isolé)
```
