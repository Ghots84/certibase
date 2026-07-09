import { createAdminClient } from '@/lib/supabase/admin'

type CompetitorItem = {
  concurrent: string
  abo: string
  prix: number | null
  fonctionnalites?: string[]
}

type PriceAlert = {
  concurrent: string
  abo: string
  prix_avant: number
  prix_apres: number
  delta: string
  pct: number
  direction: 'baisse' | 'hausse'
}

type FeatureAlert = {
  concurrent: string
  abo: string
  ajouts: string[]
  suppressions: string[]
}

type IngestPayload = {
  tous_les_items: CompetitorItem[]
  alertes?: PriceAlert[]
  alertes_fonctions?: FeatureAlert[]
  premiere_execution?: boolean
}

function todayFr(): string {
  return new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function snapshotTitle(concurrent: string, abo: string): string {
  return `${concurrent} — ${abo}`
}

function snapshotContent(item: CompetitorItem): string {
  const fonctionnalites = item.fonctionnalites ?? []
  const prixLine = item.prix != null ? `${item.prix} €` : 'Sur devis / non affiché'
  const fonctionsLines = fonctionnalites.length > 0
    ? fonctionnalites.map(f => `- ${f}`).join('\n')
    : '- Non communiquées'

  return `## Prix\n${prixLine}\n\n## Fonctionnalités incluses\n${fonctionsLines}\n\n_Dernière mise à jour automatique : ${todayFr()}_`
}

function priceAlertTitle(alerte: PriceAlert): string {
  const signedPct = alerte.pct > 0 ? `+${alerte.pct}` : `${alerte.pct}`
  return `Alerte prix — ${alerte.concurrent} — ${alerte.abo} (${alerte.direction} ${signedPct}%)`
}

function priceAlertContent(alerte: PriceAlert): string {
  return `**${alerte.concurrent} — ${alerte.abo}**\n\nPrix avant : ${alerte.prix_avant} €\nPrix après : ${alerte.prix_apres} €\nVariation : ${alerte.delta} € (${alerte.direction})\n\n_Détecté automatiquement le ${todayFr()}_`
}

function featureAlertTitle(alerte: FeatureAlert): string {
  return `Alerte fonctionnalités — ${alerte.concurrent} — ${alerte.abo}`
}

function featureAlertContent(alerte: FeatureAlert): string {
  const ajouts = alerte.ajouts.length > 0 ? alerte.ajouts.map(f => `- ${f}`).join('\n') : '- Aucun'
  const suppressions = alerte.suppressions.length > 0 ? alerte.suppressions.map(f => `- ${f}`).join('\n') : '- Aucune'

  return `**${alerte.concurrent} — ${alerte.abo}**\n\n## Ajouts\n${ajouts}\n\n## Suppressions\n${suppressions}\n\n_Détecté automatiquement le ${todayFr()}_`
}

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.N8N_INGEST_API_KEY) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as IngestPayload | null
  if (!body || !Array.isArray(body.tous_les_items) || body.tous_les_items.length === 0) {
    return Response.json({ error: 'tous_les_items requis (tableau non vide)' }, { status: 400 })
  }

  const admin = createAdminClient()

  let snapshotsUpserted = 0
  for (const item of body.tous_les_items) {
    if (!item.concurrent || !item.abo) continue

    const title = snapshotTitle(item.concurrent, item.abo)
    const content = snapshotContent(item)

    const { data: existing } = await admin
      .from('fiches')
      .select('id')
      .eq('source', 'n8n')
      .eq('type', 'concurrent')
      .eq('title', title)
      .maybeSingle()

    if (existing) {
      await admin.from('fiches').update({ content, status: 'published' }).eq('id', existing.id)
    } else {
      await admin.from('fiches').insert({
        type: 'concurrent',
        source: 'n8n',
        title,
        content,
        status: 'published',
        profil_cible: 'csm_sales',
        confidence_threshold: 0.8,
      })
    }
    snapshotsUpserted++
  }

  const alertRows: object[] = []
  for (const alerte of body.alertes ?? []) {
    alertRows.push({
      type: 'veille',
      source: 'n8n',
      title: priceAlertTitle(alerte),
      content: priceAlertContent(alerte),
      status: 'published',
      profil_cible: 'csm_sales',
      confidence_threshold: 0.8,
    })
  }
  for (const alerte of body.alertes_fonctions ?? []) {
    alertRows.push({
      type: 'veille',
      source: 'n8n',
      title: featureAlertTitle(alerte),
      content: featureAlertContent(alerte),
      status: 'published',
      profil_cible: 'csm_sales',
      confidence_threshold: 0.8,
    })
  }

  if (alertRows.length > 0) {
    const { error } = await admin.from('fiches').insert(alertRows)
    if (error) return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true, snapshots_upserted: snapshotsUpserted, alerts_created: alertRows.length })
}
