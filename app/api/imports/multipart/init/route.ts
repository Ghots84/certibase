import { CreateMultipartUploadCommand } from '@aws-sdk/client-s3'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { s3, S3_BUCKET } from '@/lib/s3'

const ALLOWED: Record<string, 'audio' | 'video' | 'pdf'> = {
  mp3: 'audio', m4a: 'audio', wav: 'audio',
  mp4: 'video', mov: 'video',
  pdf: 'pdf', pptx: 'pdf',
}

const VALID_IMPORT_TYPES = new Set(['webinar', 'presentation', 'sales_call', 'internal_doc', 'other'])

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  let body: { filename?: string; import_type?: string }
  try { body = await request.json() } catch {
    return Response.json({ error: 'Payload invalide' }, { status: 400 })
  }

  const { filename, import_type: rawImportType } = body
  if (!filename) return Response.json({ error: 'filename requis' }, { status: 400 })

  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const fileType = ALLOWED[ext]
  if (!fileType) return Response.json({
    error: `Format non supporté : .${ext}`,
  }, { status: 400 })

  const importType = rawImportType && VALID_IMPORT_TYPES.has(rawImportType) ? rawImportType : 'other'

  const safeName = filename
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
  const storagePath = `${user.id}/${Date.now()}_${safeName}`

  const mimeMap: Record<string, string> = {
    mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav',
    mp4: 'video/mp4', mov: 'video/quicktime',
    pdf: 'application/pdf', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  }

  let UploadId: string | undefined
  try {
    const res = await s3.send(new CreateMultipartUploadCommand({
      Bucket: S3_BUCKET,
      Key: storagePath,
      ContentType: mimeMap[ext] ?? 'application/octet-stream',
    }))
    UploadId = res.UploadId
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur S3'
    console.error('[multipart/init] S3 error:', msg)
    return Response.json({ error: `Erreur S3 : ${msg}` }, { status: 500 })
  }

  if (!UploadId) return Response.json({ error: 'UploadId manquant dans la réponse S3' }, { status: 500 })

  const admin = createAdminClient()
  const { data: record, error: dbError } = await admin
    .from('imports')
    .insert({
      uploaded_by: user.id,
      file_type: fileType,
      import_type: importType,
      file_path: storagePath,
      file_url: null,
      original_name: filename,
      title: null,
      profil_cible: 'all',
      status: 'pending',
      fiches_count: 0,
    })
    .select()
    .single()

  if (dbError) return Response.json({ error: dbError.message }, { status: 500 })

  return Response.json({ importId: record.id, uploadId: UploadId, path: storagePath })
}
