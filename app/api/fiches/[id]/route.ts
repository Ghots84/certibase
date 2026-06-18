import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, isAdmin: false }
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  return { user, isAdmin: profile?.role === 'admin' }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { user, isAdmin } = await getAdminUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })
  if (!isAdmin) return Response.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json()
  const ALLOWED = ['status', 'title', 'type', 'content', 'profil_cible', 'confidence_threshold']
  const patch = Object.fromEntries(
    Object.entries(body as Record<string, unknown>).filter(([k]) => ALLOWED.includes(k))
  )

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('fiches')
    .update(patch)
    .eq('id', id)
    .select('id, type, title, content, status, confidence_threshold, source, created_at, profil_cible')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { user, isAdmin } = await getAdminUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })
  if (!isAdmin) return Response.json({ error: 'forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { error } = await admin.from('fiches').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return new Response(null, { status: 204 })
}