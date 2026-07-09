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

function isPriceAlert(title: string): boolean {
  return title.startsWith('Alerte prix')
}

function isRise(title: string): boolean {
  return title.includes('hausse')
}

const CONCURRENT_COLORS: Record<string, string> = {
  Nous: 'var(--primary)',
}

function colorFor(concurrent: string): string {
  return CONCURRENT_COLORS[concurrent] ?? 'var(--text-muted)'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PricingTable({ fiches }: { fiches: Fiche[] }) {
  const rows = useMemo(() => {
    return fiches
      .map(f => {
        const { concurrent, abo } = parseSnapshotTitle(f.title)
        return { fiche: f, concurrent, abo, prix: parsePrice(f.content) }
      })
      .sort((a, b) => {
        if (a.concurrent === 'Nous' && b.concurrent !== 'Nous') return -1
        if (b.concurrent === 'Nous' && a.concurrent !== 'Nous') return 1
        return a.concurrent.localeCompare(b.concurrent) || a.abo.localeCompare(b.abo)
      })
  }, [fiches])

  if (rows.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '48px 0', color: 'var(--text-faint)', fontSize: 13.5,
        background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
      }}>
        Aucune donnée de prix concurrents pour le moment. Elles apparaîtront après la prochaine exécution du workflow n8n de veille.
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div
        className="grid text-[11.5px] font-semibold uppercase px-5 py-3"
        style={{
          gridTemplateColumns: '1.4fr 1.6fr 0.9fr 2.5fr 1.2fr',
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--border)',
          letterSpacing: '0.05em',
          color: 'var(--text-muted)',
        }}
      >
        <span>Concurrent</span>
        <span>Offre</span>
        <span>Prix</span>
        <span>Fonctionnalités</span>
        <span>Mise à jour</span>
      </div>

      {rows.map(({ fiche, concurrent, abo, prix }, i) => {
        const isUs = concurrent === 'Nous'
        return (
          <div
            key={fiche.id}
            className="grid items-center px-5 py-3.5"
            style={{
              gridTemplateColumns: '1.4fr 1.6fr 0.9fr 2.5fr 1.2fr',
              borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
              background: isUs ? 'var(--primary-soft)' : 'var(--surface)',
            }}
          >
            <div className="flex items-center gap-2">
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: colorFor(concurrent), flexShrink: 0 }} />
              <span className="text-[13.5px] font-semibold" style={{ color: isUs ? 'var(--primary)' : 'var(--text)' }}>
                {concurrent}
              </span>
              {isUs && (
                <span style={{
                  fontSize: 10.5, fontWeight: 700, padding: '1px 7px',
                  borderRadius: 'var(--radius-pill)', background: 'var(--primary)', color: '#fff',
                }}>
                  Notre offre
                </span>
              )}
            </div>
            <span className="text-[13px]" style={{ color: 'var(--text)' }}>{abo}</span>
            <span className="mono text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
              {prix != null ? `${prix} €` : '—'}
            </span>
            <span className="text-[12.5px]" style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {fiche.content.split('\n').filter(l => l.trim().startsWith('- ')).slice(0, 3).map(l => l.replace(/^- /, '')).join(' · ') || '—'}
            </span>
            <span className="mono text-[11.5px]" style={{ color: 'var(--text-faint)' }}>
              {new Date(fiche.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function AlertTimeline({ fiches }: { fiches: Fiche[] }) {
  const sorted = useMemo(
    () => [...fiches].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [fiches],
  )

  if (sorted.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '32px 0', color: 'var(--text-faint)', fontSize: 13,
        background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
      }}>
        Aucun changement détecté récemment.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sorted.map(fiche => {
        const priceAlert = isPriceAlert(fiche.title)
        const rise = isRise(fiche.title)
        const icon = priceAlert ? (rise ? '📈' : '📉') : '🧩'
        const accent = priceAlert ? (rise ? 'var(--danger)' : 'var(--success)') : 'var(--warning)'

        return (
          <div
            key={fiche.id}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderLeft: `3px solid ${accent}`,
              borderRadius: 'var(--radius)',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1.3 }}>{icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>
                {fiche.title}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>
                {new Date(fiche.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConcurrentsPage() {
  const [fiches, setFiches] = useState<Fiche[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="p-7 cb-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)', letterSpacing: 'var(--head-spacing)' }}>
          Espace concurrent
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {loading ? 'Chargement...' : `${snapshots.length} offre${snapshots.length !== 1 ? 's' : ''} suivies · ${alerts.length} alerte${alerts.length !== 1 ? 's' : ''} détectée${alerts.length !== 1 ? 's' : ''}`}
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
      ) : (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }}>
              Comparatif tarifaire
            </h2>
            <PricingTable fiches={snapshots} />
          </div>
          <div style={{ width: 340, flexShrink: 0 }}>
            <h2 style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }}>
              Derniers changements
            </h2>
            <AlertTimeline fiches={alerts} />
          </div>
        </div>
      )}
    </div>
  )
}
