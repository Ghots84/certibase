---
name: CertiBase
description: Spécification d'expérience du dashboard interne CertiBase — architecture de l'information, patterns de composants et flux, en complément de DESIGN.md.
status: final
updated: 2026-07-09
---

# CertiBase — Spine d'expérience

## Foundation

Dashboard web desktop, Next.js 16 + Tailwind 4. Largeur minimale supportée : **1080px**, déjà appliquée dans l'app — pas de repli mobile ni de breakpoint à concevoir ; en dessous de ce seuil, l'usage n'est pas un cas cible. `DESIGN.md` est la référence visuelle ; ce document est le comportement. Mono-tenant : trois rôles (`admin`, `csm`, `sales`) partagent la même instance CertiBase, la distinction se fait par droits d'accès, pas par espace séparé.

## Information Architecture

| Surface | Atteinte depuis | Objet | Maquette |
|---|---|---|---|
| Vue d'ensemble | `/` — ouverture de l'app | Stat cards (fiches validées, à valider, angles morts, imports actifs), raccourcis vers les 3 zones de travail, callout « Principe directeur » | [`mockups/overview.html`](mockups/overview.html) |
| Fiches | Nav / raccourci Vue d'ensemble | Base de connaissance : grille de catégories → grille de fiches filtrées + tirette de détail. Création/édition réservées admin. | [`mockups/fiches.html`](mockups/fiches.html) (vue grille + tirette) |
| Concurrents | Nav | Comparatif tarifaire + timeline d'alertes de veille automatisée | [`mockups/concurrents.html`](mockups/concurrents.html) |
| Imports | Nav / raccourci Vue d'ensemble | Dépôt de fichier/URL, file d'imports, validation des drafts générés par le pipeline IA | spine seule (pas de maquette dédiée — décision utilisateur) |
| Assistant | Nav / raccourci Vue d'ensemble | Chat RAG sur la base de fiches, réponses streamées, sources citées, brouillons copiables | [`mockups/assistant.html`](mockups/assistant.html) |
| Utilisateurs | Nav (admin uniquement) | Table des membres, gestion des rôles, invitations | spine seule (pas de maquette dédiée — décision utilisateur) |

Tous les rôles (`admin`, `csm`, `sales`) voient Vue d'ensemble, Fiches, Concurrents, Imports, Assistant. **Utilisateurs** est masqué de la nav pour `csm`/`sales` — pas d'écran "accès refusé", l'item n'existe simplement pas dans leur sidebar (`{components.sidebar-nav}`). À l'intérieur de Fiches, la catégorie « À valider » suit la même règle : visible et cliquable seulement pour `admin` (`{components.category-card}` variante `admin-only`, bordure pointillée `warning`).

**Les maquettes illustrent ; la spine fait foi.** En cas de conflit entre une maquette HTML et le texte de `DESIGN.md`/`EXPERIENCE.md`, la spine gagne toujours — les maquettes ne sont pas mises à jour rétroactivement si un token change ensuite.

## Voice and Tone

Microcopie. La voix et la posture visuelle vivent dans `DESIGN.md`. CertiBase parle français, direct, sans emphase commerciale — c'est un outil, pas un produit qu'on vend à l'utilisateur.

| Do | Don't |
|---|---|
| « À valider » | « En attente de votre validation ! » |
| « Aucune fiche publiée pour le moment » | « Oups, rien à afficher ici 😅 » |
| « Fiche validée ✓ » (toast, factuel) | « Bravo, fiche validée avec succès ! » |
| « Chargement des fiches... » | Squelettes silencieux sans texte, ou spinners génériques sans contexte |
| « Impossible de charger les fiches. Veuillez réessayer. » | « Une erreur est survenue » (sans dire quoi, sans dire quoi faire) |
| Compteurs et faits : « 3 offres suivies · 2 alertes détectées » | Formulations enthousiastes sur des données neutres |
| Même registre pour CSM, Sales et admin — CertiBase ne change pas de ton selon le rôle | Sur-adapter le ton par persona (le produit est un outil de travail commun) |

## Component Patterns

Comportemental. Les specs visuelles vivent dans `DESIGN.md.components`.

