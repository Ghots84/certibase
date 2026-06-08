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

  const { data: draft } = await admin
    .from('import_fiches_draft').select('status').eq('id', id).single()
  if (!draft) return Response.json({ error: 'Draft introuvable' }, { status: 404 })
  if (draft.status !== 'pending') return Response.json({ error: 'Draft déjà traité' }, { status: 409 })

  await admin.from('import_fiches_draft').update({
    status:       'rejected',
    validated_by: user.id,
  }).eq('id', id)

  return Response.json({ success: true })
}
