'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Fiche, FicheType } from '@/lib/supabase/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = ['Toutes', 'Produit', 'Sales', 'Réglementaire', 'Veille', 'Support', 'À valider'] as const
type Category = typeof CATEGORIES[number]

const TYPE_TO_CATEGORY: Record<string, Category> = {
  objection:       'Sales',
  concurrent:      'Sales',
  cas_client:      'Sales',
  guide_situation: 'Réglementaire',
  doc_certiplace:  'Produit',
  veille:          'Veille',
  support:         'Support',
}

const TYPE_META: Record<string, { label: string; bg: string; color: string }> = {
  objection:       { label: 'Objection',      bg: 'var(--danger-soft)',  color: 'var(--danger)'    },
  guide_situation: { label: 'Guide situation', bg: 'var(--warning-soft)', color: 'var(--warning)'   },
  cas_client:      { label: 'Cas client',      bg: 'var(--success-soft)', color: 'var(--success)'   },
  concurrent:      { label: 'Concurrent',      bg: 'var(--accent-soft)',  color: 'var(--accent)'    },
  doc_certiplace:  { label: 'CertiPlace',      bg: 'var(--primary-soft)', color: 'var(--primary)'   },
  veille:          { label: 'Veille',          bg: 'var(--surface-2)',    color: 'var(--text-muted)' },
  support:         { label: 'Support',         bg: 'var(--accent-soft)',  color: 'var(--accent)'    },
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

const CATEGORY_META: Record<Category, { icon: string; description: string }> = {
  'Toutes':        { icon: '📚', description: 'Toutes les fiches disponibles' },
  'Sales':         { icon: '💼', description: 'Objections, concurrents, cas clients' },
  'Produit':       { icon: '🏢', description: 'Documentation et guides CertiPlace' },
  'Réglementaire': { icon: '⚖️', description: 'Guides et situations réglementaires' },
  'Veille':        { icon: '🔭', description: 'Veille marché et secteur' },
  'Support':       { icon: '🛟', description: 'Support et assistance client' },
  'À valider':     { icon: '✏️', description: 'Brouillons en attente de validation' },
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

function CategoryCard({
  cat, count, active, onClick, adminOnly = false,
}: {
  cat: Category
  count: number
  active: boolean
  onClick: () => void
  adminOnly?: boolean
}) {
  const meta = CATEGORY_META[cat]
  const accent = adminOnly ? 'var(--warning)' : 'var(--primary)'
  const accentSoft = adminOnly ? 'var(--warning-soft)' : 'var(--primary-soft)'
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
      style={{
        background: active ? accentSoft : 'var(--surface)',
        border: active ? `1.5px solid ${accent}` : adminOnly ? '1.5px dashed var(--warning)' : '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 14px 14px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 5,
        transition: 'all 0.15s ease',
        boxShadow: active ? `0 0 0 1px ${accent}` : 'none',
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 14px rgba(0,0,0,0.08)'
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
      }}
    >
      <span style={{ fontSize: 24, lineHeight: 1, marginBottom: 2 }}>{meta.icon}</span>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 13.5, color: active ? accent : adminOnly ? 'var(--warning)' : 'var(--text)' }}>
        {cat}
      </p>
      <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-faint)', lineHeight: 1.4, minHeight: 30 }}>
        {meta.description}
      </p>
      <span style={{
        marginTop: 6, fontSize: 12, fontWeight: 600,
        color: active ? accent : adminOnly ? 'var(--warning)' : 'var(--text-muted)',
      }}>
        {count} fiche{count !== 1 ? 's' : ''}
      </span>
    </div>
  )
}

