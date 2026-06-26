import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: imp, error: fetchErr } = await admin
    .from('imports')
    .select('id, file_path, uploaded_by')
    .eq('id', id)
    .single()

  if (fetchErr || !imp) return Response.json({ error: 'Import introuvable' }, { status: 404 })

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const isOwner = imp.uploaded_by === user.id

  if (!isAdmin && !isOwner) {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  // Supprimer le fichier storage si présent
  if (imp.file_path) {
    await admin.storage.from('certibase-imports').remove([imp.file_path])
  }

  // Supprimer les drafts associés
  await admin.from('import_fiches_draft').delete().eq('import_id', id)

  // Supprimer l'import
  const { error: deleteErr } = await admin.from('imports').delete().eq('id', id)
  if (deleteErr) return Response.json({ error: deleteErr.message }, { status: 500 })

  return Response.json({ success: true })
}
