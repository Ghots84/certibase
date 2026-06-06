// Client Supabase côté serveur (Server Components, Route Handlers, Server Actions)
// cookies() est async en Next.js 16 — toujours await avant utilisation
// Ne pas utiliser dans les Client Components

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll peut être appelé depuis un Server Component en lecture seule
            // L'erreur est silencieuse car les cookies de session sont gérés par le middleware
          }
        },
      },
    }
  )
}
