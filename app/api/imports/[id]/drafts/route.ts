import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Fiche } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

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
    .from('fiches')
    .select('*')
    .eq('source_ref_id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const sorted = (data as Fiche[]).sort((a, b) => {
    // doc_certiplace (anciens angles morts) en tête, puis par confiance décroissante
    if (a.type === 'doc_certiplace' && b.type !== 'doc_certiplace') return -1
    if (b.type === 'doc_certiplace' && a.type !== 'doc_certiplace') return 1
    return (b.confidence_threshold ?? 0) - (a.confidence_threshold ?? 0)
  })

  return Response.json(sorted)
}
