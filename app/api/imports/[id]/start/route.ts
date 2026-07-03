import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runImportPipeline } from '@/lib/import-pipeline'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: imp, error } = await admin
    .from('imports')
    .select('id, uploaded_by')
    .eq('id', id)
    .single()

  if (error || !imp) return Response.json({ error: 'Import introuvable' }, { status: 404 })
  if (imp.uploaded_by !== user.id) return Response.json({ error: 'forbidden' }, { status: 403 })

  after(() => runImportPipeline(id).catch(console.error))

  return Response.json({ success: true })
}
