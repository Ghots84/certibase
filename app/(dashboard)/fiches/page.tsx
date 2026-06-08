'use client'

import { useState, useEffect } from 'react'
import type { Fiche, FicheType } from '@/lib/supabase/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = ['Toutes', 'Produit', 'Sales', 'Réglementaire', 'Veille'] as const
type Category = typeof CATEGORIES[number]

const TYPE_TO_CATEGORY: Record<string, Category> = {
  objection:       'Sales',
  concurrent:      'Sales',
  cas_client:      'Sales',
  guide_situation: 'Réglementaire',
  doc_certiplace:  'Produit',
  veille:          'Veille',
}

const TYPE_META: Record<string, { label: string; bg: string; color: string }> = {
  objection:       { label: 'Objection',      bg: 'var(--danger-soft)',  color: 'var(--danger)'    },
  guide_situation: { label: 'Guide situation', bg: 'var(--warning-soft)', color: 'var(--warning)'   },
  cas_client:      { label: 'Cas client',      bg: 'var(--success-soft)', color: 'var(--success)'   },
  concurrent:      { label: 'Concurrent',      bg: 'var(--accent-soft)',  color: 'var(--accent)'    },
  doc_certiplace:  { label: 'Produit',         bg: 'var(--primary-soft)', color: 'var(--primary)'   },
  veille:          { label: 'Veille',          bg: 'var(--surface-2)',    color: 'var(--text-muted)' },
}

const SOURCE_LABEL: Record<string, string> = {
  manual:       'Création manuelle',
  webinar:      'Webinar',
  presentation: 'Présentation',
  sales_call:   'Appel commercial',
  doc:          'Document',
  n8n:          'Veille auto',
}

const SOURCE_ICON: Record<string, string> = {
  manual:       '✏️',
  webinar:      '🎥',
  presentation: '📊',
  sales_call:   '📞',
  doc:          '📄',
  n8n:          '🤖',
}

const PROFIL_LABEL: Record<string, string> = {
  all:       'Tous les profils',
  csm:       'CSM',
  sales:     'Sales',
  new:       'Nouveau',
  csm_sales: 'CSM + Sales',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseContent(content: string): { summary: string; bullets: string[] } {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
  const bullets = lines
    .filter(l => l.startsWith('- ') || l.startsWith('• '))
    .map(l => l.replace(/^[-•]\s+/, ''))
  const textLines = lines.filter(l => !l.startsWith('- ') && !l.startsWith('• '))
  return {
    summary: textLines.join(' ').slice(0, 400),
    bullets,
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 85 ? 'var(--success)' : pct >= 70 ? 'var(--warning)' : 'var(--danger)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{ width: 46, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
      <span className="mono" style={{ fontSize: 11, color, fontWeight: 600, minWidth: 28 }}>{pct}%</span>
    </div>
  )
}

function FicheCard({
  fiche,
  active,
  onClick,
}: {
  fiche: Fiche
  active: boolean
  onClick: () => void
}) {
  const typeMeta = TYPE_META[fiche.type ?? 'doc_certiplace'] ?? TYPE_META.doc_certiplace
  const isPublished = fiche.status === 'published'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      style={{
        background: 'var(--surface)',
        border: active
          ? '1.5px solid var(--primary)'
          : '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '14px 15px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        boxShadow: active ? '0 0 0 1px var(--primary)' : 'none',
        transform: 'translateY(0)',
        transition: 'all 0.12s ease',
      }}
      onMouseEnter={e => {
        if (!active) {
          const el = e.currentTarget as HTMLDivElement
          el.style.transform = 'translateY(-1px)'
          el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.10)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          const el = e.currentTarget as HTMLDivElement
          el.style.transform = 'translateY(0)'
          el.style.boxShadow = 'none'
        }
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)', flexShrink: 0 }}>
          #{fiche.id.slice(0, 8)}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: isPublished ? 'var(--success)' : 'var(--warning)',
            display: 'inline-block',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: isPublished ? 'var(--success)' : 'var(--warning)',
          }}>
            {isPublished ? 'Validée' : 'À valider'}
          </span>
        </div>
        <span style={{
          marginLeft: 'auto', padding: '1px 7px', borderRadius: 'var(--radius-pill)',
          background: typeMeta.bg, color: typeMeta.color, fontSize: 11, fontWeight: 600,
          flexShrink: 0,
        }}>
          {typeMeta.label}
        </span>
      </div>

      {/* Titre */}
      <p className="font-semibold" style={{ color: 'var(--text)', fontSize: 14, margin: 0, lineHeight: 1.4 }}>
        {fiche.title}
      </p>

      {/* Résumé */}
      <p style={{
        color: 'var(--text-muted)', fontSize: 12.5, margin: 0, lineHeight: 1.5,
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {fiche.content}
      </p>

      {/* Barre de confiance */}
      <ConfidenceBar value={fiche.confidence_threshold} />
    </div>
  )
}

