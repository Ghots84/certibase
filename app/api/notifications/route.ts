import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  let query = admin
    .from('imports')
    .select('*')
    .in('status', ['ready', 'error'])
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!isAdmin) {
    query = query.eq('uploaded_by', user.id)
  }

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data ?? [])
}
