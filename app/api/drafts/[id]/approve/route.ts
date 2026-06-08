import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DRAFT_TO_FICHE_TYPE: Record<string, string> = {
  objection:       'objection',
  guide_situation: 'guide_situation',
  cas_client:      'cas_client',
  concurrent:      'concurrent',
  missing_info:    'doc_certiplace',
}

const IMPORT_TO_SOURCE: Record<string, string> = {
  webinar:      'webinar',
  presentation: 'presentation',
  sales_call:   'sales_call',
  internal_doc: 'doc',
  other:        'doc',
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  // Load draft
  const { data: draft, error: draftErr } = await admin
    .from('import_fiches_draft').select('*').eq('id', id).single()
  if (draftErr || !draft) return Response.json({ error: 'Draft introuvable' }, { status: 404 })
  if (draft.status !== 'pending') return Response.json({ error: 'Draft déjà traité' }, { status: 409 })

  // Load parent import for source context
  const { data: imp } = await admin
    .from('imports').select('import_type, profil_cible').eq('id', draft.import_id).single()

  // Insert fiche (published → Edge Function generates embedding)
  const { data: fiche, error: ficheErr } = await admin
    .from('fiches')
    .insert({
      author_id:            user.id,
      source_ref_id:        draft.import_id,
      type:                 DRAFT_TO_FICHE_TYPE[draft.type ?? 'objection'] ?? 'doc_certiplace',
      title:                draft.title,
      content:              draft.content,
      profil_cible:         imp?.profil_cible ?? 'all',
      source:               IMPORT_TO_SOURCE[imp?.import_type ?? 'other'] ?? 'doc',
      source_timestamp_sec: draft.source_timestamp_sec ?? null,
      source_page:          draft.source_page ?? null,
      confidence_threshold: draft.confidence ?? 0.75,
      status:               'published',
    })
    .select()
    .single()

  if (ficheErr) return Response.json({ error: ficheErr.message }, { status: 500 })

  // Mark draft approved
  await admin.from('import_fiches_draft').update({
    status:       'approved',
    validated_by: user.id,
    fiche_id:     fiche.id,
  }).eq('id', id)

  return Response.json({ fiche })
}