function BlindspotPlaceholder() {
  return (
    <div style={{
      borderLeft: '3px solid var(--primary)',
      borderRadius: 'var(--radius)',
      padding: '14px 18px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderLeftWidth: 3,
      borderLeftColor: 'var(--primary)',
      marginTop: 32,
    }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
        ✦ Angles morts — disponible en Story 3.4
      </p>
    </div>
  )
}

function FicheDrawer({
  fiche,
  isAdmin,
  onClose,
}: {
  fiche: Fiche
  isAdmin: boolean
  onClose: () => void
}) {
  const typeMeta = TYPE_META[fiche.type ?? 'doc_certiplace'] ?? TYPE_META.doc_certiplace
  const isPublished = fiche.status === 'published'
  const pct = Math.round(fiche.confidence_threshold * 100)
  const confColor = pct >= 85 ? 'var(--success)' : pct >= 70 ? 'var(--warning)' : 'var(--danger)'
  const { summary, bullets } = parseContent(fiche.content)
  const srcLabel = SOURCE_LABEL[fiche.source ?? ''] ?? fiche.source ?? '—'
  const srcIcon = SOURCE_ICON[fiche.source ?? ''] ?? '📄'
  const profilLabel = PROFIL_LABEL[fiche.profil_cible ?? ''] ?? fiche.profil_cible ?? 'Tous les profils'

  function toast(msg: string) {
    if (typeof window !== 'undefined' && typeof (window as Window & { cbToast?: (m: string) => void }).cbToast === 'function') {
      (window as Window & { cbToast?: (m: string) => void }).cbToast!(msg)
    }
  }

  return (
    <div style={{
      width: 392,
      flexShrink: 0,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      maxHeight: 'calc(100vh - 130px)',
      position: 'sticky',
      top: 16,
      animation: 'cbslide 0.28s ease',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>
            #{fiche.id.slice(0, 8)}
          </span>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-faint)', fontSize: 18, lineHeight: 1,
              padding: '2px 4px', borderRadius: 'var(--radius-sm)',
            }}
          >
            ✕
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 19, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
          {fiche.title}
        </p>
      </div>

      {/* Badges */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}>
        {/* Statut */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: isPublished ? 'var(--success)' : 'var(--warning)',
            display: 'inline-block',
          }} />
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: isPublished ? 'var(--success)' : 'var(--warning)',
          }}>
            {isPublished ? 'Validée' : 'À valider'}
          </span>
        </div>

        {/* Type */}
        <span style={{
          padding: '2px 8px', borderRadius: 'var(--radius-pill)',
          background: typeMeta.bg, color: typeMeta.color,
          fontSize: 11.5, fontWeight: 600,
        }}>
          {typeMeta.label}
        </span>

        {/* Confiance */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <div style={{ width: 52, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: confColor, borderRadius: 2 }} />
          </div>
          <span className="mono" style={{ fontSize: 11.5, color: confColor, fontWeight: 700 }}>{pct}%</span>
        </div>
      </div>

      {/* Corps scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Contenu / Résumé */}
        <div>
          <p style={{ color: 'var(--text)', fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
            {summary || fiche.content}
          </p>
        </div>

        {/* Points clés */}
        {bullets.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
              Points clés
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {bullets.map((b, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                  <span style={{ color: 'var(--success)', fontSize: 12, flexShrink: 0, marginTop: 2 }}>✓</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Source */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
            Source
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>{srcIcon}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {srcLabel}
              {fiche.created_at && (
                <span style={{ color: 'var(--text-faint)', marginLeft: 6 }}>
                  · {new Date(fiche.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Profil cible */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
            Profil cible
          </p>
          <span style={{
            display: 'inline-block', padding: '3px 10px',
            background: 'var(--surface-2)', borderRadius: 'var(--radius-pill)',
            color: 'var(--text-muted)', fontSize: 12.5,
          }}>
            {profilLabel}
          </span>
        </div>

        {/* Exposée aux agents */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
            Exposée aux agents
          </p>
          {isPublished ? (
            <div style={{ display: 'flex', gap: 6 }}>
              {['CSM Digital', 'Sales Digital'].map(agent => (
                <span key={agent} style={{
                  padding: '3px 10px', borderRadius: 'var(--radius-pill)',
                  background: 'var(--primary-soft)', color: 'var(--primary)',
                  fontSize: 12, fontWeight: 600,
                }}>
                  {agent}
                </span>
              ))}
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 10px', borderRadius: 'var(--radius)',
              background: 'var(--warning-soft)',
            }}>
              <span style={{ fontSize: 14 }}>⚠</span>
              <span style={{ color: 'var(--warning)', fontSize: 12.5, fontWeight: 500 }}>
                Non exposée — fiche non validée
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        gap: 8,
      }}>
        <button
          onClick={() => toast('Duplication — disponible en Story 3.3')}
          style={{
            flex: 1, padding: '8px 0',
            borderRadius: 'var(--radius)', border: '1px solid var(--border)',
            background: 'var(--surface-2)', color: 'var(--text-muted)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          Dupliquer
        </button>
        {isAdmin && fiche.status === 'draft' && (
          <button
            onClick={() => toast('Validation — disponible en Story 3.3')}
            style={{
              flex: 1, padding: '8px 0',
              borderRadius: 'var(--radius)', border: 'none',
              background: 'var(--primary)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Valider
          </button>
        )}
        {isAdmin && fiche.status === 'published' && (
          <button
            onClick={() => toast('Édition — disponible en Story 3.3')}
            style={{
              flex: 1, padding: '8px 0',
              borderRadius: 'var(--radius)', border: 'none',
              background: 'var(--primary)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Modifier
          </button>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FichesPage() {
  const [fiches, setFiches] = useState<Fiche[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category>('Toutes')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/fiches')
      if (res.ok) {
        const data: Fiche[] = await res.json()
        setFiches(data)
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    async function checkAdmin() {
      const r = await fetch('/api/me')
      if (r.ok) {
        const d = await r.json()
        if (d?.role === 'admin') setIsAdmin(true)
      }
    }
    checkAdmin()
  }, [])

  const filtered = fiches
    .filter(f => category === 'Toutes' || TYPE_TO_CATEGORY[f.type as FicheType ?? ''] === category)
    .filter(f => !query || (f.title + ' ' + f.content).toLowerCase().includes(query.toLowerCase()))

  const activeFiche = fiches.find(f => f.id === activeId) ?? null

  return (
    <div className="p-7 cb-fade-in">
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)', letterSpacing: 'var(--head-spacing)' }}>
            Fiches de connaissance
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {loading ? 'Chargement...' : `${fiches.length} fiche${fiches.length !== 1 ? 's' : ''} publiée${fiches.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {isAdmin && (
          <button
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-pill)',
              background: 'var(--primary)', color: '#fff', border: 'none',
              fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            Nouvelle fiche
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 340 }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-faint)', fontSize: 14, pointerEvents: 'none',
          }}>🔍</span>
          <input
            type="search"
            placeholder="Rechercher..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%', padding: '7px 12px 7px 32px',
              borderRadius: 'var(--radius)', border: '1px solid var(--border)',
              background: 'var(--bg)', color: 'var(--text)', fontSize: 13.5,
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 2, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 3 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: '5px 11px', borderRadius: 'calc(var(--radius) - 2px)',
                border: 'none',
                background: category === cat ? 'var(--primary)' : 'transparent',
                color: category === cat ? '#fff' : 'var(--text-muted)',
                fontSize: 12.5, fontWeight: category === cat ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.12s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu principal — flex row si drawer ouvert */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Zone grille + blindspot */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-faint)', fontSize: 14 }}>
              Chargement des fiches...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 0', color: 'var(--text-faint)', fontSize: 14,
              background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
            }}>
              {fiches.length === 0 ? 'Aucune fiche publiée pour le moment' : 'Aucune fiche ne correspond à votre recherche'}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, minmax(${activeId ? '240px' : '270px'}, 1fr))`,
              gap: 14,
              transition: 'grid-template-columns 0.2s ease',
            }}>
              {filtered.map(fiche => (
                <FicheCard
                  key={fiche.id}
                  fiche={fiche}
                  active={activeId === fiche.id}
                  onClick={() => setActiveId(prev => prev === fiche.id ? null : fiche.id)}
                />
              ))}
            </div>
          )}

          {!loading && <BlindspotPlaceholder />}
        </div>

        {/* Drawer latéral */}
        {activeFiche && (
          <FicheDrawer
            fiche={activeFiche}
            isAdmin={isAdmin}
            onClose={() => setActiveId(null)}
          />
        )}
      </div>
    </div>
  )
}
