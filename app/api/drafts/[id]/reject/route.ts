import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
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

  const { data: fiche } = await admin
    .from('fiches').select('id, status').eq('id', id).single()
  if (!fiche) return Response.json({ error: 'Fiche introuvable' }, { status: 404 })
  if (fiche.status !== 'draft') return Response.json({ error: 'Fiche déjà traitée' }, { status: 409 })

  const { error } = await admin.from('fiches').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true })
}
