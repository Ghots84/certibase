import { after } from 'next/server'
import { CompleteMultipartUploadCommand } from '@aws-sdk/client-s3'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { s3, S3_BUCKET } from '@/lib/s3'
import { runImportPipeline } from '@/lib/import-pipeline'

type Part = { partNumber: number; etag: string }

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const { importId, uploadId, path, parts } = await request.json() as {
    importId: string
    uploadId: string
    path: string
    parts: Part[]
  }

  if (!importId || !uploadId || !path || !parts?.length) {
    return Response.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  // Vérifier que l'import appartient bien à l'utilisateur
  const admin = createAdminClient()
  const { data: imp } = await admin
    .from('imports').select('uploaded_by').eq('id', importId).single()
  if (!imp || imp.uploaded_by !== user.id) {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  await s3.send(new CompleteMultipartUploadCommand({
    Bucket: S3_BUCKET,
    Key: path,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.map(p => ({ PartNumber: p.partNumber, ETag: p.etag })),
    },
  }))

  after(() => runImportPipeline(importId).catch(console.error))

  return Response.json({ success: true })
}
