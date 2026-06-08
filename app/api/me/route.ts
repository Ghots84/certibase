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
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  return Response.json({ id: user.id, role: profile?.role ?? 'new', full_name: profile?.full_name, email: profile?.email ?? user.email })
}
