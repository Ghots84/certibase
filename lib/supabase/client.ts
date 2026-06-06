// Client Supabase côté navigateur (Client Components)
// Utiliser dans les composants React avec 'use client'
// Ne jamais utiliser SUPABASE_SERVICE_ROLE_KEY ici (exposition côté client)

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
