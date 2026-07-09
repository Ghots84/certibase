---
name: CertiBase
description: Système de design du dashboard interne CertiBase (CSM/Sales/admin) — identité orange/bleu marine existante, à unifier à travers toutes les pages.
status: final
updated: 2026-07-09
colors:
  # Neutrals — canvas et surfaces
  bg: '#F6F7F9'
  surface: '#FFFFFF'
  surface-2: '#F1F3F6'
  surface-hover: '#F6F8FB'
  text: '#15212E'
  text-muted: '#5B6675'
  text-faint: '#8A94A2'
  border: '#E3E7EC'
  border-strong: '#D2D8E0'

  # Sidebar — bleu marine, distinct du canvas principal
  sidebar-bg: '#122E47'
  sidebar-bg-hover: '#16385A'
  sidebar-text: '#E7EDF4'
  sidebar-muted: '#8AA0B5'
  sidebar-active-bg: 'rgba(232, 101, 30, 0.16)'
  sidebar-active-text: '#FFFFFF'
  sidebar-active-bar: '#E8651E'
  sidebar-border: 'rgba(255, 255, 255, 0.08)'

  # Marque — orange, utilisé avec confiance (pas raréfié)
  primary: '#E8651E'
  primary-hover: '#D2570F'
  primary-text: '#FFFFFF'
  primary-soft: '#FCEDE3'
  primary-soft-text: '#B14E10'
  primary-gradient-end: '#FF8A4C'

  # Accent secondaire — bleu informationnel, non concurrent de l'orange
  accent: '#1E5B9E'
  accent-soft: '#E8F0F8'
  accent-soft-text: '#1E5B9E'

  # Sémantique d'état — jamais confondue avec la marque
  success: '#1F8A5B'
  success-soft: '#E3F3EB'
  warning: '#B8770C'
  warning-soft: '#FBF0DA'
  danger: '#C0392B'
  danger-soft: '#F8E4E1'

  # Rôles — identité de personne, distincte de la marque et du sémantique
  role-admin: '#7A5AF8'
  role-csm: '#2D7DD2'
  role-sales: '#E8651E'
typography:
  display:
    fontFamily: 'Public Sans'
    fontSize: 34px
    fontWeight: '800'
    lineHeight: '1.15'
    letterSpacing: -0.01em
  heading-lg:
    fontFamily: 'Public Sans'
    fontSize: 24px
    fontWeight: '800'
    lineHeight: '1.25'
    letterSpacing: -0.01em
  heading-md:
    fontFamily: 'Public Sans'
    fontSize: 15px
    fontWeight: '700'
    lineHeight: '1.3'
  heading-sm:
    fontFamily: 'Public Sans'
    fontSize: 13.5px
    fontWeight: '600'
    lineHeight: '1.4'
  body:
    fontFamily: 'Public Sans'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: 'Public Sans'
    fontSize: 12.5px
    fontWeight: '400'
    lineHeight: '1.5'
  label:
    fontFamily: 'Public Sans'
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1.4'
    letterSpacing: 0.06em
  caption:
    fontFamily: 'Public Sans'
    fontSize: 11px
    fontWeight: '500'
    lineHeight: '1.4'
  mono:
    fontFamily: 'Public Sans'
    fontSize: 12px
    fontWeight: '600'
    letterSpacing: -0.01em
    note: 'Public Sans avec tabular-nums (classe .mono) — pas une police monospace distincte. Réservé aux IDs, dates, pourcentages, prix.'
rounded:
  sm: 6px
  DEFAULT: 8px
  md: 10px
  lg: 12px
  xl: 16px
  '2xl': 20px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '7': 28px
  '8': 32px
  gutter: 16px
  page-margin: 28px
  control-h: 38px
