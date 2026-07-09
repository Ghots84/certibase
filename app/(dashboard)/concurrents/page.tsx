'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Fiche } from '@/lib/supabase/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseSnapshotTitle(title: string): { concurrent: string; abo: string } {
  const [concurrent, ...rest] = title.split(' — ')
  return { concurrent: concurrent ?? title, abo: rest.join(' — ') || '—' }
}

function parsePrice(content: string): number | null {
  const match = content.match(/(\d+(?:[.,]\d+)?)\s*€/)
  if (!match) return null
  return parseFloat(match[1].replace(',', '.'))
}

function parseFeatures(content: string): string[] {
  return content
    .split('\n')
    .filter(l => l.trim().startsWith('- '))
    .map(l => l.replace(/^- /, '').trim())
}

function isPriceAlert(title: string): boolean {
  return title.startsWith('Alerte prix')
}

function isRise(title: string): boolean {
  return title.includes('hausse')
}

// Le scraping n8n visite plusieurs pages du même site concurrent (ex : page
// "Certificateurs" et page "Entreprises" chez Procertif), ce qui fait apparaître
// la même offre sous des noms légèrement différents. On normalise pour regrouper.
function normalizeAbo(abo: string): string {
  return abo.replace(/^(Certificateur|Entreprises)\s+/i, '').trim()
}

function isOption(abo: string): boolean {
  return /\(option\)/i.test(abo)
}

// Compare le prix d'une offre concurrente à l'offre "Nous" la plus proche en prix —
// donne un repère instantané sans exiger une correspondance manuelle de paliers.
function nearestNousPosition(
  prix: number | null,
  nousOffers: { abo: string; prix: number | null }[],
): { nousAbo: string; deltaPct: number } | null {
  if (prix == null) return null
  const priced = nousOffers.filter((o): o is { abo: string; prix: number } => o.prix != null)
  if (priced.length === 0) return null

  let nearest = priced[0]
  for (const o of priced) {
    if (Math.abs(o.prix - prix) < Math.abs(nearest.prix - prix)) nearest = o
  }
  const deltaPct = Math.round(((prix - nearest.prix) / nearest.prix) * 100)
  return { nousAbo: nearest.abo, deltaPct }
}

// ── Data shaping ────────────────────────────────────────────────────────────

type Offer = {
  key: string
  concurrent: string
  abo: string
  prix: number | null
  features: string[]
  updatedAt: string
  mergedCount: number
}

