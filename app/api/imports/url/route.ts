import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'youtu.be',
  'zoom.us', 'us02web.zoom.us',
])

function isAllowedUrl(raw: string): boolean {
  try {
    const { hostname } = new URL(raw)
    return ALLOWED_HOSTS.has(hostname)
  } catch {
    return false
  }
}

export async function POST(request: Request) {
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

  const body = await request.json()
  const url: string = body?.url?.trim() ?? ''
  const importType: string = body?.import_type ?? 'webinar'

  if (!url) {
    return Response.json({ error: 'URL requise' }, { status: 400 })
  }

  if (!isAllowedUrl(url)) {
    return Response.json({
      error: 'URL non supportée. Domaines acceptés : YouTube, Zoom',
    }, { status: 400 })
  }

  const { data: record, error: dbError } = await admin
    .from('imports')
    .insert({
      uploaded_by: user.id,
      file_type: 'url',
      import_type: importType,
      file_path: null,
      file_url: url,
      original_name: null,
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

  // Trigger pipeline asynchronously
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  fetch(`${baseUrl}/api/imports/${record.id}/process`, {
    method: 'POST',
    headers: { 'x-internal-pipeline': process.env.PIPELINE_SECRET ?? '' },
  }).catch(() => {})

  return Response.json(record)
}
