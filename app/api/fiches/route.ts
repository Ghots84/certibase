import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { FicheType, ProfilCible } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return Response.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json() as {
    title: string
    type: FicheType
    content: string
    profil_cible?: ProfilCible
  }
  const { title, type, content, profil_cible } = body
  if (!title || !type || !content) {
    return Response.json({ error: 'title, type et content sont requis' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('fiches')
    .insert({
      title,
      type,
      content,
      profil_cible: profil_cible ?? 'all',
      source: 'manual',
      status: 'draft',
      author_id: user.id,
      confidence_threshold: 0.75,
    })
    .select('id, type, title, content, status, confidence_threshold, source, created_at, profil_cible')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Check caller's role to decide whether to expose draft fiches
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // ?include_drafts=1 is only honoured for admin users
  const url = new URL(request.url)
  const includeDrafts = isAdmin && url.searchParams.get('include_drafts') === '1'

  let query = admin
    .from('fiches')
    .select('id, type, title, content, status, confidence_threshold, source, created_at, profil_cible')
    .order('created_at', { ascending: false })

  if (!includeDrafts) {
    query = query.eq('status', 'published')
  } else {
    // Admins see published + draft (not archived)
    query = query.in('status', ['published', 'draft'])
  }

  const { data, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data ?? [])
}
