'use client'

import { useState, useEffect, useCallback } from 'react'
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

function fireToast(msg: string) {
  if (typeof window !== 'undefined' && typeof (window as Window & { cbToast?: (m: string) => void }).cbToast === 'function') {
    ;(window as Window & { cbToast?: (m: string) => void }).cbToast!(msg)
  }
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  if (parts.length === 1) return text
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
          return <strong key={i} style={{ fontWeight: 700, color: 'var(--text)' }}>{part.slice(2, -2)}</strong>
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
          return <em key={i} style={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</em>
        return part
      })}
    </>
  )
}

function MarkdownContent({ content }: { content: string }) {
  const blocks: React.ReactNode[] = []
  let bulletBuf: string[] = []
  let k = 0

  function flushBullets() {
    if (!bulletBuf.length) return
    blocks.push(
      <ul key={k++} style={{ margin: '2px 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {bulletBuf.map((b, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
              background: 'var(--primary)', marginTop: 7,
              display: 'inline-block',
            }} />
            <span style={{ color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.55 }}>{renderInline(b)}</span>
          </li>
        ))}
      </ul>
    )
    bulletBuf = []
  }

  for (const raw of content.split('\n')) {
    const line = raw.trim()

    if (line.startsWith('- ') || line.startsWith('• ')) {
      bulletBuf.push(line.replace(/^[-•]\s+/, ''))
    } else if (/^#{1,3} /.test(line)) {
      flushBullets()
      const level = (line.match(/^(#{1,3}) /)?.[1].length ?? 1) as 1 | 2 | 3
      const text = line.replace(/^#{1,3} /, '')
      const sz: Record<1 | 2 | 3, number> = { 1: 16, 2: 14, 3: 12 }
      blocks.push(
        <p key={k++} style={{
          fontSize: sz[level], fontWeight: 700,
          color: level === 3 ? 'var(--text-faint)' : 'var(--text)',
          margin: blocks.length > 0 ? '10px 0 2px' : '0 0 2px', lineHeight: 1.3,
          textTransform: level === 3 ? 'uppercase' : 'none',
          letterSpacing: level === 3 ? '0.06em' : 'normal',
        }}>
          {renderInline(text)}
        </p>
      )
    } else if (line === '') {
      flushBullets()
    } else {
      flushBullets()
      blocks.push(
        <p key={k++} style={{ color: 'var(--text)', fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>
          {renderInline(line)}
        </p>
      )
    }
  }
  flushBullets()

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{blocks}</div>
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
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
      style={{
        background: 'var(--surface)',
        border: active ? '1.5px solid var(--primary)' : '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '12px 14px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
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
      {/* Ligne 1 : type chip + statut */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{
          padding: '2px 8px', borderRadius: 'var(--radius-pill)',
          background: typeMeta.bg, color: typeMeta.color,
          fontSize: 11, fontWeight: 600, flexShrink: 0,
        }}>
          {typeMeta.label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isPublished ? 'var(--success)' : 'var(--warning)',
            display: 'inline-block',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 500,
            color: isPublished ? 'var(--success)' : 'var(--warning)',
          }}>
            {isPublished ? 'Validée' : 'À valider'}
          </span>
        </div>
      </div>

      {/* Ligne 2 : titre (2 lignes max) */}
      <p style={{
        color: 'var(--text)', fontSize: 13.5, fontWeight: 600,
        margin: 0, lineHeight: 1.4,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {fiche.title}
      </p>

      {/* Ligne 3 : hint contenu — 1 ligne, très subtil */}
      <p style={{
        color: 'var(--text-faint)', fontSize: 12, margin: 0, lineHeight: 1.4,
        display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {fiche.content.replace(/\n/g, ' ')}
      </p>

      {/* Ligne 4 : ID micro + confiance */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        <span className="mono" style={{ fontSize: 10, color: 'var(--text-faint)' }}>
          #{fiche.id.slice(0, 8)}
        </span>
        <ConfidenceBar value={fiche.confidence_threshold} />
      </div>
    </div>
  )
}

function BlindspotPlaceholder() {
  return (
    <div style={{
      borderRadius: 'var(--radius)',
      padding: '14px 18px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderLeft: '3px solid var(--primary)',
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
  const srcLabel = SOURCE_LABEL[fiche.source ?? ''] ?? fiche.source ?? '—'
  const srcIcon = SOURCE_ICON[fiche.source ?? ''] ?? '📄'
  const profilLabel = PROFIL_LABEL[fiche.profil_cible ?? ''] ?? fiche.profil_cible ?? 'Tous les profils'

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

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

        {/* Contenu */}
        <MarkdownContent content={fiche.content} />

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
          onClick={() => fireToast('Duplication — disponible en Story 3.3')}
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
            onClick={() => fireToast('Validation — disponible en Story 3.3')}
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
            onClick={() => fireToast('Édition — disponible en Story 3.3')}
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
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category>('Toutes')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Single effect — fetch /api/me first to know the role, then load fiches accordingly
  useEffect(() => {
    async function loadAll() {
      // 1. Resolve current user role
      let admin = false
      const meRes = await fetch('/api/me')
      if (meRes.ok) {
        const me = await meRes.json()
        if (me?.role === 'admin') {
          admin = true
          setIsAdmin(true)
        }
      }

      // 2. Load fiches — admins also receive drafts
      const url = admin ? '/api/fiches?include_drafts=1' : '/api/fiches'
      const res = await fetch(url)
      if (res.ok) {
        const data: Fiche[] = await res.json()
        setFiches(data)
      } else {
        setError('Impossible de charger les fiches. Veuillez réessayer.')
      }
      setLoading(false)
    }
    loadAll()
  }, [])

  const filtered = fiches
    .filter(f => category === 'Toutes' || TYPE_TO_CATEGORY[(f.type ?? '') as FicheType] === category)
    .filter(f => !query || (f.title + ' ' + f.content).toLowerCase().includes(query.toLowerCase()))

  const activeFiche = fiches.find(f => f.id === activeId) ?? null

  // Build the subtitle line
  const subtitle = (() => {
    if (loading) return 'Chargement...'
    const published = fiches.filter(f => f.status === 'published').length
    const drafts = fiches.filter(f => f.status === 'draft').length
    const hasFilter = category !== 'Toutes' || query.trim() !== ''
    const filteredCount = filtered.length
    if (hasFilter) {
      const plural = filteredCount !== 1
      return `${filteredCount} fiche${plural ? 's' : ''} — ${published} publiée${published !== 1 ? 's' : ''}${drafts > 0 ? `, ${drafts} à valider` : ''}`
    }
    if (isAdmin && drafts > 0) {
      return `${published} publiée${published !== 1 ? 's' : ''} · ${drafts} à valider`
    }
    return `${published} fiche${published !== 1 ? 's' : ''} publiée${published !== 1 ? 's' : ''}`
  })()

  const handleToggleFiche = useCallback((id: string) => {
    setActiveId(prev => prev === id ? null : id)
  }, [])

  return (
    <div className="p-7 cb-fade-in">
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)', letterSpacing: 'var(--head-spacing)' }}>
            Fiches de connaissance
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => fireToast('Création de fiche — disponible en Story 3.3')}
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
          ) : error ? (
            <div style={{
              textAlign: 'center', padding: '60px 0', color: 'var(--danger)', fontSize: 14,
              background: 'var(--danger-soft)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--danger)',
            }}>
              {error}
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
                  onClick={() => handleToggleFiche(fiche.id)}
                />
              ))}
            </div>
          )}

          {!loading && !error && <BlindspotPlaceholder />}
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
