import { createAdminClient } from '@/lib/supabase/admin'

type IngestPayload = {
  argumentaire: string
}

function todayFr(): string {
  return new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.N8N_INGEST_API_KEY) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as IngestPayload | null
  const argumentaire = body?.argumentaire?.trim()
  if (!argumentaire) {
    return Response.json({ error: 'argumentaire requis (chaîne non vide)' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Une nouvelle exécution remplace l'argumentaire précédent plutôt que de s'empiler
  // dessus — sinon 2 insertions/semaine polluent la catégorie Sales et diluent la
  // recherche RAG avec des quasi-doublons hebdomadaires.
  await admin
    .from('fiches')
    .update({ status: 'archived' })
    .eq('type', 'objection')
    .eq('source', 'n8n')
    .eq('status', 'published')

  const { data, error } = await admin
    .from('fiches')
    .insert({
      type: 'objection',
      source: 'n8n',
      title: `Argumentaire concurrentiel — semaine du ${todayFr()}`,
      content: argumentaire,
      status: 'published',
      profil_cible: 'csm_sales',
      confidence_threshold: 0.8,
    })
    .select('id')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true, id: data.id })
}
