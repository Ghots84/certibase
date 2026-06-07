// Script de seed — Story 1.3 : Spike de validation RAG
// Usage : npm run seed
// Génère les embeddings via OpenAI avant insertion (indépendant du webhook Supabase)

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import * as dotenv from 'fs'

// Charger .env.local manuellement (tsx ne charge pas automatiquement .env.local)
function loadEnv() {
  try {
    const envFile = dotenv.readFileSync('.env.local', 'utf-8')
    for (const line of envFile.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const value = trimmed.slice(eqIdx + 1).trim()
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // .env.local absent — on suppose que les vars sont déjà dans l'environnement
  }
}

loadEnv()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

type FicheInsert = {
  type: 'objection' | 'guide_situation' | 'cas_client' | 'concurrent' | 'doc_certiplace'
  title: string
  content: string
  profil_cible: 'csm' | 'sales' | 'new' | 'all' | 'csm_sales'
  source: 'manual' | 'webinar' | 'presentation' | 'sales_call' | 'doc' | 'n8n'
  status: 'published'
  embedding?: number[]
}

const FICHES: FicheInsert[] = [
  // ── doc_certiplace ─────────────────────────────────────────────────────────
  {
    type: 'doc_certiplace',
    title: 'Offres et tarifs CertiPlace : Standard, Premium et Access',
    profil_cible: 'all',
    source: 'doc',
    status: 'published',
    content: `CertiPlace propose trois offres adaptées aux organismes certificateurs selon leur volume de dossiers et leurs besoins en automatisation.

L'offre Standard est facturée 9,90 € HT par dossier avec un plafond de 500 dossiers par mois. Elle inclut l'accès complet à l'API, les webhooks, et les intégrations natives (Slack, Salesforce, Zapier). Les frais de mise en service s'élèvent à 990 € HT. Cette offre convient aux certificateurs qui souhaitent piloter CertiPlace via leur propre système d'information.

L'offre Premium est facturée 8,90 € HT par dossier plus un abonnement de 199 € HT par mois. Au-delà de 500 dossiers, les dossiers supplémentaires sont offerts, avec un plafond de facturation à 4 450 € HT par mois. Elle inclut toutes les fonctionnalités Standard plus : l'accrochage automatique CDC, la synchronisation France Compétences, l'Espace Candidat, la génération automatique de parchemins et les sessions de jury. Les frais de mise en service sont de 990 € HT.

L'offre Access est identique au Premium (8,90 € HT/dossier + 49 € HT/mois) mais est réservée aux petits organismes et nouveaux certificateurs traitant moins de 100 dossiers annuels. Au-delà de ce seuil, le basculement vers Premium est automatique. Frais de mise en service réduits à 495 € HT.

Tous les plans incluent le stockage sécurisé des dossiers, la génération automatique de documents, les envois automatisés de notifications, l'accès à l'API REST et le support technique CertiPlace.`,
  },
  {
    type: 'doc_certiplace',
    title: 'Espace Candidat CertiPlace : fonctionnement et accès',
    profil_cible: 'all',
    source: 'doc',
    status: 'published',
    content: `L'Espace Candidat CertiPlace est une interface dédiée permettant aux candidats en certification d'accéder en temps réel à l'ensemble de leurs données de dossier. C'est une fonctionnalité disponible sur les offres Premium et Access.

Les candidats accèdent à l'Espace Candidat via un lien pérenne transmis par l'organisme certificateur. Deux modes d'authentification sont disponibles : l'Identité Numérique (FranceConnect) ou un lien magique envoyé par email.

Depuis cet espace, le candidat peut consulter ses informations personnelles, les dates d'inscription à l'examen, les résultats et scores saisis par l'organisme, son parchemin de certification une fois émis, et les documents déposés à son dossier. Les commentaires internes et tags de l'organisme restent invisibles pour le candidat.

Les fonctionnalités clés pour les candidats incluent : le téléchargement des documents de certification, le dépôt de documents complémentaires (si configuré par l'organisme), le partage de réussite sur les réseaux sociaux, et la mise à jour de ses données personnelles pour faciliter l'accrochage au Passeport de Compétences (CDC).

L'organisme certificateur conserve le contrôle total sur les fichiers : les candidats ne peuvent pas modifier les pièces déposées par l'organisme. Les envois de lien d'accès peuvent être automatisés via l'application Messages et Notifications de CertiPlace.`,
  },
  {
    type: 'doc_certiplace',
    title: 'Blocs de compétences RNCP dans CertiPlace',
    profil_cible: 'all',
    source: 'doc',
    status: 'published',
    content: `Les certifications RNCP sont organisées en blocs de compétences, qui peuvent eux-mêmes être subdivisés en compétences individuelles. CertiPlace gère automatiquement la structure des blocs (récupérés depuis les données publiques France Compétences) et permet une gestion manuelle des compétences détaillées.

Configuration par l'organisme certificateur : sur chaque certification, l'organisme peut activer la division par blocs de compétences. Ce mode permet à un candidat d'obtenir une certification partielle : un parcours sans tous les blocs n'est pas certifiant mais reste traçable. C'est fondamental pour les certifications RNCP modulaires.

Gestion au niveau des partenariats : les partenariats entre un certificateur et un organisme de formation peuvent être limités à un sous-ensemble de blocs. Cette restriction optionnelle matérialise une contrainte contractualisée et définit précisément quels blocs seront disponibles pour les dossiers associés à ce partenariat.

Gestion au niveau des dossiers : chaque dossier de certification doit spécifier les blocs visés. Sans formation liée, les blocs doivent être renseignés manuellement par l'administrateur. Avec une formation liée, les blocs se propagent automatiquement à tous les dossiers de la même formation.

Pour les organismes de formation partenaires, la sélection des blocs se fait lors de la création d'une session de formation, garantissant la cohérence entre contenu pédagogique et blocs déclarés à la certification.`,
  },

  // ── objection ──────────────────────────────────────────────────────────────
  {
    type: 'objection',
    title: 'Objection prix : 9,90 € par dossier c\'est trop cher',
    profil_cible: 'sales',
    source: 'sales_call',
    status: 'published',
    content: `Verbatim fréquent : "Vos tarifs à 9,90 € par dossier représentent un coût important pour nous. On gère nos certifications avec des outils internes moins coûteux."

Réponse flash : Le coût par dossier CertiPlace remplace en réalité plusieurs postes de coûts cachés : temps de saisie manuelle, erreurs de synchronisation CDC, support candidats par email, relances manuelles. Nos clients estiment économiser entre 20 et 40 minutes par dossier sur les tâches administratives.

Éléments de preuve et arguments :
- Le plafonnement à 4 450 € HT/mois en Premium protège les gros volumes : au-delà de 500 dossiers/mois, les dossiers supplémentaires sont gratuits.
- La mise en service unique (990 € HT) est amortie dès le premier mois pour tout organisme traitant 50+ dossiers mensuels.
- L'automatisation CDC (accrochage automatique, synchronisation France Compétences) élimine les rejets et les relances manuelles qui coûtent en moyenne 2 à 3h par dossier rejeté.
- L'offre Access à 49 € HT/mois + 8,90 €/dossier permet d'entrer avec un budget réduit pour les petits certificateurs.

Contre-objection : "Pouvez-vous chiffrer votre coût actuel par dossier (saisie + contrôle + envoi + CDC) ?" Souvent, le coût réel dépasse 15 à 20 € par dossier en incluant le temps humain.`,
  },
  {
    type: 'objection',
    title: 'Objection technique : l\'API est trop complexe à intégrer',
    profil_cible: 'sales',
    source: 'sales_call',
    status: 'published',
    content: `Verbatim fréquent : "Notre équipe technique est petite, on n'a pas les ressources pour développer une intégration API complète avec CertiPlace."

Réponse flash : CertiPlace propose plusieurs niveaux d'intégration selon les capacités techniques de l'organisme. L'offre Premium et Access donnent accès à l'interface graphique complète sans aucune ligne de code nécessaire pour les opérations courantes.

Éléments de preuve et arguments :
- L'offre Standard (API-first) est destinée aux organismes avec une équipe technique. Pour les autres, Premium et Access incluent une interface no-code complète pour gérer dossiers, candidats, parchemins et accrochage CDC.
- L'option Processus Métiers Automatisés (49 € HT/mois) permet de créer des automatisations sans code via une interface visuelle intuitive.
- CertiPlace propose un accompagnement sur mesure pour la conception de processus métiers (prestation complémentaire) pour les organismes qui souhaitent être guidés.
- Les webhooks sortants (notifications automatiques vers Slack, Salesforce, Zapier) ne nécessitent aucun développement côté organisme, juste une configuration dans le dashboard.

Reformulation : "Quelle est la principale opération que vous souhaitez automatiser ? Nous pouvons vous montrer comment la réaliser sans une seule ligne de code."`,
  },
  {
    type: 'objection',
    title: 'Objection statu quo : on gère déjà ça avec Excel et email',
    profil_cible: 'sales',
    source: 'sales_call',
    status: 'published',
    content: `Verbatim fréquent : "On s'en sort avec Excel pour suivre nos dossiers et des emails pour communiquer avec les candidats et envoyer à la CDC. Pourquoi changer ?"

Réponse flash : Excel et email fonctionnent jusqu'à un certain volume. Au-delà de 50 à 100 dossiers par mois, les risques d'erreurs CDC, les pertes de données et le temps de saisie deviennent des problèmes critiques pour la conformité RNCP.

Éléments de preuve et arguments :
- L'accrochage CDC manuel via Excel est source d'erreurs fréquentes (format XML, données manquantes) qui génèrent des rejets. CertiPlace automatise la génération du XML CDC et gère les statuts d'accrochage en temps réel.
- La synchronisation France Compétences (mise à jour automatique des données RNCP) est impossible avec Excel : CertiPlace récupère automatiquement les blocs de compétences et les données certifications.
- L'Espace Candidat remplace des dizaines d'emails hebdomadaires : les candidats consultent eux-mêmes leur statut, leurs documents et leur parchemin.
- La traçabilité est intégrée : CertiPlace conserve l'historique complet de chaque dossier avec horodatage, ce qu'Excel ne garantit pas.
- En cas d'audit France Compétences, CertiPlace génère automatiquement les exports réglementaires. Avec Excel, cet audit nécessite une préparation manuelle de plusieurs jours.

Question diagnostic : "Combien de temps votre équipe passe-t-elle par semaine sur la saisie et le suivi CDC ?"`,
  },

  // ── guide_situation ────────────────────────────────────────────────────────
  {
    type: 'guide_situation',
    title: 'Guider un client hésitant entre Standard et Premium',
    profil_cible: 'csm',
    source: 'manual',
    status: 'published',
    content: `Déclencheur : Un prospect ou client actuel en Standard demande si l'upgrade Premium vaut le surcoût, ou un nouveau prospect ne sait pas quelle offre choisir.

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
- "Avec X dossiers par mois et un financement CPF, l'accrochage automatique Premium vous fera économiser plusieurs heures par mois sur la gestion CDC."
- "L'offre Access est conçue pour votre situation : vous bénéficiez de toutes les fonctionnalités Premium mais avec un abonnement de 49 €/mois au lieu de 199 €, idéal pour démarrer."`,
  },
  {
    type: 'guide_situation',
    title: 'Accompagner la mise en place de l\'Espace Candidat',
    profil_cible: 'csm',
    source: 'manual',
    status: 'published',
    content: `Déclencheur : Un client Premium veut activer l'Espace Candidat pour la première fois, ou un client se plaint que ses candidats appellent trop souvent pour connaître leur statut.

Prérequis techniques :
- Offre Premium ou Access active
- Authentification : choisir entre Identité Numérique (FranceConnect) et lien magique email
- Décider quels documents les candidats peuvent déposer (pièce d'identité, diplômes, etc.)
- Préparer le modèle de message pour l'envoi du lien d'accès

Étapes de déploiement :
1. Activer l'Espace Candidat dans les paramètres de la certification concernée
2. Configurer les documents téléchargeables (parchemin activé automatiquement si généré)
3. Configurer les dépôts documents candidats autorisés (optionnel)
4. Créer le message automatique d'envoi du lien via Messages et Notifications
5. Tester avec un dossier pilote avant déploiement à grande échelle
6. Former l'équipe sur les cas d'usage : que voit le candidat ? Que ne voit-il pas ?

Points d'attention :
- Les commentaires internes et tags CertiPlace ne sont jamais visibles par le candidat.
- Le candidat peut modifier ses données personnelles dans l'Espace Candidat pour l'accrochage CDC : prévoir une communication claire sur ce point.
- Pour les certifications RNCP CPF, l'Identité Numérique est recommandée : elle facilite l'accrochage Passeport de Compétences.

Message type post-activation : "Votre Espace Candidat est actif. Vos candidats reçoivent maintenant un lien automatique dès l'inscription. Résultat attendu : réduction de 60 à 80 % des appels entrants sur le statut de dossier."`,
  },
  {
    type: 'guide_situation',
    title: 'Gérer un rejet d\'accrochage CDC avec un client',
    profil_cible: 'csm',
    source: 'manual',
    status: 'published',
    content: `Déclencheur : Un client signale que des dossiers sont bloqués en statut "rejet CDC" ou que la Caisse des Dépôts a retourné des erreurs sur des dossiers RNCP.

Causes fréquentes de rejet :
1. Numéro de sécurité sociale manquant ou incorrect (obligatoire pour l'accrochage)
2. Données du Passeport de Compétences non complétées par le candidat (identité, date de naissance)
3. Incohérence entre les blocs de compétences déclarés et ceux enregistrés France Compétences
4. Dossier en statut "Prêt à passer" alors que l'examen a déjà eu lieu (date non mise à jour)
5. Format XML non conforme (survient généralement si des champs obligatoires sont vides)

Étapes de résolution :
1. Identifier la cause depuis l'onglet "Statut d'accrochage CertiPlace" du dossier concerné
2. Si données candidat manquantes : envoyer le lien Passeport de Compétences au candidat via Messages et Notifications avec message d'urgence
3. Si numéro SS manquant : demander au candidat de le renseigner dans l'Espace Candidat
4. Si incohérence blocs : vérifier la configuration des blocs sur le partenariat et les corriger
5. Relancer l'accrochage depuis l'interface CertiPlace une fois les corrections effectuées

Prévention :
- Activer les messages automatiques en cas d'accrochage échoué (paramétrable dans Messages et Notifications)
- Vérifier systématiquement la complétude des données avant envoi à la CDC via le checklist CertiPlace
- Pour les certifications CPF, imposer l'Identité Numérique à la candidature : les données sont pré-remplies et fiables.`,
  },

  // ── cas_client ─────────────────────────────────────────────────────────────
  {
    type: 'cas_client',
    title: 'CFA Métitech : réduction de 65 % du temps de gestion CDC',
    profil_cible: 'sales',
    source: 'manual',
    status: 'published',
    content: `Profil client : CFA Métitech, organisme certificateur RNCP gérant 180 dossiers par mois en BTS et Licence Professionnelle, anciennement sur process Excel et emails manuels.

Problème initial : L'équipe administrative passait en moyenne 35 minutes par dossier sur les tâches CDC : saisie des données dans le fichier XML, vérification des champs obligatoires, envoi manuel, suivi des rejets et relances candidats. Avec 180 dossiers/mois, cela représentait environ 100 heures de travail administratif mensuel, soit 1,25 ETP dédié.

Le taux de rejet CDC atteignait 12 % des dossiers, générant en cascade des relances manuelles et des retards dans le financement CPF pour les candidats.

Solution déployée : Passage à CertiPlace Premium avec activation de l'accrochage automatique CDC, de l'Espace Candidat et de la génération automatique des parchemins. Déploiement en 3 semaines avec accompagnement CertiPlace.

Résultats mesurés à 3 mois :
- Temps de gestion par dossier réduit de 35 min à 12 min (−65 %)
- Taux de rejet CDC tombé de 12 % à 2,3 % grâce à la vérification automatique des données avant envoi
- Volume d'appels entrants candidats réduit de 70 % grâce à l'Espace Candidat
- ROI calculé : économie de 80h/mois, le plan Premium amorti en 2,5 mois

Citation : "On a récupéré l'équivalent d'un mi-temps sur les tâches administratives. Notre équipe se concentre maintenant sur l'accompagnement pédagogique."`,
  },
  {
    type: 'cas_client',
    title: 'Institut Proforma : taux d\'accrochage CDC porté à 98 %',
    profil_cible: 'sales',
    source: 'manual',
    status: 'published',
    content: `Profil client : Institut de Certification Proforma, certificateur RNCP spécialisé en certifications commerciales et management, 90 dossiers/mois, fortement exposé aux financements CPF.

Problème initial : Proforma rencontrait des difficultés récurrentes avec l'accrochage CDC. Le taux de succès stagnait à 78 %, entraînant des délais de remboursement CPF de 3 à 6 semaines supplémentaires pour les candidats concernés. La cause principale : des données candidats incomplètes ou erronées (numéro SS, identité, blocs de compétences) détectées seulement lors de l'envoi à la CDC.

Solution déployée : CertiPlace Access (puis upgrade Premium à 6 mois) avec déploiement de l'Identité Numérique obligatoire à la candidature. Les candidats s'authentifient via FranceConnect dès l'inscription, pré-remplissant automatiquement les données d'identité et le Passeport de Compétences. Activation des alertes automatiques de données manquantes avant soumission CDC.

Résultats mesurés à 6 mois :
- Taux d'accrochage CDC réussi du premier coup : 98 % (contre 78 % avant)
- Délai moyen de remboursement CPF : réduit de 38 jours à 12 jours
- Suppression des relances manuelles sur données manquantes : économie estimée à 15h/mois
- Satisfaction candidats : note de satisfaction post-certification passée de 3,8 à 4,6 sur 5

Citation : "L'obligation d'Identité Numérique à la candidature a tout changé. On n'a presque plus de rejets CDC et nos candidats sont remboursés beaucoup plus vite."`,
  },

  // ── concurrent ─────────────────────────────────────────────────────────────
  {
    type: 'concurrent',
    title: 'CertiPlace vs gestion manuelle (Excel + email + XML manuel)',
    profil_cible: 'sales',
    source: 'manual',
    status: 'published',
    content: `Contexte concurrentiel : La majorité des petits et moyens certificateurs RNCP gèrent encore leurs dossiers avec un assemblage de fichiers Excel, d'emails manuels et d'exports XML construits à la main pour la CDC. Ce statu quo est le principal "concurrent" de CertiPlace sur le segment des certificateurs à moins de 200 dossiers/mois.

Positionnement CertiPlace : CertiPlace est la solution SaaS dédiée à la certification professionnelle RNCP, conçue pour automatiser l'intégralité du cycle de vie du dossier de certification, de la création à l'accrochage CDC en passant par la communication candidat et la génération documentaire.

Comparatif objectif :
- Temps par dossier : Excel 35 à 45 min / Standard 10 à 15 min / Premium 8 à 12 min
- Accrochage CDC : Excel manuel XML / Standard API et webhooks / Premium automatique
- Espace Candidat : Excel non / Standard non / Premium oui
- Taux rejet CDC moyen : Excel 10 à 15 % / Standard 3 à 5 % / Premium moins de 3 %
- Coût par dossier estimé (temps humain inclus) : Excel 12 à 18 € / Standard 9,90 € / Premium 8,90 € + abo

Arguments différenciants face au statu quo :
- Conformité RNCP : CertiPlace est maintenu à jour des évolutions réglementaires CDC. Excel nécessite une veille manuelle.
- Scalabilité : passer de 50 à 300 dossiers/mois avec Excel multiplie la charge par 6. Avec CertiPlace, la charge administrative reste quasi-constante.
- Risque d'audit : CertiPlace génère automatiquement les rapports d'activité et exports réglementaires. Excel expose à un risque de non-conformité en cas de contrôle France Compétences.`,
  },
  {
    type: 'concurrent',
    title: 'CertiPlace vs développement interne sur mesure',
    profil_cible: 'sales',
    source: 'manual',
    status: 'published',
    content: `Contexte concurrentiel : Certains certificateurs disposant d'une DSI envisagent de développer leur propre outil de gestion des certifications plutôt que d'adopter une solution SaaS. Ce choix est présenté comme plus adapté à leurs besoins spécifiques et moins coûteux à long terme.

Positionnement CertiPlace : CertiPlace est un SaaS métier éprouvé, intégrant cinq ans de retours d'expérience terrain sur les contraintes CDC, France Compétences et RNCP. Développer en interne équivaut à recréer ces connaissances métier depuis zéro.

Coût réel du développement interne :
- Un développeur senior représente 60 à 80 k€/an chargé. Un outil de gestion certifications minimal (CRUD, CDC, documents) nécessite 6 à 12 mois de développement initial.
- Maintenance réglementaire continue : les mises à jour CDC (format XML, nouvelles obligations) représentent 1 à 2 mois de développement supplémentaire par an.
- CertiPlace Access : 495 € de setup + 49 €/mois = moins de 1 100 € la première année.

Risque réglementaire : L'accrochage CDC et la synchronisation France Compétences sont soumis à des mises à jour fréquentes. CertiPlace absorbe ces évolutions sans coût supplémentaire. Une DSI interne doit les anticiper, les tester et les déployer sous contrainte de délai.

Time-to-market : CertiPlace est opérationnel en 3 à 4 semaines. Développement interne : 6 à 18 mois avant la première mise en production.

Point de convergence : L'API CertiPlace peut être intégrée dans une application sur mesure, combinant la flexibilité d'un développement spécifique et la robustesse métier de CertiPlace sur la partie certifications.`,
  },
]

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return response.data[0].embedding
}

async function main() {
  console.log(`🌱 Seed CertiBase — ${FICHES.length} fiches à insérer\n`)

  let inserted = 0
  let failed = 0

  for (const [i, fiche] of FICHES.entries()) {
    process.stdout.write(`[${i + 1}/${FICHES.length}] ${fiche.title.slice(0, 60)}... `)

    try {
      const embedding = await generateEmbedding(fiche.content)

      const { error } = await supabase.from('fiches').insert({
        ...fiche,
        embedding,
      })

      if (error) {
        console.log(`❌ ${error.message}`)
        failed++
      } else {
        console.log('✅')
        inserted++
      }
    } catch (err) {
      console.log(`❌ ${err instanceof Error ? err.message : String(err)}`)
      failed++
    }
  }

  console.log(`\n✅ ${inserted} fiches insérées`)
  if (failed > 0) console.log(`❌ ${failed} échecs`)
}

main().catch(console.error)