function buildOffers(snapshots: Fiche[]): Offer[] {
  const groups = new Map<string, { concurrent: string; abo: string; prix: number | null; features: Set<string>; updatedAt: string; mergedCount: number }>()

  for (const f of snapshots) {
    const { concurrent, abo } = parseSnapshotTitle(f.title)
    const prix = parsePrice(f.content)
    const features = parseFeatures(f.content)
    const key = `${concurrent}|${normalizeAbo(abo)}|${prix ?? 'null'}`

    const existing = groups.get(key)
    if (existing) {
      features.forEach(ft => existing.features.add(ft))
      if (f.updated_at > existing.updatedAt) existing.updatedAt = f.updated_at
      existing.mergedCount++
      // Garder le nom le plus court/générique (souvent le plus lisible)
      if (abo.length < existing.abo.length) existing.abo = abo
    } else {
      groups.set(key, { concurrent, abo, prix, features: new Set(features), updatedAt: f.updated_at, mergedCount: 1 })
    }
  }

  return Array.from(groups.entries()).map(([key, g]) => ({
    key,
    concurrent: g.concurrent,
    abo: g.abo,
    prix: g.prix,
    features: Array.from(g.features),
    updatedAt: g.updatedAt,
    mergedCount: g.mergedCount,
  }))
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PositionBadge({ position }: { position: { nousAbo: string; deltaPct: number } }) {
  const aligned = Math.abs(position.deltaPct) <= 5
  const cheaper = position.deltaPct < 0 // le concurrent est moins cher que nous → menace
  const color = aligned ? 'var(--text-muted)' : cheaper ? 'var(--danger)' : 'var(--success)'
  const bg = aligned ? 'var(--surface-2)' : cheaper ? 'var(--danger-soft)' : 'var(--success-soft)'
  const label = aligned
    ? `≈ aligné vs ${position.nousAbo}`
    : `${position.deltaPct > 0 ? '+' : ''}${position.deltaPct}% vs ${position.nousAbo}`

  return (
    <span
      title={`Comparé à notre offre "${position.nousAbo}"`}
      style={{ fontSize: 10.5, fontWeight: 700, color, background: bg, padding: '2px 8px', borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap' }}
    >
      {label}
    </span>
  )
}

function OfferRow({
  offer, highlight, onOpen, position,
}: {
  offer: Offer
  highlight: boolean
  onOpen: () => void
  position?: { nousAbo: string; deltaPct: number } | null
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onOpen()}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '11px 16px',
        borderBottom: '1px solid var(--border)', cursor: 'pointer',
        background: highlight ? 'var(--primary-soft)' : 'transparent',
        transition: 'background .12s ease',
      }}
      onMouseEnter={e => { if (!highlight) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)' }}
      onMouseLeave={e => { if (!highlight) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: highlight ? 'var(--primary)' : 'var(--text)' }}>
          {offer.abo}
        </span>
        {offer.mergedCount > 1 && (
          <span
            title={`Fusionné depuis ${offer.mergedCount} pages scrapées identiques`}
            style={{ fontSize: 10, color: 'var(--text-faint)', background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 'var(--radius-pill)' }}
          >
            {offer.mergedCount} sources
          </span>
        )}
        {position && <PositionBadge position={position} />}
      </div>
      <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', width: 90, textAlign: 'right', flexShrink: 0 }}>
        {offer.prix != null ? `${offer.prix} €` : 'Sur devis'}
      </span>
      <span style={{ fontSize: 11.5, color: 'var(--text-faint)', width: 130, flexShrink: 0 }}>
        {offer.features.length} fonctionnalité{offer.features.length !== 1 ? 's' : ''}
      </span>
      <span style={{ color: 'var(--text-faint)', fontSize: 13, flexShrink: 0 }}>›</span>
    </div>
  )
}

function ConcurrentSection({
  concurrent, offers, options, activeKey, onOpen, nousOffers,
}: {
  concurrent: string
  offers: Offer[]
  options: Offer[]
  activeKey: string | null
  onOpen: (offer: Offer) => void
  nousOffers: Offer[]
}) {
  const isUs = concurrent === 'Nous'
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--radius-xl)',
      boxShadow: '0 3px 12px rgba(18,46,71,.08)', overflow: 'hidden', marginBottom: 16,
      border: isUs ? '1.5px solid var(--primary)' : 'none',
    }}>
      <div style={{
        padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: '1px solid var(--border)', background: isUs ? 'var(--primary-soft)' : 'var(--surface-2)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: isUs ? 'var(--primary)' : 'var(--text)' }}>
          {concurrent}
        </span>
        {isUs && (
          <span style={{
            fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
            background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: 'var(--radius-pill)',
          }}>
            Notre offre
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-faint)' }}>
          {offers.length} offre{offers.length !== 1 ? 's' : ''}{options.length > 0 ? ` · ${options.length} option${options.length !== 1 ? 's' : ''}` : ''}
        </span>
      </div>

      {offers.map(o => (
        <OfferRow
          key={o.key} offer={o} highlight={o.key === activeKey} onOpen={() => onOpen(o)}
          position={isUs ? null : nearestNousPosition(o.prix, nousOffers)}
        />
      ))}

      {options.length > 0 && (
        <>
          <div style={{ padding: '8px 16px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-faint)', background: 'var(--surface-2)' }}>
            Options à la carte
          </div>
          {options.map(o => (
            <OfferRow
              key={o.key} offer={o} highlight={o.key === activeKey} onOpen={() => onOpen(o)}
              position={isUs ? null : nearestNousPosition(o.prix, nousOffers)}
            />
          ))}
        </>
      )}
    </div>
  )
}

function OfferDrawer({ offer, onClose }: { offer: Offer; onClose: () => void }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div style={{
      width: 360, flexShrink: 0, background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      maxHeight: 'calc(100vh - 130px)', position: 'sticky', top: 16, animation: 'cbslide 0.28s ease',
    }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {offer.concurrent}
          </span>
          <button onClick={onClose} aria-label="Fermer" style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{offer.abo}</p>
        <p className="mono" style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>
          {offer.prix != null ? `${offer.prix} €` : 'Sur devis'}
        </p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
          Fonctionnalités incluses ({offer.features.length})
        </p>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {offer.features.map(f => (
            <li key={f} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--primary)', marginTop: 7, flexShrink: 0 }} />
              {f}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-faint)' }}>
        🤖 Veille auto · mis à jour le {new Date(offer.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        {offer.mergedCount > 1 && ` · fusionné depuis ${offer.mergedCount} pages scrapées`}
      </div>
    </div>
  )
}

// ── DESIGN.md → components.alert-item ─────────────────────────────────────────

function AlertTimeline({ fiches }: { fiches: Fiche[] }) {
  const sorted = useMemo(
    () => [...fiches].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [fiches],
  )

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', boxShadow: '0 4px 18px rgba(18,46,71,.08)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px', fontSize: 13, fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>
        Alertes récentes
      </div>

      {sorted.length === 0 ? (
        <div style={{ margin: 18, padding: '24px 16px', border: '1.5px dashed #E0C9BB', borderRadius: 'var(--radius-lg)', textAlign: 'center', background: '#FFF8F4' }}>
          <div style={{ fontSize: 22, marginBottom: 6 }}>🛰️</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Aucune nouvelle alerte cette semaine.<br />Nous continuons de surveiller le marché.
          </div>
        </div>
      ) : (
        sorted.map(fiche => {
          const priceAlert = isPriceAlert(fiche.title)
          const rise = isRise(fiche.title)
          const icon = priceAlert ? (rise ? '📈' : '📉') : '🧩'

          return (
            <div
              key={fiche.id}
              style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, transition: 'background .15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#FAFBFC' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 'var(--radius-lg)', background: 'var(--primary-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
              }}>
                {icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 4px', fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
                  {fiche.title}
                </p>
                <p style={{ margin: 0, fontSize: 10.5, color: 'var(--text-faint)' }}>
                  {new Date(fiche.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ── Argumentaire IA (généré par le nœud n8n "AI Agent") ───────────────────────

function ArgumentaireCard({ fiche }: { fiche: Fiche }) {
  const [expanded, setExpanded] = useState(false)
  const lines = fiche.content.split('\n')

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--radius-xl)',
      boxShadow: '0 3px 12px rgba(18,46,71,.08)', border: '1px solid var(--primary)',
      overflow: 'hidden', marginBottom: 20,
    }}>
      <div style={{
        padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--primary-soft)', borderBottom: expanded ? '1px solid var(--border)' : 'none',
      }}>
        <span style={{ fontSize: 16 }}>🧠</span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--primary)' }}>{fiche.title}</span>
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--primary)',
            fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {expanded ? 'Réduire ▲' : 'Voir l’argumentaire complet ▼'}
        </button>
      </div>
      {expanded && (
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {lines.map((line, i) => (
            <p
              key={i}
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.6,
                color: line.trim() === '' ? 'transparent' : 'var(--text)',
                fontWeight: /^[🎯💪❓⚠️📢💡🏷️]/.test(line.trim()) ? 700 : 400,
              }}
            >
              {line.trim() === '' ? ' ' : line}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConcurrentsPage() {
  const [fiches, setFiches] = useState<Fiche[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeOffer, setActiveOffer] = useState<Offer | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/fiches')
      if (res.ok) {
        setFiches(await res.json())
      } else {
        setError('Impossible de charger les données concurrentielles. Veuillez réessayer.')
      }
      setLoading(false)
    }
    load()
  }, [])

  const snapshots = fiches.filter(f => f.type === 'concurrent')
  const alerts = fiches.filter(f => f.type === 'veille' && f.source === 'n8n')
  const argumentaire = fiches
    .filter(f => f.type === 'objection' && f.source === 'n8n')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]

  const bySection = useMemo(() => {
    const offers = buildOffers(snapshots)
    const byConcurrent = new Map<string, { offers: Offer[]; options: Offer[] }>()

    for (const o of offers) {
      if (!byConcurrent.has(o.concurrent)) byConcurrent.set(o.concurrent, { offers: [], options: [] })
      const bucket = byConcurrent.get(o.concurrent)!
      if (isOption(o.abo)) bucket.options.push(o)
      else bucket.offers.push(o)
    }

    const sortByPrice = (a: Offer, b: Offer) => (a.prix ?? Infinity) - (b.prix ?? Infinity)
    for (const bucket of byConcurrent.values()) {
      bucket.offers.sort(sortByPrice)
      bucket.options.sort(sortByPrice)
    }

    return Array.from(byConcurrent.entries()).sort(([a], [b]) => {
      if (a === 'Nous') return -1
      if (b === 'Nous') return 1
      return a.localeCompare(b)
    })
  }, [snapshots])

  const totalOffers = bySection.reduce((sum, [, s]) => sum + s.offers.length + s.options.length, 0)
  const nousOffers = bySection.find(([c]) => c === 'Nous')?.[1].offers ?? []

  return (
    <div className="p-7 cb-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)', letterSpacing: 'var(--head-spacing)' }}>
          Espace concurrent
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {loading ? 'Chargement...' : `${bySection.length} concurrent${bySection.length !== 1 ? 's' : ''} · ${totalOffers} offre${totalOffers !== 1 ? 's' : ''} · ${alerts.length} alerte${alerts.length !== 1 ? 's' : ''} détectée${alerts.length !== 1 ? 's' : ''}`}
          {' · '}veille automatisée 🤖 mise à jour 2x/semaine
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-faint)', fontSize: 14 }}>
          Chargement...
        </div>
      ) : error ? (
        <div style={{
          textAlign: 'center', padding: '60px 0', color: 'var(--danger)', fontSize: 14,
          background: 'var(--danger-soft)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--danger)',
        }}>
          {error}
        </div>
      ) : bySection.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 0', color: 'var(--text-faint)', fontSize: 13.5,
          background: 'var(--surface)', borderRadius: 'var(--radius-xl)', boxShadow: '0 3px 12px rgba(18,46,71,.08)',
        }}>
          Aucune donnée de prix concurrents pour le moment. Elles apparaîtront après la prochaine exécution du workflow n8n de veille.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {argumentaire && <ArgumentaireCard fiche={argumentaire} />}
            {bySection.map(([concurrent, s]) => (
              <ConcurrentSection
                key={concurrent}
                concurrent={concurrent}
                offers={s.offers}
                options={s.options}
                activeKey={activeOffer?.key ?? null}
                onOpen={o => setActiveOffer(o)}
                nousOffers={nousOffers}
              />
            ))}
          </div>

          {activeOffer ? (
            <OfferDrawer offer={activeOffer} onClose={() => setActiveOffer(null)} />
          ) : (
            <div style={{ width: 330, flexShrink: 0 }}>
              <AlertTimeline fiches={alerts} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