| Composant | Usage | Règles comportementales |
|---|---|---|
| `sidebar-nav` | Global | Item actif = correspondance exacte du chemin ou préfixe (`pathname.startsWith(href)` pour les routes imbriquées). Survol : fond translucide sur les items non actifs uniquement. Les badges numériques sur « Fiches » et « Imports » sont actuellement des valeurs statiques (`8`, `4`) dans le code — voir Migration Notes. |
| `fiche-card` | Fiches (grille) | Clic ou `Entrée`/`Espace` (rôle `button`, focusable) bascule l'ouverture de la tirette ; un second clic sur la même carte la referme. Quand une tirette est ouverte, la grille resserre sa colonne minimale (270px → 240px) pour lui faire de la place. |
| `fiche-drawer` (`{components.drawer}`) | Fiches (détail) | S'ouvre à droite en glissement (`cbslide`), reste collée (`sticky`) au défilement. `Échap` ferme. Pied de tirette conditionnel au rôle et au statut : Dupliquer toujours visible ; Archiver admin uniquement ; Valider si `draft` + admin ; Modifier si `published` + admin. |
| `fiche-form-modal` (`{components.modal}`) | Fiches (création/édition, admin) | Overlay plein écran, fermeture au clic hors-carte ou `Échap`. Un seul niveau de pile — n'ouvre jamais par-dessus la tirette (la tirette reste visible derrière mais non interactive tant que la modale est ouverte). |
| `chat-bubble` (assistant) | Assistant | Trois états successifs par message : (1) points de suspension animés tant qu'aucun token n'est reçu, (2) texte qui grossit en flux avec curseur clignotant (`cb-cursor`) pendant le streaming, balises `<draft>` masquées à ce stade, (3) au terme du flux, les blocs `<draft>` sont parsés et rendus en encart copiable distinct, les chips de sources apparaissent sous la bulle, un bouton Copier apparaît sous le message complet. |
| `category-card` | Fiches (accueil) | Clic navigue vers la grille filtrée de cette catégorie. Comportement identique en clavier (`Entrée`/`Espace`). |
| `price-compare` / `comparison-card` | Concurrents | Cartes au survol : lift `-2px` + ombre renforcée (`{components.comparison-card.shadow-hover}`). La carte héro (« Notre offre ») n'a pas besoin d'état survol différencié — elle est déjà à l'emphase maximale en permanence. |
| `alert-item` | Concurrents (timeline) | Liste triée par date décroissante. Survol change légèrement le fond (`#FAFBFC}`) pour signaler la scannabilité de la ligne sans en faire un lien cliquable — aucune action n'y est attachée en v1. |
| `import-card` (`{components.import-card}`) | Imports (panneau droit) | Cycle d'état optimiste : `pending` → `processing` (au clic Valider/Rejeter) → `approved`/`rejected`. En cas d'échec serveur, retour immédiat à `pending` + toast d'erreur. Une carte `rejected` reste visible mais s'estompe (`{components.import-card.opacity-rejected}`, 0.45) plutôt que de disparaître — traçabilité de ce qui a été traité. Badge « ⚠ Confiance faible » affiché en plus de la `confidence-bar` colorée dès que `confidence_threshold < 0.70` — double signal, jamais la couleur seule. |
| `button-primary` / `button-secondary` | Global | Primaire désactivé (`{components.button-primary.disabled-background}`) tant que le formulaire/l'input associé n'est pas valide (ex. bouton d'envoi du chat désactivé si le champ est vide) — pas de clic silencieusement ignoré. Pas d'état de chargement dédié sur le bouton lui-même : pendant un cycle Valider/Rejeter (`import-card`) ou un envoi Assistant, c'est la carte/bulle qui porte l'état (`processing`, points de suspension), pas le bouton. `button-secondary` en mode destructif (« Archiver ») change uniquement la couleur du texte/bordure au survol (`hover-color-danger`) — aucune confirmation modale en v1 ; l'action reste réversible ailleurs dans le produit (une fiche archivée n'est pas supprimée). |
| `stat-card` | Vue d'ensemble | La couleur de la valeur (`{typography.display}`) encode l'état sans badge séparé : `success` si le nombre est dans une plage normale, `text-faint` si zéro/neutre (ex. Angles morts à 0 = bonne nouvelle, pas un manque), `warning`/`accent` si le nombre appelle une action (ex. « À valider » > 0). Règle définie visuellement dans `DESIGN.md → Components → stat-card` ; cette ligne en est le contrat comportemental. |
| `confidence-bar` | Fiche-card, fiche-drawer, import-card | Purement d'affichage (aucune interaction) sur les trois emplacements — se contente de refléter `confidence_threshold` au rendu, jamais de valeur modifiable en direct. Seul le franchissement du seuil bas (`< 0.70`) déclenche un élément additionnel (badge « ⚠ Confiance faible », voir `import-card` ci-dessus) ; sur `fiche-card`/`fiche-drawer`, la barre colorée seule suffit, sans badge complémentaire. |