components:
  sidebar-nav:
    width: 248px
    background: '{colors.sidebar-bg}'
    border-right: '1px solid {colors.sidebar-border}'
    item-radius: '{rounded.md}'
    item-padding: '9px 11px'
    item-gap: '{spacing.1}'
    item-color: '{colors.sidebar-muted}'
    item-color-hover: '{colors.sidebar-text}'
    item-background-hover: 'rgba(255,255,255,0.07)'
    item-color-active: '{colors.sidebar-active-text}'
    item-background-active: '{colors.sidebar-active-bg}'
    item-weight-active: '600'
    active-indicator-width: 3px
    active-indicator-color: '{colors.sidebar-active-bar}'
    section-label: '{typography.label}'
    section-label-color: '{colors.sidebar-muted}'
    badge-color: '{colors.sidebar-muted}'
    badge-color-active: 'rgba(255,255,255,0.7)'
  stat-card:
    background: '{colors.surface}'
    border: 'none'
    radius: '{rounded.xl}'
    shadow: '0 1px 2px rgba(16,30,50,.06), 0 1px 3px rgba(16,30,50,.04)'
    padding: '16px 20px'
    label: '{typography.body-sm}'
    label-color: '{colors.text-muted}'
    value: '{typography.display}'
    value-fontSize: 28px
    sub: '{typography.caption}'
    sub-color: '{colors.text-faint}'
  shortcut-card:
    background: '{colors.surface}'
    border: 'none'
    radius: '{rounded.xl}'
    shadow: '0 1px 2px rgba(16,30,50,.06), 0 1px 3px rgba(16,30,50,.04)'
    shadow-hover: '0 8px 24px rgba(0,0,0,.08)'
    transform-hover: 'translateY(-2px)'
    icon-background: '{colors.primary-soft}'
    icon-color: '{colors.primary}'
    icon-radius: '{rounded.lg}'
    title: '{typography.heading-sm}'
    description: '{typography.body-sm}'
    description-color: '{colors.text-muted}'
    link-color: '{colors.primary}'
  category-card:
    background: '{colors.surface}'
    background-active: '{colors.primary-soft}'
    background-admin-only: '{colors.surface}'
    border: '1px solid {colors.border}'
    border-active: '1.5px solid {colors.primary}'
    border-admin-only: '1.5px dashed {colors.warning}'
    radius: '{rounded.lg}'
    shadow-hover: '0 4px 14px rgba(0,0,0,.08)'
    icon-fontSize: 24px
    title: '{typography.heading-sm}'
    count: '{typography.body-sm}'
    count-fontWeight: '600'
  fiche-card:
    background: '{colors.surface}'
    border: '1px solid {colors.border}'
    border-active: '1.5px solid {colors.primary}'
    radius: '{rounded.DEFAULT}'
    shadow-hover: '0 4px 12px rgba(0,0,0,.10)'
    shadow-active: '0 0 0 1px {colors.primary}'
    transform-hover: 'translateY(-1px)'
    padding: '12px 14px'
    title: '{typography.heading-sm}'
    hint: '{typography.body-sm}'
    hint-color: '{colors.text-faint}'
    id-mono: '{typography.mono}'
  import-card:
    background: '{components.fiche-card.background}'
    border: '{components.fiche-card.border}'
    radius: '{components.fiche-card.radius}'
    padding: '{components.fiche-card.padding}'
    opacity-rejected: 0.45
    title: '{typography.heading-sm}'
    hint: '{typography.body-sm}'
    low-confidence-badge-background: '{colors.warning-soft}'
    low-confidence-badge-color: '{colors.warning}'
  type-badge:
    radius: '{rounded.full}'
    padding: '2px 8px'
    fontSize: 11px
    fontWeight: '600'
    objection:
      background: '{colors.danger-soft}'
      color: '{colors.danger}'
    guide_situation:
      background: '{colors.warning-soft}'
      color: '{colors.warning}'
    cas_client:
      background: '{colors.success-soft}'
      color: '{colors.success}'
    concurrent:
      background: '{colors.accent-soft}'
      color: '{colors.accent}'
    doc_certiplace:
      background: '{colors.primary-soft}'
      color: '{colors.primary}'
    veille:
      background: '{colors.surface-2}'
      color: '{colors.text-muted}'
    support:
      background: '{colors.accent-soft}'
      color: '{colors.accent}'
  status-badge:
    radius: '{rounded.full}'
    dot-size: 6px
    fontSize: 11px
    fontWeight: '500'
    draft:
      dot: '{colors.warning}'
      color: '{colors.warning}'
      label: 'À valider'
    published:
      dot: '{colors.success}'
      color: '{colors.success}'
      label: 'Validée'
    archived:
      dot: '{colors.text-faint}'
      color: '{colors.text-muted}'
      background: '{colors.surface-2}'
      label: 'Archivée'
  confidence-bar:
    track-background: '{colors.border}'
    track-height: 4px
    track-radius: 2px
    fill-high: '{colors.success}'
    fill-mid: '{colors.warning}'
    fill-low: '{colors.danger}'
    threshold-high: 0.85
    threshold-mid: 0.70
    value-text: '{typography.mono}'
  price-compare:
    background: '{colors.surface}'
    radius: '{rounded.xl}'
    shadow: '0 4px 18px rgba(18,46,71,.08)'
    padding: '20px 22px'
    title: '{typography.heading-md}'
    bar-track-background: '#F0F2F4'
    bar-track-radius: '{rounded.sm}'
    bar-fill-default: 'linear-gradient(90deg,#C9CFD5,#B7BEC5)'
    bar-fill-us: 'linear-gradient(90deg,{colors.primary},{colors.primary-gradient-end})'
    bar-height: 14px
    label: '{typography.body-sm}'
    value: '{typography.mono}'
  comparison-card:
    background: '{colors.surface}'
    border: '1px solid {colors.border}'
    radius: '{rounded.xl}'
    shadow: '0 3px 12px rgba(18,46,71,.08)'
    shadow-hover: '0 8px 22px rgba(18,46,71,.08)'
    transform-hover: 'translateY(-2px)'
    hero-background: 'linear-gradient(160deg,{colors.primary} 0%,{colors.primary-gradient-end} 100%)'
    hero-color: '{colors.primary-text}'
    hero-shadow: '0 10px 26px rgba(232,101,30,.35)'
    hero-border: 'none'
    price: '{typography.display}'
    price-fontSize-hero: 34px
    price-fontSize-default: 26px
    pill-background: '{colors.primary-soft}'
    pill-color: '{colors.primary}'
    pill-background-hero: 'rgba(255,255,255,.22)'
    pill-color-hero: '{colors.primary-text}'
    badge-win-background: '{colors.surface}'
    badge-win-color: '{colors.primary}'
    badge-win-radius: '{rounded.full}'
  alert-item:
    background: '{colors.surface}'
    border: '1px solid {colors.border}'
    accent-width: 3px
    accent-rise: '{colors.danger}'
    accent-fall: '{colors.success}'
    accent-feature: '{colors.warning}'
    radius: '{rounded.DEFAULT}'
    icon-background: '{colors.primary-soft}'
    icon-radius: '{rounded.md}'
    icon-size: 34px
    title: '{typography.heading-sm}'
    sub: '{typography.body-sm}'
    sub-color: '{colors.text-faint}'
    chip-radius: '{rounded.full}'
    chip-down-background: '#FDE6E1'
    chip-down-color: '#C1401E'
    chip-up-background: '{colors.primary-soft}'
    chip-up-color: '{colors.primary}'
  chat-bubble:
    max-width-user: '72%'
    max-width-assistant: '82%'
    user-background: '{colors.primary}'
    user-color: '{colors.primary-text}'
    user-radius: '18px 18px 4px 18px'
    assistant-background: '{colors.surface}'
    assistant-border: '1px solid {colors.border}'
    assistant-color: '{colors.text}'
    assistant-radius: '18px 18px 18px 4px'
    assistant-avatar-background: '{colors.primary-soft}'
    assistant-avatar-color: '{colors.primary}'
    assistant-avatar-radius: '{rounded.lg}'
    text: '{typography.body}'
    draft-block-background: '{colors.surface-2}'
    draft-block-accent: '{colors.primary}'
    source-chip-background: '{colors.surface-2}'
    source-chip-type-background: '{colors.accent-soft}'
    source-chip-type-color: '{colors.accent-soft-text}'
  button-primary:
    background: '{colors.primary}'
    background-hover: '{colors.primary-hover}'
    color: '{colors.primary-text}'
    radius-cta: '{rounded.full}'
    radius-inline: '{rounded.DEFAULT}'
    height: '{spacing.control-h}'
    padding: '8px 18px'
    fontSize: 13.5px
    fontWeight: '600'
    disabled-background: '{colors.border}'
    disabled-color: '{colors.text-faint}'
  button-secondary:
    background: '{colors.surface-2}'
    color: '{colors.text-muted}'
    border: '1px solid {colors.border}'
    radius: '{rounded.DEFAULT}'
    padding: '8px 18px'
    fontSize: 13px
    fontWeight: '500'
    hover-color-danger: '{colors.danger}'
  modal:
    overlay: 'rgba(0,0,0,0.45)'
    background: '{colors.surface}'
    border: '1px solid {colors.border}'
    radius: '{rounded.lg}'
    shadow: '0 24px 48px rgba(0,0,0,0.18)'
    width: 520px
    max-height: '90vh'
    header-border: '1px solid {colors.border}'
    footer-border: '1px solid {colors.border}'
  drawer:
    width: 392px
    background: '{colors.surface}'
    border: '1px solid {colors.border}'
    radius: '{rounded.lg}'
    sticky-top: 16px
    max-height: 'calc(100vh - 130px)'
    enter-animation: 'cbslide 0.28s ease'
    header-border: '1px solid {colors.border}'
    footer-border: '1px solid {colors.border}'
  empty-state:
    plain-background: '{colors.surface}'
    plain-border: '1px solid {colors.border}'
    plain-color: '{colors.text-faint}'
    plain-radius: '{rounded.xl}'
    tinted-background: '#FFF8F4'
    tinted-border: '1.5px dashed #E0C9BB'
    tinted-radius: '{rounded.lg}'
    tinted-color: '{colors.text-muted}'
