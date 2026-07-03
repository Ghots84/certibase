import { UploadPartCommand } from '@aws-sdk/client-s3'
import { createClient } from '@/lib/supabase/server'
import { s3, S3_BUCKET } from '@/lib/s3'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const uploadId = searchParams.get('uploadId')
  const path = searchParams.get('path')
  const partNumber = Number(searchParams.get('partNumber'))

  if (!uploadId || !path || !partNumber) {
    return Response.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const body = await request.arrayBuffer()
  if (!body.byteLength) return Response.json({ error: 'Chunk vide' }, { status: 400 })

  const { ETag } = await s3.send(new UploadPartCommand({
    Bucket: S3_BUCKET,
    Key: path,
    UploadId: uploadId,
    PartNumber: partNumber,
    Body: new Uint8Array(body),
    ContentLength: body.byteLength,
  }))

  return Response.json({ etag: ETag })
}
