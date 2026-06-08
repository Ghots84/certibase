import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

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
