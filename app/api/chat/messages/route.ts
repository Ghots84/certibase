import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  // Purger les messages > 90 jours (fire-and-forget)
  supabase
    .from('chat_messages')
    .delete()
    .eq('user_id', user.id)
    .lt('created_at', new Date(Date.now() - 90 * 24 * 3_600_000).toISOString())
    .then()

  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, sources, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Remettre en ordre chronologique ASC pour l'affichage chat
  return Response.json((data ?? []).reverse())
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const { role, content, sources } = await request.json()
  if (!role || !content) {
    return Response.json({ error: 'role and content required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('chat_messages')
    .insert({ user_id: user.id, role, content, sources: sources ?? [] })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