---

## Brand & Style

CertiBase est la console interne de CertiPlace : la base de connaissance et l'intelligence concurrentielle que les équipes CSM, Sales et l'administrateur (Knowledge Manager) utilisent pour répondre vite et juste. Ce n'est pas un produit grand public, ce n'est pas éditorial, ce n'est pas réglementé — c'est un outil de travail dense, consulté plusieurs fois par jour, dont la valeur se mesure en secondes gagnées avant un appel client.

Aujourd'hui, chaque page réinvente ses styles en ligne au cas par cas : tailles de titre différentes d'une page à l'autre (17px, 18px, 24px pour des `h1`), bordures fines partout, radius incohérents, un tableau de prix concurrents brut alors que le reste du produit affiche des cartes. Rien n'est cassé, mais rien ne se ressemble. Ce système corrige cela sans renier l'identité de marque déjà installée (orange `#E8651E`, marine `#122E47`) — il la formalise et l'applique avec constance.

La direction retenue est **« SaaS moderne »** : élévation douce (l'ombre porte la hiérarchie, pas la bordure), rayon généreux (12 à 20px sur les cartes), badges pilule pour tout ce qui encode un état ou une catégorie, comparateurs en barres horizontales plutôt qu'en tableaux froids, et des moments de dégradé (carte héro « Notre offre ») qui font gagner visuellement l'offre CertiPlace au lieu de se contenter de la signaler par du texte. L'orange est utilisé avec confiance — CTA, nav active, cartes héro, dégradés — jamais raréfié comme dans la direction « terminal financier » explicitement écartée par l'utilisateur.

Ce registre s'applique à l'ensemble du dashboard (Vue d'ensemble, Fiches, Concurrents, Imports, Assistant, Utilisateurs), pas seulement à l'écran qui a déclenché la démarche.

## Colors

- **Neutres (`bg`, `surface`, `surface-2`, `border`, `text*`)** — le canevas. `bg` (`#F6F7F9`) est le fond d'application ; `surface` (blanc) porte toutes les cartes, panneaux et modales ; `surface-2` sert aux zones basses-emphase (en-têtes de tableau, inputs, chips neutres). Les bordures (`border`, `border-strong`) restent réservées aux structures tabulaires denses (listes, tableaux) où l'ombre ajouterait du bruit visuel — voir Élévation.
- **Marine sidebar (`sidebar-*`)** — territoire visuel distinct du canevas principal, jamais réutilisé ailleurs dans l'app. `sidebar-active-bg` est un orange à 16 % d'opacité sur fond marine, avec une barre pleine (`sidebar-active-bar`) de 3px : l'état actif se lit en un coup d'œil sans dépendre uniquement de la couleur.
- **Orange marque (`primary*`)** — la couleur qui dit « CertiPlace » et « action principale ». Utilisée sans retenue : CTA primaires, nav active, carte héro « Notre offre » (dégradé `primary` → `primary-gradient-end`), avatar de l'Assistant, barre de prix « Nous » dans le comparateur. Ne signale jamais un état sémantique (jamais une erreur, jamais un avertissement) — cette distinction est non négociable pour un outil B2B où l'utilisateur doit pouvoir scanner l'écran sans ambiguïté entre « c'est notre marque » et « il y a un problème ».
- **Accent bleu (`accent*`)** — deuxième couleur informationnelle, neutre et non urgente. Sert aux badges de type « Concurrent » et « Support », aux chips de source citée dans l'Assistant. `concurrent` et `support` partagent intentionnellement ce même ton : ce sont deux catégories informatives plutôt qu'urgentes, et le libellé du badge (pas la couleur) porte la distinction — cohérent avec la charge cognitive d'un outil scanné, pas lu.
- **Sémantique d'état (`success`, `warning`, `danger`)** — strictement réservée à l'état : fiche validée vs à valider, confiance haute/moyenne/basse, hausse/baisse de prix concurrent, erreur de pipeline d'import. Ne jamais mélanger avec `primary` : un bouton orange n'est jamais un bouton d'erreur, un badge vert n'est jamais un badge de marque.
- **Rôles (`role-admin`, `role-csm`, `role-sales`)** — identité de personne (avatar, badge de rôle dans Utilisateurs et dans l'en-tête Assistant), un troisième registre chromatique distinct du sémantique et de la marque. `role-sales` réutilise la même valeur hex que `primary` par coïncidence historique du produit — traiter comme deux tokens séparés malgré la valeur partagée, ne pas fusionner : un futur changement de couleur de marque ne doit pas déteindre sur le badge de rôle Sales.

À éviter : introduire une nouvelle teinte de marque, utiliser `accent` pour un CTA principal (c'est le rôle de `primary`), utiliser du orange sur un badge de statut.

## Typography

Une seule famille dans tout le produit : **Public Sans**, y compris pour ce qui fait office de « mono » (`.mono` = Public Sans + `font-variant-numeric: tabular-nums`, pas une police à chasse fixe distincte). C'est un choix assumé, pas un défaut par manque de police — il garde le rendu cohérent sur les IDs, dates, prix et pourcentages sans rupture visuelle avec le reste du texte.

L'échelle de rôles remplace la pratique actuelle (chaque page choisit sa propre taille de `h1` — 17, 18 ou 24px selon l'écran) :

- `display` (34px / 800) — les grands nombres : valeur de stat card, prix sur la carte héro du comparateur.
- `heading-lg` (24px / 800) — titre de page, unique et cohérent sur les 6 destinations. Cible de migration pour les `h1` actuellement à 17-18px.
- `heading-md` (15px / 700) — titres de section/panneau (« Comparatif tarifaire », en-tête de modale, en-tête de tirette).
- `heading-sm` (13.5px / 600) — titre de carte (fiche, carte de raccourci, alerte).
- `body` (14px / 400) — texte d'interface par défaut, contenu de fiche, bulle de chat.
- `body-sm` (12.5px / 400) — texte secondaire, description de carte, sous-titre.
- `label` (11px / 700, `letter-spacing: 0.06em`, majuscules) — en-têtes de tableau, eyebrows de section.
- `caption` (11px / 500) — métadonnées, horodatages.

## Layout & Spacing

Sidebar fixe à 248px, contenu principal fluide. Largeur minimale supportée : **1080px** — pas de repli mobile, pas de breakpoint (voir `EXPERIENCE.md` → Foundation). En dessous, l'usage n'est pas un cas à concevoir.

Marge de page constante à `{spacing.page-margin}` (28px) — c'est déjà la valeur utilisée par la majorité des pages (`p-7`), à généraliser aux quelques écrans qui s'en écartent. Grille de cartes : `gap: {spacing.4}` (16px) pour les grilles denses (stat cards, raccourcis), jusqu'à `{spacing.6}`–`{spacing.7}` (24-28px) entre colonnes principales et panneaux latéraux (Concurrents, Imports). Padding interne de carte : 14 à 20px selon la densité du contenu.

## Elevation & Depth

Le changement de direction le plus visible : aujourd'hui, la profondeur vient presque exclusivement de bordures 1px. La direction « SaaS moderne » inverse cette priorité — l'ombre porte la hiérarchie sur les surfaces de type carte, la bordure reste réservée aux structures tabulaires denses (tableaux, listes de lignes) où une ombre par ligne créerait du bruit.

Trois paliers :

- **Repos** (`0 1px 2px rgba(16,30,50,.06), 0 1px 3px rgba(16,30,50,.04)`) — stat cards, panneaux au repos (`{components.stat-card.shadow}`, `{components.price-compare.shadow}`).
- **Survol / élévation** (`0 4px 12px` à `0 8px 24px rgba(0,0,0,.08–.10)`) — cartes interactives au hover (fiche-card, shortcut-card, comparison-card), toujours combiné à un léger `translateY(-1px)` à `translateY(-2px)`.
- **Flottant** (`0 24px 48px rgba(0,0,0,.18)` pour les modales, `0 10px 26px rgba(232,101,30,.35)` pour la carte héro) — surfaces qui se détachent complètement du flux (modale, carte « Notre offre »). La carte héro utilise une ombre teintée orange plutôt que neutre : elle doit se sentir comme un objet de marque, pas comme un panneau flottant générique.

Ne jamais empiler bordure lourde + ombre forte sur la même carte : c'est l'un ou l'autre selon le palier.

## Shapes

Rayon généreux sur les conteneurs, resserré sur les contrôles :

- `{rounded.sm}` (6px) / `{rounded.DEFAULT}` (8px) — inputs, petits boutons inline, chips de source.
- `{rounded.md}` (10px) — icônes de nav, badges d'icône.
- `{rounded.lg}` (12px) — modales, tirettes, alert-item, fiche-card.
- `{rounded.xl}` (16px) — stat card, shortcut card, category card, price-compare, comparison-card.
- `{rounded['2xl']}` (20px) — réservé aux moments de forte emphase (carte héro du comparateur, si une variante encore plus large est nécessaire).
- `{rounded.full}` — exclusivement les indicateurs d'état et de catégorie (type-badge, status-badge, chips) et les CTA à forte emphase (bouton « + Nouvelle fiche », filtres de type sur Imports). Jamais sur un conteneur, un tableau ou une tirette — le pilule est un signal d'état/action, pas une forme de carte.

L'imagerie et les icônes suivent le rayon de leur conteneur.

## Components

→ Maquettes de référence : [`mockups/concurrents.html`](mockups/concurrents.html), [`mockups/overview.html`](mockups/overview.html), [`mockups/fiches.html`](mockups/fiches.html), [`mockups/assistant.html`](mockups/assistant.html). Imports et Utilisateurs n'ont pas de maquette dédiée (décision utilisateur) — se construisent directement depuis les tables ci-dessous. Les maquettes illustrent les tokens ; ce texte fait foi en cas d'écart.

- **`sidebar-nav`** — item actif signalé par trois moyens simultanés : fond `{colors.sidebar-active-bg}`, texte blanc plein, et barre verticale de 3px en `{colors.sidebar-active-bar}` — jamais la couleur seule. Le badge numérique (ex. compteur sur « Fiches », « Imports ») passe de `sidebar-muted` à blanc 70 % selon l'état actif.
- **`stat-card`** — quatre cartes en grille sur Vue d'ensemble (Fiches validées, À valider, Angles morts, Imports actifs). Valeur en `{typography.display}` coloriée sémantiquement (succès si nombre normal, `text-faint` si zéro/neutre, `warning`/`accent` si actionnable) — la couleur de la valeur remplace un badge, elle *est* le badge.
- **`shortcut-card`** — carte de raccourci (Base de connaissance, Imports & validation, Assistant interne). Icône dans un carré `{rounded.lg}` teinté `primary-soft`/`primary`. Au survol : lift `-2px` + ombre renforcée + le lien « Ouvrir → » resserre son espacement interne (`gap` transition) pour suggérer le mouvement vers l'avant.
- **`category-card`** — grille d'accueil de Fiches. Trois états : repos (bordure neutre), actif (fond teinté + bordure `primary` 1.5px), admin-only (bordure pointillée `warning` — visuellement distincte pour signaler « ce filtre n'existe que pour vous »).
- **`fiche-card`** — anatomie fixe en 4 lignes : type-badge + status-badge, titre (2 lignes max), extrait de contenu (1 ligne), ID mono + confidence-bar. La carte active a une bordure `primary` 1.5px doublée d'un `box-shadow: 0 0 0 1px primary` (contour net, pas d'ombre diffuse — l'état "sélectionné" doit être sans ambiguïté).
- **`import-card`** — carte de validation d'un draft généré par le pipeline d'import. Hérite directement l'habillage de `fiche-card` (même fond, bordure, radius, padding) plutôt qu'une forme propre — c'est la même unité visuelle vue à un autre stade de son cycle de vie. Porte en plus un badge « ⚠ Confiance faible » (`warning-soft`/`warning`) quand `confidence_threshold < 0.70`, et passe à `opacity: 0.45` sans disparaître quand elle est rejetée (voir EXPERIENCE.md → Component Patterns pour le cycle d'état complet).
- **`type-badge`** — un badge pilule par type de fiche (`objection`, `guide_situation`, `cas_client`, `concurrent`, `doc_certiplace`, `veille`, `support`). Palette héritée du sémantique existant (voir Colors) ; `concurrent` et `support` partagent `accent`/`accent-soft` par choix, distingués par leur libellé.
- **`status-badge`** — dot + libellé texte, jamais l'un sans l'autre. `draft` = « À valider » (warning), `published` = « Validée » (success), `archived` = « Archivée » (neutre) `[ASSUMPTION: le badge "Archivée" n'a pas de rendu visuel existant dans le code actuel — les fiches archivées ne sont pas listées côté UI ; le token suit la convention neutre/faint déjà utilisée pour les états inactifs ailleurs dans l'app]`.
- **`confidence-bar`** — barre de progression fine (4px) codée par seuil : ≥85 % succès, ≥70 % avertissement, en dessous danger. Utilisée à l'identique sur fiche-card, tirette de fiche, et carte de validation d'import — un seul composant, trois emplacements.
- **`price-compare`** — panneau de barres horizontales (Concurrents). La barre « Nous » utilise le dégradé de marque (`primary` → `primary-gradient-end`), les barres concurrentes un gris neutre dégradé — le regard va directement à la barre orange.
- **`comparison-card`** — grille de cartes d'offre (Concurrents), avec variante `hero` pour « Notre offre » : fond dégradé marque, ombre teintée orange, badge « Notre offre » en pilule blanche, `grid-column: span 2`. Les cartes concurrentes restent neutres avec un badge pilule pour les fonctionnalités clés.
- **`alert-item`** — liste chronologique (timeline d'alertes concurrentielles). Accent de 3px à gauche coloré par nature de l'événement (hausse = danger, baisse = success, nouvelle fonctionnalité = warning) + icône emoji dans un badge `primary-soft`.
- **`chat-bubble`** — deux variantes. `user` : fond plein `primary`, coin supérieur droit resserré (`18px 18px 4px 18px`), aligné à droite. `assistant` : fond `surface` + bordure, avatar rond teinté `primary-soft`, coin supérieur gauche resserré, aligné à gauche. Les sources citées apparaissent en chips sous la bulle assistant, jamais dans la bulle elle-même. Les blocs `<draft>` (brouillons copiables) sont visuellement distincts : fond `surface-2`, filet gauche `primary` 3px, bouton « Copier » en coin.
- **`button-primary`** — deux radius selon l'emphase : `radius-cta` (pilule, `{rounded.full}`) pour les actions de premier niveau (« + Nouvelle fiche », envoi du chat), `radius-inline` (`{rounded.DEFAULT}`) pour les actions de contexte (« Valider », « Enregistrer » en pied de tirette/modale). Cette distinction remplace l'usage actuel incohérent (radius pilule et radius standard mélangés sans règle).
- **`button-secondary`** — fond `surface-2`, texte `text-muted`, devient `danger` au survol uniquement pour les actions destructives (« Archiver » ne change pas de fond, seulement de couleur de texte/bordure — la destruction se signale sans crier).
- **`modal`** — recouvrement centré, largeur fixe 520px, fermeture au clic sur l'overlay ou `Échap`. Un seul niveau de pile — jamais de modale sur modale.
- **`drawer`** — panneau latéral collant (`position: sticky`), largeur ~390px, anime en glissement depuis la droite à l'ouverture (`cbslide`). Fermeture au `✕` ou `Échap`.
- **`empty-state`** — deux variantes. `plain` : centré, texte `text-faint` sur fond `surface` bordé — pour les listes normalement vides (aucune fiche, aucun import). `tinted` : bordure pointillée + fond crème + emoji — réservé aux flux « rien de nouveau mais tout va bien » (ex. « Aucune nouvelle alerte cette semaine »), jamais utilisé pour une erreur.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Porter la profondeur des cartes par l'ombre (`{components.stat-card.shadow}` et paliers d'Élévation) | Empiler bordure épaisse + ombre forte sur une même carte |
| Réserver `{rounded.full}` aux badges d'état/catégorie et aux CTA de premier niveau | Utiliser le pilule sur un conteneur, un tableau ou une tirette |
| Utiliser `{colors.primary}` avec confiance — CTA, nav active, carte héro, dégradés | Rationner l'orange à un seul accent par page (direction « terminal financier » écartée) |
| Garder `success`/`warning`/`danger` strictement sémantiques | Utiliser l'orange pour signaler une erreur, un avertissement ou un succès |
| Coder chaque statut par pilule/dot **et** libellé texte | Faire reposer un statut sur la couleur seule |
| Utiliser `{components.empty-state.tinted-*}` pour les flux « rien de nouveau, tout va bien » | Réutiliser ce style pointillé pour une erreur ou un blocage (celles-ci restent en `danger-soft` plein) |
| Unifier tous les `h1` de page sur `{typography.heading-lg}` | Laisser chaque page choisir sa propre taille de titre (17/18/24px actuels) |
| Distinguer `concurrent` et `support` par le libellé du badge, pas par une nouvelle teinte | Inventer une nouvelle couleur de marque pour lever l'ambiguïté de deux badges de type |