## State Patterns

| État | Surface | Traitement |
|---|---|---|
| Chargement à froid | Fiches, Concurrents, Imports | Texte centré simple (« Chargement des fiches... », « Chargement... ») — pas de squelette actuellement. Vue d'ensemble et Utilisateurs sont rendus côté serveur, pas d'état de chargement visible. |
| Liste vide (jamais alimentée) | Fiches | « Aucune fiche publiée pour le moment » |
| Liste vide (filtre sans résultat) | Fiches | « Aucune fiche ne correspond à votre recherche » — message distinct du précédent, la nuance compte : l'un dit "rien n'existe", l'autre "votre filtre est trop strict" |
| Liste vide (aucun import encore) | Imports | « Aucun import pour le moment » — `{components.empty-state}` variante `plain`, même registre que Fiches. Distinct du flux calme de Concurrents : ici il n'y a jamais rien eu, ce n'est pas une bonne nouvelle, juste un état de départ. |
| Flux calme (rien de nouveau) | Concurrents (alertes) | `{components.empty-state.tinted-*}` — « Aucune nouvelle alerte cette semaine. Nous continuons de surveiller le marché. » Ton rassurant, pas alarmant : l'absence d'alerte est une bonne nouvelle. |
| Erreur réseau/serveur | Fiches, Concurrents, Imports | `{components.empty-state}` en variante danger : fond `danger-soft`, bordure `danger`, message actionnable (« Veuillez réessayer »). |
| Erreur de chargement (SSR) | Vue d'ensemble | Pas de garde-fou dédié aujourd'hui (page 100 % serveur) — enjeu faible : une erreur ici casse le rendu de la route entière plutôt que d'afficher un état dégradé. `[ASSUMPTION: accepté tel quel pour la v1, à revisiter seulement si des rapports d'erreur SSR apparaissent en usage réel]`. |
| Chargement / streaming / erreur | Assistant | Trois états explicites de `{components.chat-bubble}`, distincts du narratif du Flux 3 : (1) **chargement** — points de suspension animés, aucun token reçu ; (2) **streaming** — texte en flux avec curseur clignotant (`cb-cursor`), balises `<draft>` masquées ; (3) **erreur SSE** — le message affiche « Erreur : {message} » à la place du texte, la saisie redevient immédiatement disponible (pas de blocage en attente d'un flux qui ne viendra pas). |
| Pipeline d'import en cours | Imports | Barre de progression indéterminée animée (`cbprogress`), polling automatique toutes les 3s tant qu'un import est `pending`/`extracting`/`analyzing`, jusqu'à 200 cycles (~10 minutes) avant abandon silencieux du polling. |
| Cycle de vie fiche | Fiches / Imports | `draft` (créée manuellement ou par le pipeline d'import) → `published` (action admin « Valider », expose la fiche aux agents CSM/Sales Digital) → `archived` (action admin, irréversible dans l'UI actuelle). Dupliquer une fiche — y compris une `published` — crée toujours un nouveau `draft`, jamais une copie déjà publiée. |
| Confiance basse sur un draft | Imports | Badge « ⚠ Confiance faible » à côté du type quand `confidence_threshold < 0.70`, en plus de la `confidence-bar` colorée — double signal, pas seulement la couleur. |
| Invitation en attente / organisation vide | Utilisateurs | Une invitation envoyée mais non acceptée reste listée avec un badge de statut « Invité·e » distinct des rôles actifs (`{components.status-badge}`, palette neutre — pas encore un membre). Cas limite non observé en usage réel à ce jour (un seul tenant, toujours peuplé) : `[ASSUMPTION: pas d'état "organisation vide" dédié tant qu'aucun scénario multi-tenant n'existe — le composant table hérite simplement du même `empty-state` plain que Fiches/Imports si la liste est un jour vide]`. |

## Interaction Primitives

- **Clic / `Entrée`+`Espace`** — toute carte cliquable (`fiche-card`, `category-card`) est un rôle `button` explicite avec `tabIndex=0` : accessible clavier dès aujourd'hui, à préserver dans toute migration.
- **`Échap`** — ferme la tirette de fiche et les modales (déjà câblé via `keydown` listener dans `fiche-drawer` et `fiche-form-modal`). Règle à généraliser à tout futur composant de superposition.
- **`Entrée` dans le champ Assistant** — envoie le message ; `Maj+Entrée` insère un saut de ligne (comportement standard chat, déjà en place, à documenter comme contrat plutôt que détail d'implémentation).
- **Survol** — révèle l'élévation (lift + ombre) sur toute carte interactive (`{components.shortcut-card}`, `{components.fiche-card}`, `{components.comparison-card}`) ; jamais la seule façon de révéler une action (pas d'action cachée uniquement au survol sans équivalent clavier/clic).
- **Cibles de clic** — lignes entières cliquables (carte fiche, ligne d'import) plutôt que zones cliquables étroites — cohérent avec un outil desktop à la souris précise, pas de contrainte tactile 44px à respecter ici.

## Accessibility Floor

Comportemental. Le contraste visuel détaillé vit dans `DESIGN.md`.

- **Contraste texte blanc sur `{colors.primary}`** — calculé à environ **3.3:1**, sous le seuil AA texte normal (4.5:1), au-dessus du seuil AA grand texte/composant UI (3:1). Les boutons primaires actuels (« Valider », « + Nouvelle fiche », 13-14px semi-gras) sont en dessous du seuil "grand texte" (18.66px gras). Recommandation : soit accepter le risque documenté (outil interne, pas de contrainte réglementaire — stakes confirmées faibles), soit épaissir légèrement le poids/la taille du texte des CTA primaires lors de la migration pour sécuriser l'AA. Ne pas foncer `{colors.primary}` lui-même — cela romprait l'identité de marque verrouillée.
- **Contraste `{colors.text-faint}` sur `{colors.surface}`** — calculé à environ **3.1:1**, sous le seuil AA texte normal (4.5:1). Cette paire est utilisée par `{components.stat-card.sub-color}`, `{components.fiche-card.hint-color}`, `{components.alert-item.sub-color}` et `{components.empty-state.plain-color}` — du texte informatif secondaire, jamais l'unique porteur d'une information critique (toujours doublé d'un titre ou d'une valeur en `text`/`text-muted` à contraste correct juste à côté). Risque accepté à ce niveau d'importance visuelle pour un outil interne ; si l'un de ces usages devient un jour le seul porteur d'une information actionnable, basculer sur `{colors.text-muted}` (contraste correct) pour cet usage précis.
- **Contraste `status-badge` variante `archived`** — corrigé pendant la revue : le libellé texte utilise désormais `{colors.text-muted}` (au lieu de `{colors.text-faint}`) sur `{colors.surface-2}`, ramenant le contraste au-dessus du seuil AA. Le point (`dot`) reste en `text-faint` — un indicateur graphique non textuel relève du seuil non-text (3:1 vs les couleurs adjacentes, WCAG 1.4.11), déjà respecté.
- **Visibilité du focus** — le pattern `.cb-input:focus` (bordure `primary` + halo `rgba(232,101,30,0.12)`) existe déjà pour les champs texte ; à étendre systématiquement aux boutons et cartes focusables (`fiche-card`, `category-card`) qui reposent aujourd'hui sur le focus ring par défaut du navigateur, incohérent avec le reste du système.
- **Piège de focus modale** — `fiche-form-modal` ferme au `Échap` mais ne pratique pas de piège de focus explicite (le focus peut sortir vers la sidebar en tabulant) ; à corriger lors de la migration — cibler un comportement standard : focus initial sur le premier champ, `Tab` cyclique dans la modale, restitution du focus à l'élément déclencheur à la fermeture.
- **Navigation clavier des tirettes/onglets** — `fiche-drawer` et la sélection de catégorie sont déjà opérables au clavier (rôle `button`, `tabIndex`) ; préserver ce niveau dans toute réécriture en composants partagés.
- **Double encodage systématique** — tout statut (`status-badge`, `confidence-bar`, alertes hausse/baisse) porte à la fois une forme (dot, pilule, flèche/emoji) et un texte — aucune information n'est encodée uniquement par la couleur, règle déjà respectée dans le code actuel et à préserver strictement dans la migration.

## Key Flows

### Flux 1 — Léa (CSM) vérifie un prix concurrent avant un appel de renouvellement

1. Léa a un appel de renouvellement dans 20 minutes avec un client qui a mentionné regarder Procertif. Elle ouvre CertiBase et clique **Concurrents** dans la nav.
2. La page charge : comparatif tarifaire en barres horizontales (`{components.price-compare}`), notre offre en tête avec la barre orange dégradée, Procertif juste en dessous.
3. Dans la timeline latérale (`{components.alert-item}`), elle voit en premier « Procertif — Impact, -9,1 % · Prix passé de 110 € à 100 € · Aujourd'hui, 08:02 » — l'accent rouge à gauche signale la baisse en un coup d'œil.
4. **Climax** — Léa a en 5 secondes l'information qui compte : le concurrent vient de baisser son prix le jour même. Elle n'a pas eu à lire un tableau, juste à scanner une barre orange en tête et un item rouge en haut de timeline. Elle prépare sa réponse à l'objection prix avant même que le client la soulève.

Échec : si le chargement échoue (`error`), le message est explicite et actionnable — Léa sait qu'il faut réessayer, pas deviner pourquoi l'écran est vide.

### Flux 2 — Marc (Sales) valide une fiche générée après un import

1. Marc vient d'importer l'enregistrement d'un appel commercial via **Imports**. Le pipeline traite le fichier (`extracting` → `analyzing`), la barre de progression indéterminée tourne pendant qu'il attend.
2. Statut passe à `ready`. Le panneau de droite (`{components.drawer}` variante import) liste 3 drafts générés, dont un avec le badge « ⚠ Confiance faible » et une `confidence-bar` à 62 % en rouge.
3. Marc lit l'extrait de la fiche à faible confiance — elle mélange deux objections différentes. Il clique **Rejeter** : la carte s'estompe à 45 % d'opacité, reste visible mais désactivée.
4. Les deux autres drafts sont clairs. Il clique **Valider** sur chacune : transition `pending` → `processing` → `approved`, toast « Fiche validée — exposée aux agents ».
5. **Climax** — le panneau affiche « 2/3 validées », Marc referme le panneau. Ces deux fiches sont désormais consultables par l'agent Assistant pour toute l'équipe — son travail de tri de 3 minutes vient d'enrichir la base pour tout le monde, pas seulement pour lui.

Échec : si l'approbation échoue côté serveur, la carte retourne à `pending` et un toast d'erreur explicite apparaît — aucun état intermédiaire fantôme.

### Flux 3 — Sofia (Sales) répond à une objection prix en plein appel

1. En appel avec un prospect qui objecte sur le prix, Sofia ouvre **Assistant** dans un second onglet et tape « Comment gérer l'objection sur le prix ? » — une des suggestions proposées à l'état vide, elle n'a même pas eu à formuler la question elle-même.
2. Trois points animés (`{components.chat-bubble}` état chargement), puis le texte apparaît en flux avec curseur clignotant.
3. La réponse se termine par un bloc `<draft>` distinct — encart teinté avec filet orange à gauche — contenant une phrase prête à dire au client, et deux chips de source citées (« Objection · Prix Premium vs Standard · 91 % »).
4. **Climax** — Sofia clique **Copier** sur le bloc draft, colle mentalement l'idée dans sa réponse orale (pas un copier-coller littéral au client, mais elle a la structure de réponse sous les yeux en moins de 10 secondes) et reprend l'appel sans silence gênant.

Échec : si le flux SSE s'interrompt (erreur réseau), le message affiche « Erreur : {message} » à la place du texte — Sofia sait immédiatement qu'il faut reformuler plutôt que d'attendre indéfiniment une réponse qui ne viendra pas.

### Flux 4 — Aïcha (CSM) retrouve une procédure directement dans Fiches

1. Aïcha se souvient qu'il existe une fiche sur la configuration de l'espace candidat mais pas des mots exacts. Plutôt que l'Assistant, elle ouvre **Fiches** dans la nav — habitude quand elle sait que l'info existe et veut la parcourir plutôt que la demander.
2. Elle atterrit sur la grille de catégories (`{components.category-card}`) : Toutes, Sales, Produit, Réglementaire, Veille, Support. Elle clique **Réglementaire**, où vivent les guides de situation.
3. La grille filtrée s'affiche (`{components.fiche-card}`) — elle repère « Configurer l'espace candidat » au titre, sans avoir besoin d'ouvrir la tirette pour confirmer via l'extrait de contenu visible sur la carte.
4. Elle clique la carte : la tirette (`{components.drawer}`) glisse depuis la droite, la grille resserre sa colonne pour lui faire de la place. Le contenu structuré (titres, listes) répond directement à sa question.
5. **Climax** — Aïcha n'a tapé aucun mot-clé, juste suivi une catégorie qu'elle connaît déjà par cœur après quelques semaines d'usage. Le classement par catégorie, pas la recherche, est devenu son chemin par défaut pour ce type de besoin récurrent — la preuve que la base de connaissance fonctionne aussi sans l'IA.

Échec : si la catégorie ne contient pas la fiche attendue (mal classée, ou pas encore créée), Aïcha bascule sur la recherche texte en haut de page plutôt que de conclure que l'information n'existe pas — la recherche reste le filet de sécurité derrière la navigation par catégorie.

## Migration Notes

CertiBase compte aujourd'hui ~7 pages qui réinventent chacune leurs styles en ligne (objets `style={{...}}` dispersés, pas de composants de badge/carte partagés). Approche de migration recommandée, en 5 passes. Les identifiants de code cités ci-dessous (fichiers, noms de constantes) sont des repères sur l'état actuel du dépôt à la date de rédaction (2026-07-09) — à vérifier avant usage, ils sortent du périmètre que cette spine tient à jour et peuvent dériver au fil des refactors indépendamment de toute décision de design :

1. **Tokens d'abord** — étendre `app/globals.css` avec les tokens de `DESIGN.md` (échelle `rounded` complète jusqu'à `2xl`, tokens `role-*`, valeurs d'ombre nommées en variables CSS) sans toucher au balisage. Cette passe ne change rien visuellement — elle prépare le terrain.
2. **Extraire les patterns dupliqués en composants réels** — `type-badge`, `status-badge` et `confidence-bar` sont aujourd'hui réimplémentés en objets de style inline dans `fiches/page.tsx` et `imports/page.tsx` séparément. Les tables `ROLE_COLORS`/`ROLE_LABELS` sont dupliquées à l'identique dans `sidebar.tsx`, `assistant/page.tsx` et `users/page.tsx`. Consolider ces trois patterns en composants/constantes partagés avant toute passe visuelle réduit le risque de divergence future.
3. **Migrer page par page, dans cet ordre** : **Concurrents** d'abord (déclencheur du projet, direction déjà maquettée dans `.working/direction-modern-saas.html` — remplacer le tableau HTML actuel par `{components.price-compare}` + `{components.comparison-card}`) → **Fiches** (surface de tokens la plus large : badges, confidence-bar, tirette, modale) → **Imports** (réutilise directement le pattern tirette/carte de validation défini pour Fiches) → **Vue d'ensemble / Assistant / Utilisateurs** (déjà les plus proches de la cible, ajustements mineurs de radius/ombre).
4. **Uniformiser les titres de page** sur `{typography.heading-lg}` — gain de cohérence à faible risque, indépendant du reste du refactor, faisable en une passe séparée sur les 6 pages.
5. **Résoudre les compteurs statiques de la nav** (`8` sur Fiches, `4` sur Imports, actuellement des valeurs codées en dur dans `MAIN_NAV`) en comptages live, à traiter dans la même passe que la migration de Fiches/Imports puisque les données existent déjà côté `getStats()` de Vue d'ensemble.
