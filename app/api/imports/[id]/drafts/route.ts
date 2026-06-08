import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ImportFicheDraft } from '@/lib/supabase/types'

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
    .from('import_fiches_draft')
    .select('*')
    .eq('import_id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // missing_info en tête, puis par confiance décroissante
  const sorted = (data as ImportFicheDraft[]).sort((a, b) => {
    if (a.type === 'missing_info' && b.type !== 'missing_info') return -1
    if (b.type === 'missing_info' && a.type !== 'missing_info') return 1
    return (b.confidence ?? 0) - (a.confidence ?? 0)
  })

  return Response.json(sorted)
}
