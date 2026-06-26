import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runImportPipeline } from '@/lib/import-pipeline'

const ALLOWED: Record<string, 'audio' | 'video' | 'pdf'> = {
  mp3: 'audio',
  m4a: 'audio',
  wav: 'audio',
  mp4: 'video',
  mov: 'video',
  pdf: 'pdf',
}

const VALID_IMPORT_TYPES = new Set([
  'webinar', 'presentation', 'sales_call', 'internal_doc', 'other',
])

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Payload invalide' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    return Response.json({ error: 'Aucun fichier fourni' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const fileType = ALLOWED[ext]
  if (!fileType) {
    return Response.json({
      error: `Format non supporté : .${ext}. Formats acceptés : mp3, m4a, wav, mp4, mov, pdf. Pour un PowerPoint (.pptx), exportez-le en PDF d'abord.`,
    }, { status: 400 })
  }

  const rawImportType = formData.get('import_type') as string | null
  const importType = rawImportType && VALID_IMPORT_TYPES.has(rawImportType)
    ? rawImportType
    : 'other'

  const safeName = file.name
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // supprimer accents
    .replace(/[^a-zA-Z0-9._-]/g, '_')                // remplacer espaces/special chars
    .replace(/_+/g, '_')                              // éviter les doubles underscores
  const storagePath = `${user.id}/${Date.now()}_${safeName}`
  const bytes = await file.arrayBuffer()

  const { error: storageError } = await admin.storage
    .from('certibase-imports')
    .upload(storagePath, bytes, { contentType: file.type, upsert: false })

  if (storageError) {
    return Response.json({ error: `Erreur storage : ${storageError.message}` }, { status: 500 })
  }

  const { data: record, error: dbError } = await admin
    .from('imports')
    .insert({
      uploaded_by: user.id,
      file_type: fileType,
      import_type: importType,
      file_path: storagePath,
      file_url: null,
      original_name: file.name,
      title: null,
      profil_cible: 'all',
      status: 'pending',
      fiches_count: 0,
    })
    .select()
    .single()

  if (dbError) {
    return Response.json({ error: dbError.message }, { status: 500 })
  }

  const importId = record.id
  after(() => runImportPipeline(importId).catch(console.error))

  return Response.json(record)
}
