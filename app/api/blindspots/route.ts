import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Blindspot } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('import_fiches_draft')
    .select('title, canal_source, created_at')
    .eq('type', 'missing_info')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Grouper par question (title) en TypeScript — Supabase JS ne supporte pas GROUP BY
  const map = new Map<string, { times_asked: number; canal: string; last_asked: string }>()
  for (const d of (data ?? []) as Array<{ title: string; canal_source: string | null; created_at: string }>) {
    const existing = map.get(d.title)
    if (existing) {
      existing.times_asked++
      if (d.created_at > existing.last_asked) existing.last_asked = d.created_at
    } else {
      map.set(d.title, {
        times_asked: 1,
        canal: d.canal_source ?? 'assistant',
        last_asked: d.created_at,
      })
    }
  }

  const result: Blindspot[] = Array.from(map.entries())
    .map(([question, s]) => ({ question, ...s }))
    .sort((a, b) => b.times_asked - a.times_asked)
    .slice(0, 20)

  return Response.json(result)
}