function FicheDrawer({
  fiche,
  isAdmin,
  onClose,
  onRefresh,
  onOpenEdit,
}: {
  fiche: Fiche
  isAdmin: boolean
  onClose: () => void
  onRefresh: () => void
  onOpenEdit: (f: Fiche) => void
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

  async function handleValidate() {
    const res = await fetch(`/api/fiches/${fiche.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'published' }),
    })
    if (res.ok) { fireToast('Fiche validée ✓') ; onRefresh() }
  }

  async function handleArchive() {
    const res = await fetch(`/api/fiches/${fiche.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })
    if (res.ok) { fireToast('Fiche archivée') ; onRefresh() ; onClose() }
  }

  async function handleDuplicate() {
    const res = await fetch('/api/fiches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: fiche.title + ' (copie)',
        type: fiche.type ?? 'doc_certiplace',
        content: fiche.content,
        profil_cible: fiche.profil_cible ?? 'all',
      }),
    })
    if (res.ok) { fireToast('Fiche dupliquée en brouillon') ; onRefresh() }
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
          onClick={handleDuplicate}
          style={{
            flex: 1, padding: '8px 0',
            borderRadius: 'var(--radius)', border: '1px solid var(--border)',
            background: 'var(--surface-2)', color: 'var(--text-muted)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          Dupliquer
        </button>
        {isAdmin && (
          <button
            onClick={handleArchive}
            style={{
              flex: 1, padding: '8px 0',
              borderRadius: 'var(--radius)', border: '1px solid var(--border)',
              background: 'var(--surface-2)', color: 'var(--danger)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Archiver
          </button>
        )}
        {isAdmin && fiche.status === 'draft' && (
          <button
            onClick={handleValidate}
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
            onClick={() => onOpenEdit(fiche)}
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

// ── FicheFormModal ────────────────────────────────────────────────────────────

function FicheFormModal({
  mode,
  fiche,
  onSave,
  onClose,
}: {
  mode: 'create' | 'edit'
  fiche?: Fiche
  onSave: () => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(fiche?.title ?? '')
  const [type, setType] = useState<string>(fiche?.type ?? 'doc_certiplace')
  const [content, setContent] = useState(fiche?.content ?? '')
  const [profil, setProfil] = useState<string>(fiche?.profil_cible ?? 'all')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const body = { title, type, content, profil_cible: profil }
    const res = mode === 'create'
      ? await fetch('/api/fiches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch(`/api/fiches/${fiche!.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) {
      fireToast(mode === 'create' ? 'Fiche créée en brouillon' : 'Fiche modifiée')
      onSave()
      onClose()
    }
  }

  const fieldLabel: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: 'var(--text-faint)',
    textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6,
  }
  const fieldInput: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 'var(--radius)',
    border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        width: 520, maxWidth: 'calc(100vw - 32px)',
        background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)', overflow: 'hidden',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              {mode === 'create' ? 'Nouvelle fiche' : 'Modifier la fiche'}
            </h2>
            <button type="button" onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', fontSize: 18, lineHeight: 1 }}>
              ✕
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 }}>
            <label>
              <span style={fieldLabel}>Titre</span>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required style={fieldInput} />
            </label>

            <label>
              <span style={fieldLabel}>Type</span>
              <select value={type} onChange={e => setType(e.target.value)} required style={fieldInput}>
                {Object.entries(TYPE_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </label>

            <label>
              <span style={fieldLabel}>Contenu</span>
              <textarea value={content} onChange={e => setContent(e.target.value)} required rows={8}
                style={{ ...fieldInput, resize: 'vertical', fontFamily: 'inherit', fontSize: 13.5, lineHeight: 1.6 }} />
            </label>

            <label>
              <span style={fieldLabel}>Profil cible</span>
              <select value={profil} onChange={e => setProfil(e.target.value)} style={fieldInput}>
                {Object.entries(PROFIL_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Footer */}
          <div style={{
            padding: '14px 20px', borderTop: '1px solid var(--border)',
            display: 'flex', gap: 10, justifyContent: 'flex-end',
          }}>
            <button type="button" onClick={onClose}
              style={{
                padding: '8px 18px', borderRadius: 'var(--radius)',
                border: '1px solid var(--border)', background: 'var(--surface-2)',
                color: 'var(--text-muted)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>
              Annuler
            </button>
            <button type="submit" disabled={saving}
              style={{
                padding: '8px 18px', borderRadius: 'var(--radius)', border: 'none',
                background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
              }}>
              {saving ? 'Enregistrement...' : mode === 'create' ? 'Créer' : 'Enregistrer'}
            </button>
          </div>
        </form>
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
  const [category, setCategory] = useState<Category | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [formState, setFormState] = useState<{ open: boolean; mode: 'create' | 'edit'; fiche?: Fiche }>({ open: false, mode: 'create' })

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
  }, [refreshKey])

  const showGrid = category !== null || query.trim() !== ''

  const filtered = fiches
    .filter(f => {
      if (!category || category === 'Toutes') return true
      if (category === 'À valider') return f.status === 'draft'
      return f.status !== 'draft' && TYPE_TO_CATEGORY[(f.type ?? '') as FicheType] === category
    })
    .filter(f => !query || (f.title + ' ' + f.content).toLowerCase().includes(query.toLowerCase()))

  const activeFiche = fiches.find(f => f.id === activeId) ?? null

  const subtitle = (() => {
    if (loading) return 'Chargement...'
    const published = fiches.filter(f => f.status === 'published').length
    const drafts = fiches.filter(f => f.status === 'draft').length
    if (!showGrid) {
      return isAdmin && drafts > 0
        ? `${published} publiée${published !== 1 ? 's' : ''} · ${drafts} à valider`
        : `${fiches.length} fiche${fiches.length !== 1 ? 's' : ''} · ${isAdmin ? CATEGORIES.length - 1 : CATEGORIES.length - 2} catégories`
    }
    const n = filtered.length
    return `${n} fiche${n !== 1 ? 's' : ''}${drafts > 0 && isAdmin ? ` · ${drafts} à valider` : ''}`
  })()

  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(CATEGORIES.map(c => [c, 0])) as Record<Category, number>
    counts['Toutes'] = fiches.filter(f => f.status !== 'draft').length
    counts['À valider'] = fiches.filter(f => f.status === 'draft').length
    for (const f of fiches) {
      if (f.status === 'draft') continue
      const cat = TYPE_TO_CATEGORY[(f.type ?? '') as FicheType]
      if (cat) counts[cat]++
    }
    return counts
  }, [fiches])

  const handleToggleFiche = useCallback((id: string) => {
    setActiveId(prev => prev === id ? null : id)
  }, [])

  function goHome() {
    setCategory(null)
    setQuery('')
    setActiveId(null)
  }

  return (
    <div className="p-7 cb-fade-in">
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          {showGrid && (
            <button
              onClick={goHome}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 6px',
                color: 'var(--text-faint)', fontSize: 12.5, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              ← Catégories
            </button>
          )}
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)', letterSpacing: 'var(--head-spacing)', display: 'flex', alignItems: 'center', gap: 8 }}>
            {showGrid && category && category !== 'Toutes'
              ? <><span style={{ fontSize: 22 }}>{CATEGORY_META[category].icon}</span>{category}</>
              : 'Fiches de connaissance'
            }
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setFormState({ open: true, mode: 'create' })}
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

      {/* Recherche */}
      <div style={{ position: 'relative', marginBottom: showGrid ? 20 : 28, maxWidth: showGrid ? 480 : 560 }}>
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-faint)', fontSize: 15, pointerEvents: 'none',
        }}>🔍</span>
        <input
          type="search"
          placeholder={category && category !== 'Toutes' ? `Rechercher dans ${category}...` : 'Rechercher dans toutes les fiches...'}
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            if (e.target.value.trim() && category === null) setCategory('Toutes')
          }}
          style={{
            width: '100%', padding: '10px 14px 10px 40px',
            borderRadius: 'var(--radius)', border: '1px solid var(--border)',
            background: 'var(--bg)', color: 'var(--text)', fontSize: 14,
            outline: 'none',
            boxShadow: !showGrid ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
          }}
        />
      </div>

      {/* Vue HOME — grille de cards catégories pleine page */}
      {!showGrid && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
        }}>
          {CATEGORIES.filter(cat => cat !== 'À valider').map(cat => (
            <CategoryCard
              key={cat}
              cat={cat}
              count={categoryCounts[cat]}
              active={false}
              onClick={() => setCategory(cat)}
            />
          ))}
          {isAdmin && (
            <CategoryCard
              cat="À valider"
              count={categoryCounts['À valider']}
              active={false}
              onClick={() => setCategory('À valider')}
              adminOnly
            />
          )}
        </div>
      )}

      {/* Vue GRID — fiches filtrées + drawer */}
      {showGrid && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
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

          {activeFiche && (
            <FicheDrawer
              fiche={activeFiche}
              isAdmin={isAdmin}
              onClose={() => setActiveId(null)}
              onRefresh={() => setRefreshKey(k => k + 1)}
              onOpenEdit={f => setFormState({ open: true, mode: 'edit', fiche: f })}
            />
          )}
        </div>
      )}

      {formState.open && (
        <FicheFormModal
          mode={formState.mode}
          fiche={formState.fiche}
          onSave={() => setRefreshKey(k => k + 1)}
          onClose={() => setFormState(s => ({ ...s, open: false }))}
        />
      )}
    </div>
  )
}
