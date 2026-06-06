---
baseline_commit: NO_VCS
---

# Story 1.2 : Authentification & AppShell

Status: review

## Story

En tant que membre de l'équipe CertiPlace,
Je veux me connecter à CertiBase et accéder à la console avec une interface claire,
Afin de naviguer entre les 4 vues selon mon rôle.

## Acceptance Criteria

1. Un utilisateur non authentifié accédant à n'importe quelle route protégée est redirigé vers `/login`
2. Un utilisateur avec des identifiants Supabase Auth valides peut se connecter et est redirigé vers `/` (Vue d'ensemble)
3. L'AppShell est affiché avec : sidebar 250px marine (#122E47) + topbar 60px + zone scrollable principale
4. La sidebar contient : logo "CB" carré orange 38px + "CertiBase / Console interne" ; 4 nav items (Vue d'ensemble, Fiches, Imports & validation, Assistant interne) ; spacer ; carte "Agents alimentés" ; bloc utilisateur (initiales + nom + rôle depuis `profiles`)
5. Le nav item actif a fond `sidebar-active-bg` (rgba(232,101,30,0.16)) et barre gauche 3px orange (#E8651E)
6. Le topbar affiche le fil d'ariane "CertiBase › <vue active>" et une cloche notifications avec pastille orange
7. Les tokens CSS de la direction "Clarté" (Public Sans, orange #E8651E, marine #122E47) sont appliqués globalement
8. La déconnexion fonctionne et redirige vers `/login`

## Tasks / Subtasks

- [x] Task 1 — Middleware Supabase Auth (AC: 1)
  - [x] Créer `middleware.ts` à la racine avec pattern SSR Supabase
  - [x] Protéger toutes les routes sauf `/login` et assets statiques
  - [x] Rediriger les non-authentifiés vers `/login`

- [x] Task 2 — Page Login (AC: 1, 2)
  - [x] Créer `app/(auth)/login/page.tsx` (Server Component)
  - [x] Créer `app/(auth)/login/login-form.tsx` (Client Component)
  - [x] Créer `app/(auth)/login/actions.ts` (Server Actions signIn/signOut)
  - [x] Redirection post-login vers `/`
  - [x] Gestion d'erreur (identifiants incorrects)

- [x] Task 3 — Tokens CSS Clarté + Public Sans (AC: 7)
  - [x] Remplacer `app/globals.css` avec les 40+ variables CSS du thème Clarté
  - [x] Ajouter Public Sans via `next/font/google` dans `app/layout.tsx`
  - [x] Remplacer Geist par Public Sans

- [x] Task 4 — AppShell layout (AC: 3, 4, 5, 6)
  - [x] Créer `app/(dashboard)/layout.tsx`
  - [x] Créer `components/icons.tsx` (6 SVG : Grid, Cards, Import, Chat, Chevron, Bell, Logout)
  - [x] Créer `components/sidebar.tsx` (250px marine, brand, nav, agents card, user block)
  - [x] Créer `components/topbar.tsx` (60px, breadcrumb, cloche)
  - [x] Créer `components/nav-item.tsx` (actif : bg + barre gauche 3px)
  - [x] Créer `components/sign-out-button.tsx` (Client Component)

- [x] Task 5 — Routes dashboard (AC: 2, 4)
  - [x] Créer `app/(dashboard)/page.tsx` (Overview placeholder)
  - [x] Créer `app/(dashboard)/fiches/page.tsx` (placeholder)
  - [x] Créer `app/(dashboard)/imports/page.tsx` (placeholder)
  - [x] Créer `app/(dashboard)/assistant/page.tsx` (placeholder)
  - [x] Supprimer `app/page.tsx` (conflit route `/` avec (dashboard)/page.tsx)

- [x] Task 6 — Déconnexion (AC: 8)
  - [x] SignOutButton dans sidebar avec action `signOut`
  - [x] Server Action `signOut` → supabase.auth.signOut() + redirect `/login`

## Dev Notes

### ⚠️ CRITIQUE — Next.js 16.2.6 : lire la doc AVANT de coder

Lire : `node_modules/next/dist/docs/01-app/02-guides/authentication.md`

En Next.js 16 App Router :
- `cookies()` de `next/headers` est **async** → toujours `await cookies()`
- Les Server Actions utilisent `'use server'` au niveau du fichier ou de la fonction
- Les Route Groups `(auth)` et `(dashboard)` n'affectent pas l'URL — `/login` reste `/login`
- `middleware.ts` doit être à la **racine** du projet (pas dans `app/`)

### Apprentissages de la Story 1.1

- `lib/supabase/server.ts` : `createClient()` est async, toujours `await createClient()`
- `lib/supabase/client.ts` : browser client synchrone
- `lib/supabase/types.ts` : types disponibles (`Profile`, `UserRole`, etc.)
- Alias `@/*` → `./` (ex: `@/lib/supabase/server`)
- npm install : utiliser `--strict-ssl false` si erreur SSL

### Middleware Supabase (pattern exact)

```typescript
// middleware.ts — À LA RACINE du projet
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

### Tokens CSS Clarté — variables à injecter dans globals.css

```css
/* Remplacer le contenu de app/globals.css par ceci */
@import "tailwindcss";

:root {
  /* Typographie */
  --font-body: 'Public Sans', system-ui, sans-serif;
  --font-head: 'Public Sans', system-ui, sans-serif;
  --font-mono: 'Public Sans', ui-monospace, monospace;
  --head-weight: 700;
  --head-spacing: -0.01em;

  /* Couleurs de fond */
  --bg: #F6F7F9;
  --surface: #FFFFFF;
  --surface-2: #F1F3F6;
  --surface-hover: #F6F8FB;

  /* Texte */
  --text: #15212E;
  --text-muted: #5B6675;
  --text-faint: #8A94A2;

  /* Bordures */
  --border: #E3E7EC;
  --border-strong: #D2D8E0;

  /* Sidebar */
  --sidebar-bg: #122E47;
  --sidebar-text: #E7EDF4;
  --sidebar-muted: #8AA0B5;
  --sidebar-active-bg: rgba(232, 101, 30, 0.16);
  --sidebar-active-text: #FFFFFF;
  --sidebar-active-bar: #E8651E;
  --sidebar-border: rgba(255, 255, 255, 0.08);

  /* Couleurs primaires */
  --primary: #E8651E;
  --primary-hover: #D2570F;
  --primary-text: #FFFFFF;
  --primary-soft: #FCEDE3;
  --primary-soft-text: #B14E10;

  /* Accent */
  --accent: #1E5B9E;
  --accent-soft: #E8F0F8;
  --accent-soft-text: #1E5B9E;

  /* États */
  --success: #1F8A5B;
  --success-soft: #E3F3EB;
  --warning: #B8770C;
  --warning-soft: #FBF0DA;
  --danger: #C0392B;
  --danger-soft: #F8E4E1;

  /* Espacements & formes */
  --radius: 8px;
  --radius-sm: 6px;
  --radius-lg: 12px;
  --radius-pill: 999px;
  --shadow: 0 1px 2px rgba(16,30,50,.06), 0 1px 3px rgba(16,30,50,.04);
  --shadow-lg: 0 8px 28px rgba(16,30,50,.12);
  --shadow-pop: 0 12px 40px rgba(16,30,50,.18);
  --gap: 16px;
  --control-h: 38px;
  --chip-radius: 6px;
}

body {
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  font-size: 15px;
  line-height: 1.5;
}

* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
.mono { font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
```

### Structure de fichiers à créer

```
mon-projet/
├── middleware.ts                          ← NOUVEAU (racine)
├── app/
│   ├── globals.css                        ← MODIFIER (tokens Clarté)
│   ├── layout.tsx                         ← MODIFIER (Public Sans, fond bg)
│   ├── page.tsx                           ← MODIFIER (redirect vers /)
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx                   ← NOUVEAU
│   └── (dashboard)/
│       ├── layout.tsx                     ← NOUVEAU (AppShell)
│       ├── page.tsx                       ← NOUVEAU (Overview placeholder)
│       ├── fiches/
│       │   └── page.tsx                   ← NOUVEAU (placeholder)
│       ├── imports/
│       │   └── page.tsx                   ← NOUVEAU (placeholder)
│       └── assistant/
│           └── page.tsx                   ← NOUVEAU (placeholder)
└── components/
    ├── sidebar.tsx                        ← NOUVEAU
    ├── topbar.tsx                         ← NOUVEAU
    └── nav-item.tsx                       ← NOUVEAU
```

### Spécifications UX exactes — Sidebar (depuis prototype app.jsx + styles.css)

```
Sidebar : width 250px fixe, background #122E47, flex column, padding 18px 14px, gap 6px

Brand block (top) :
  - Logo : div 38px × 38px, border-radius 8px, background #E8651E, text "CB", font-weight 800, color #fff
  - "CertiBase" : font-weight 700, color #E7EDF4, font-size 16px
  - "Console interne" : font-size 11.5px, color #8AA0B5

Nav items (4) :
  - Vue d'ensemble → href="/"     → icon: grid
  - Fiches          → href="/fiches"   → icon: cards, badge="8"
  - Imports & validation → href="/imports" → icon: import, badge="4"
  - Assistant interne → href="/assistant" → icon: chat
  
  Item style : flex, gap 11px, padding 9px 11px, border-radius 6px, color #8AA0B5, font-size 14px
  Item actif : background rgba(232,101,30,0.16), color #fff, font-weight 600
               + ::before barre gauche : position absolute, left -14px, width 3px, background #E8651E
  Badge : font-size 11px, background #E8651E, color #fff, border-radius 999px, padding 1px 7px

Spacer : flex:1

Carte "Agents alimentés" :
  - background rgba(232,101,30,0.16), border 1px solid rgba(255,255,255,0.08), border-radius 8px, padding 12px
  - Titre : "Agents alimentés", font-size 11px, uppercase, color #8AA0B5
  - 3 lignes : pastille (8px dot) + label + état mono
    · CSM Digital    : dot #1F8A5B, état "actif"
    · Sales Digital  : dot #1F8A5B, état "actif"
    · Assistant interne : dot #E8651E, état "V1"

Bloc utilisateur (bottom) :
  - padding 8px, border-top 1px solid rgba(255,255,255,0.08)
  - Avatar : 30px × 30px, border-radius 6px, background violet #7A5AF8 (admin), initiales (depuis profiles.avatar_initials ou initiales calculées)
  - Nom : font-size 13px, font-weight 600, color #E7EDF4
  - Rôle : font-size 11px, color #8AA0B5
```

### Spécifications UX exactes — Topbar

```
Topbar : height 60px, background #FFFFFF, border-bottom 1px solid #E3E7EC, 
         padding 0 24px, flex, align-items center, justify-content space-between

Gauche — Fil d'ariane :
  "CertiBase" (color #8A94A2, font-weight 500) → chevron → "<vue active>" (color #15212E, font-weight 600)

Droite — Cloche :
  Bouton 38px × 38px, border-radius 6px, border 1px solid #E3E7EC
  Icône cloche (SVG stroke)
  Pastille : 7px × 7px, background #E8651E, position absolute top-right, border 2px solid #fff
```

### app/layout.tsx — modifications requises

```tsx
// Remplacer Geist par Public Sans
import { Public_Sans } from 'next/font/google'

const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-public-sans',
})

// html : lang="fr", className publicsans variable
// body : fond var(--bg), height 100%
```

### Icônes SVG requises (extraites du prototype ui.jsx)

Créer `components/icons.tsx` avec ces composants SVG stroke (strokeWidth 1.6) :
- `IconGrid` — 4 rectangles en grille (Vue d'ensemble)
- `IconCards` — 2 rectangles empilés (Fiches)
- `IconImport` — flèche vers le bas + ligne (Imports)
- `IconChat` — bulle de conversation (Assistant)
- `IconChevron` — chevron droit `M9 6l6 6-6 6`
- `IconBell` — cloche `M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z` + `M10 20a2 2 0 0 0 4 0`

### Login page — structure minimale

```tsx
// app/(auth)/login/page.tsx — Server Component avec 'use server' action
// Pas de validation Zod pour le MVP — juste email + password
// Utiliser supabase.auth.signInWithPassword()
// En cas d'erreur : afficher message "Email ou mot de passe incorrect"
// Post-success : redirect('/') via next/navigation
```

### Badges nav — données dynamiques (Story 1.3+)

Pour le MVP de cette story, les badges sont des **valeurs statiques** hardcodées :
- Fiches: `8`, Imports: `4` — ils seront dynamiques en Story 3.1 et 2.4.

### Règles de non-régression

- Ne pas supprimer `lib/supabase/` (client, server, types) de Story 1.1
- Ne pas toucher aux migrations SQL
- `app/globals.css` : remplacer entièrement (le contenu actuel est le boilerplate Next.js)
- `app/page.tsx` : remplacer entièrement (c'est le boilerplate Next.js — sans valeur)
- `app/layout.tsx` : modifier seulement la police et les classes html/body

### References

- [Source: epics.md — Story 1.2 Acceptance Criteria]
- [Source: prototype/app.jsx — AppShell, Sidebar, Nav items, Agents card, User block]
- [Source: prototype/styles.css — cb-sidebar, cb-nav-item, cb-topbar, cb-brand classes]
- [Source: prototype/themes.js — direction "clarte", toutes les variables CSS]
- [Source: prototype/README.md — Screen specs AppShell layout, Sidebar, Topbar]
- [Source: lib/supabase/server.ts — createClient() async pattern]
- [Source: Story 1.1 — packages installés, alias @/*, tsconfig]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `app/page.tsx` supprimé (conflit route `/` avec `app/(dashboard)/page.tsx` — les deux résolvent à `/` en App Router)
- `.next/` cache supprimé après suppression de `app/page.tsx` pour éviter les faux positifs tsc
- `IconProps` étendu avec `style?: React.CSSProperties` pour `<IconChevron style=.../>` dans Topbar
- `npx tsc --noEmit` → 0 erreur après corrections

### Completion Notes List

- Middleware SSR Supabase protège toutes les routes non-login (inclut assets exclus du matcher)
- Login : Server Component (check auth upfront) + Client Component (form interactif) + Server Actions (signIn/signOut)
- 40+ variables CSS Clarté injectées dans globals.css — thème disponible globalement via var()
- Public Sans (400/500/600/700) remplace Geist
- AppShell : Sidebar async Server Component (récupère le profil Supabase) + Topbar Client Component (usePathname pour breadcrumb)
- NavItem utilise `usePathname()` pour détecter l'état actif — compatible App Router
- Déconnexion : bouton dans sidebar → Server Action → supabase.auth.signOut() → redirect /login
- Badges nav statiques (8, 4) — deviendront dynamiques en Stories 3.1 et 2.4

### File List

- middleware.ts (NEW)
- app/layout.tsx (MODIFIED — Public Sans, lang fr, hauteur 100%)
- app/globals.css (MODIFIED — tokens Clarté complets, suppression boilerplate Next.js)
- app/page.tsx (DELETED — conflit route /)
- app/(auth)/login/page.tsx (NEW)
- app/(auth)/login/login-form.tsx (NEW)
- app/(auth)/login/actions.ts (NEW)
- app/(dashboard)/layout.tsx (NEW)
- app/(dashboard)/page.tsx (NEW)
- app/(dashboard)/fiches/page.tsx (NEW)
- app/(dashboard)/imports/page.tsx (NEW)
- app/(dashboard)/assistant/page.tsx (NEW)
- components/icons.tsx (NEW)
- components/nav-item.tsx (NEW)
- components/sidebar.tsx (NEW)
- components/topbar.tsx (NEW)
- components/sign-out-button.tsx (NEW)
