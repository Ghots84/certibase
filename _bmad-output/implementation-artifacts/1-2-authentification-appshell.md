---
baseline_commit: NO_VCS
---

# Story 1.2 : Authentification & AppShell

Status: done

## Story

En tant que membre de l'Ã©quipe CertiPlace,
Je veux me connecter Ã  CertiBase et accÃ©der Ã  la console avec une interface claire,
Afin de naviguer entre les 4 vues selon mon rÃ´le.

## Acceptance Criteria

1. Un utilisateur non authentifiÃ© accÃ©dant Ã  n'importe quelle route protÃ©gÃ©e est redirigÃ© vers `/login`
2. Un utilisateur avec des identifiants Supabase Auth valides peut se connecter et est redirigÃ© vers `/` (Vue d'ensemble)
3. L'AppShell est affichÃ© avec : sidebar 250px marine (#122E47) + topbar 60px + zone scrollable principale
4. La sidebar contient : logo "CB" carrÃ© orange 38px + "CertiBase / Console interne" ; 4 nav items (Vue d'ensemble, Fiches, Imports & validation, Assistant interne) ; spacer ; carte "Agents alimentÃ©s" ; bloc utilisateur (initiales + nom + rÃ´le depuis `profiles`)
5. Le nav item actif a fond `sidebar-active-bg` (rgba(232,101,30,0.16)) et barre gauche 3px orange (#E8651E)
6. Le topbar affiche le fil d'ariane "CertiBase â€º <vue active>" et une cloche notifications avec pastille orange
7. Les tokens CSS de la direction "ClartÃ©" (Public Sans, orange #E8651E, marine #122E47) sont appliquÃ©s globalement
8. La dÃ©connexion fonctionne et redirige vers `/login`

## Tasks / Subtasks

- [x] Task 1 â€” Middleware Supabase Auth (AC: 1)
  - [x] CrÃ©er `middleware.ts` Ã  la racine avec pattern SSR Supabase
  - [x] ProtÃ©ger toutes les routes sauf `/login` et assets statiques
  - [x] Rediriger les non-authentifiÃ©s vers `/login`

- [x] Task 2 â€” Page Login (AC: 1, 2)
  - [x] CrÃ©er `app/(auth)/login/page.tsx` (Server Component)
  - [x] CrÃ©er `app/(auth)/login/login-form.tsx` (Client Component)
  - [x] CrÃ©er `app/(auth)/login/actions.ts` (Server Actions signIn/signOut)
  - [x] Redirection post-login vers `/`
  - [x] Gestion d'erreur (identifiants incorrects)

- [x] Task 3 â€” Tokens CSS ClartÃ© + Public Sans (AC: 7)
  - [x] Remplacer `app/globals.css` avec les 40+ variables CSS du thÃ¨me ClartÃ©
  - [x] Ajouter Public Sans via `next/font/google` dans `app/layout.tsx`
  - [x] Remplacer Geist par Public Sans

- [x] Task 4 â€” AppShell layout (AC: 3, 4, 5, 6)
  - [x] CrÃ©er `app/(dashboard)/layout.tsx`
  - [x] CrÃ©er `components/icons.tsx` (6 SVG : Grid, Cards, Import, Chat, Chevron, Bell, Logout)
  - [x] CrÃ©er `components/sidebar.tsx` (250px marine, brand, nav, agents card, user block)
  - [x] CrÃ©er `components/topbar.tsx` (60px, breadcrumb, cloche)
  - [x] CrÃ©er `components/nav-item.tsx` (actif : bg + barre gauche 3px)
  - [x] CrÃ©er `components/sign-out-button.tsx` (Client Component)

- [x] Task 5 â€” Routes dashboard (AC: 2, 4)
  - [x] CrÃ©er `app/(dashboard)/page.tsx` (Overview placeholder)
  - [x] CrÃ©er `app/(dashboard)/fiches/page.tsx` (placeholder)
  - [x] CrÃ©er `app/(dashboard)/imports/page.tsx` (placeholder)
  - [x] CrÃ©er `app/(dashboard)/assistant/page.tsx` (placeholder)
  - [x] Supprimer `app/page.tsx` (conflit route `/` avec (dashboard)/page.tsx)

- [x] Task 6 â€” DÃ©connexion (AC: 8)
  - [x] SignOutButton dans sidebar avec action `signOut`
  - [x] Server Action `signOut` â†’ supabase.auth.signOut() + redirect `/login`

## Dev Notes

### âš ï¸ CRITIQUE â€” Next.js 16.2.6 : lire la doc AVANT de coder

Lire : `node_modules/next/dist/docs/01-app/02-guides/authentication.md`

En Next.js 16 App Router :
- `cookies()` de `next/headers` est **async** â†’ toujours `await cookies()`
- Les Server Actions utilisent `'use server'` au niveau du fichier ou de la fonction
- Les Route Groups `(auth)` et `(dashboard)` n'affectent pas l'URL â€” `/login` reste `/login`
- `middleware.ts` doit Ãªtre Ã  la **racine** du projet (pas dans `app/`)

### Apprentissages de la Story 1.1

- `lib/supabase/server.ts` : `createClient()` est async, toujours `await createClient()`
- `lib/supabase/client.ts` : browser client synchrone
- `lib/supabase/types.ts` : types disponibles (`Profile`, `UserRole`, etc.)
- Alias `@/*` â†’ `./` (ex: `@/lib/supabase/server`)
- npm install : utiliser `--strict-ssl false` si erreur SSL

### Middleware Supabase (pattern exact)

```typescript
// middleware.ts â€” Ã€ LA RACINE du projet
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

### Tokens CSS ClartÃ© â€” variables Ã  injecter dans globals.css

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

  /* Ã‰tats */
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

### Structure de fichiers Ã  crÃ©er

```
mon-projet/
â”œâ”€â”€ middleware.ts                          â† NOUVEAU (racine)
â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ globals.css                        â† MODIFIER (tokens ClartÃ©)
â”‚   â”œâ”€â”€ layout.tsx                         â† MODIFIER (Public Sans, fond bg)
â”‚   â”œâ”€â”€ page.tsx                           â† MODIFIER (redirect vers /)
â”‚   â”œâ”€â”€ (auth)/
â”‚   â”‚   â””â”€â”€ login/
â”‚   â”‚       â””â”€â”€ page.tsx                   â† NOUVEAU
â”‚   â””â”€â”€ (dashboard)/
â”‚       â”œâ”€â”€ layout.tsx                     â† NOUVEAU (AppShell)
â”‚       â”œâ”€â”€ page.tsx                       â† NOUVEAU (Overview placeholder)
â”‚       â”œâ”€â”€ fiches/
â”‚       â”‚   â””â”€â”€ page.tsx                   â† NOUVEAU (placeholder)
â”‚       â”œâ”€â”€ imports/
â”‚       â”‚   â””â”€â”€ page.tsx                   â† NOUVEAU (placeholder)
â”‚       â””â”€â”€ assistant/
â”‚           â””â”€â”€ page.tsx                   â† NOUVEAU (placeholder)
â””â”€â”€ components/
    â”œâ”€â”€ sidebar.tsx                        â† NOUVEAU
    â”œâ”€â”€ topbar.tsx                         â† NOUVEAU
    â””â”€â”€ nav-item.tsx                       â† NOUVEAU
```

### SpÃ©cifications UX exactes â€” Sidebar (depuis prototype app.jsx + styles.css)

```
Sidebar : width 250px fixe, background #122E47, flex column, padding 18px 14px, gap 6px

Brand block (top) :
  - Logo : div 38px Ã— 38px, border-radius 8px, background #E8651E, text "CB", font-weight 800, color #fff
  - "CertiBase" : font-weight 700, color #E7EDF4, font-size 16px
  - "Console interne" : font-size 11.5px, color #8AA0B5

Nav items (4) :
  - Vue d'ensemble â†’ href="/"     â†’ icon: grid
  - Fiches          â†’ href="/fiches"   â†’ icon: cards, badge="8"
  - Imports & validation â†’ href="/imports" â†’ icon: import, badge="4"
  - Assistant interne â†’ href="/assistant" â†’ icon: chat
  
  Item style : flex, gap 11px, padding 9px 11px, border-radius 6px, color #8AA0B5, font-size 14px
  Item actif : background rgba(232,101,30,0.16), color #fff, font-weight 600
               + ::before barre gauche : position absolute, left -14px, width 3px, background #E8651E
  Badge : font-size 11px, background #E8651E, color #fff, border-radius 999px, padding 1px 7px

Spacer : flex:1

Carte "Agents alimentÃ©s" :
  - background rgba(232,101,30,0.16), border 1px solid rgba(255,255,255,0.08), border-radius 8px, padding 12px
  - Titre : "Agents alimentÃ©s", font-size 11px, uppercase, color #8AA0B5
  - 3 lignes : pastille (8px dot) + label + Ã©tat mono
    Â· CSM Digital    : dot #1F8A5B, Ã©tat "actif"
    Â· Sales Digital  : dot #1F8A5B, Ã©tat "actif"
    Â· Assistant interne : dot #E8651E, Ã©tat "V1"

Bloc utilisateur (bottom) :
  - padding 8px, border-top 1px solid rgba(255,255,255,0.08)
  - Avatar : 30px Ã— 30px, border-radius 6px, background violet #7A5AF8 (admin), initiales (depuis profiles.avatar_initials ou initiales calculÃ©es)
  - Nom : font-size 13px, font-weight 600, color #E7EDF4
  - RÃ´le : font-size 11px, color #8AA0B5
```

### SpÃ©cifications UX exactes â€” Topbar

```
Topbar : height 60px, background #FFFFFF, border-bottom 1px solid #E3E7EC, 
         padding 0 24px, flex, align-items center, justify-content space-between

Gauche â€” Fil d'ariane :
  "CertiBase" (color #8A94A2, font-weight 500) â†’ chevron â†’ "<vue active>" (color #15212E, font-weight 600)

Droite â€” Cloche :
  Bouton 38px Ã— 38px, border-radius 6px, border 1px solid #E3E7EC
  IcÃ´ne cloche (SVG stroke)
  Pastille : 7px Ã— 7px, background #E8651E, position absolute top-right, border 2px solid #fff
```

### app/layout.tsx â€” modifications requises

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

### IcÃ´nes SVG requises (extraites du prototype ui.jsx)

CrÃ©er `components/icons.tsx` avec ces composants SVG stroke (strokeWidth 1.6) :
- `IconGrid` â€” 4 rectangles en grille (Vue d'ensemble)
- `IconCards` â€” 2 rectangles empilÃ©s (Fiches)
- `IconImport` â€” flÃ¨che vers le bas + ligne (Imports)
- `IconChat` â€” bulle de conversation (Assistant)
- `IconChevron` â€” chevron droit `M9 6l6 6-6 6`
- `IconBell` â€” cloche `M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z` + `M10 20a2 2 0 0 0 4 0`

### Login page â€” structure minimale

```tsx
// app/(auth)/login/page.tsx â€” Server Component avec 'use server' action
// Pas de validation Zod pour le MVP â€” juste email + password
// Utiliser supabase.auth.signInWithPassword()
// En cas d'erreur : afficher message "Email ou mot de passe incorrect"
// Post-success : redirect('/') via next/navigation
```

### Badges nav â€” donnÃ©es dynamiques (Story 1.3+)

Pour le MVP de cette story, les badges sont des **valeurs statiques** hardcodÃ©es :
- Fiches: `8`, Imports: `4` â€” ils seront dynamiques en Story 3.1 et 2.4.

### RÃ¨gles de non-rÃ©gression

- Ne pas supprimer `lib/supabase/` (client, server, types) de Story 1.1
- Ne pas toucher aux migrations SQL
- `app/globals.css` : remplacer entiÃ¨rement (le contenu actuel est le boilerplate Next.js)
- `app/page.tsx` : remplacer entiÃ¨rement (c'est le boilerplate Next.js â€” sans valeur)
- `app/layout.tsx` : modifier seulement la police et les classes html/body

### References

- [Source: epics.md â€” Story 1.2 Acceptance Criteria]
- [Source: prototype/app.jsx â€” AppShell, Sidebar, Nav items, Agents card, User block]
- [Source: prototype/styles.css â€” cb-sidebar, cb-nav-item, cb-topbar, cb-brand classes]
- [Source: prototype/themes.js â€” direction "clarte", toutes les variables CSS]
- [Source: prototype/README.md â€” Screen specs AppShell layout, Sidebar, Topbar]
- [Source: lib/supabase/server.ts â€” createClient() async pattern]
- [Source: Story 1.1 â€” packages installÃ©s, alias @/*, tsconfig]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `app/page.tsx` supprimÃ© (conflit route `/` avec `app/(dashboard)/page.tsx` â€” les deux rÃ©solvent Ã  `/` en App Router)
- `.next/` cache supprimÃ© aprÃ¨s suppression de `app/page.tsx` pour Ã©viter les faux positifs tsc
- `IconProps` Ã©tendu avec `style?: React.CSSProperties` pour `<IconChevron style=.../>` dans Topbar
- `npx tsc --noEmit` â†’ 0 erreur aprÃ¨s corrections

### Completion Notes List

- Middleware SSR Supabase protÃ¨ge toutes les routes non-login (inclut assets exclus du matcher)
- Login : Server Component (check auth upfront) + Client Component (form interactif) + Server Actions (signIn/signOut)
- 40+ variables CSS ClartÃ© injectÃ©es dans globals.css â€” thÃ¨me disponible globalement via var()
- Public Sans (400/500/600/700) remplace Geist
- AppShell : Sidebar async Server Component (rÃ©cupÃ¨re le profil Supabase) + Topbar Client Component (usePathname pour breadcrumb)
- NavItem utilise `usePathname()` pour dÃ©tecter l'Ã©tat actif â€” compatible App Router
- DÃ©connexion : bouton dans sidebar â†’ Server Action â†’ supabase.auth.signOut() â†’ redirect /login
- Badges nav statiques (8, 4) â€” deviendront dynamiques en Stories 3.1 et 2.4

### File List

- middleware.ts (NEW)
- app/layout.tsx (MODIFIED â€” Public Sans, lang fr, hauteur 100%)
- app/globals.css (MODIFIED â€” tokens ClartÃ© complets, suppression boilerplate Next.js)
- app/page.tsx (DELETED â€” conflit route /)
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

