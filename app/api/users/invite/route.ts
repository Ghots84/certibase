import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const { email } = await request.json()

  if (!email?.trim()) {
    return Response.json({ error: 'email required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  const { error } = await admin.auth.admin.inviteUserByEmail(email.trim())

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ success: true })
}
