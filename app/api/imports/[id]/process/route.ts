import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runImportPipeline } from '@/lib/import-pipeline'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // Auth — session cookie (UI) ou header interne (after() dans upload/url)
  const isInternal = request.headers.get('x-internal-pipeline') === 'direct'
  let userId: string | null = null

  if (!isInternal) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })
    userId = user.id
  }

  if (userId) {
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    if (profile?.role !== 'admin') {
      return Response.json({ error: 'forbidden' }, { status: 403 })
    }
  }

  try {
    const result = await runImportPipeline(id)
    return Response.json({ success: true, fiches_count: result.fiches_count })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return Response.json({ error: message }, { status: 500 })
  }
}
