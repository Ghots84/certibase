import type { FicheType, FicheStatus } from '@/lib/supabase/types'

// DESIGN.md → components.type-badge
export const FICHE_TYPE_META: Record<FicheType, { label: string; bg: string; color: string }> = {
  objection:       { label: 'Objection',      bg: 'var(--danger-soft)',  color: 'var(--danger)'     },
  guide_situation: { label: 'Guide situation', bg: 'var(--warning-soft)', color: 'var(--warning)'    },
  cas_client:      { label: 'Cas client',      bg: 'var(--success-soft)', color: 'var(--success)'    },
  concurrent:      { label: 'Concurrent',      bg: 'var(--accent-soft)',  color: 'var(--accent)'     },
  doc_certiplace:  { label: 'CertiPlace',      bg: 'var(--primary-soft)', color: 'var(--primary)'    },
  veille:          { label: 'Veille',          bg: 'var(--surface-2)',    color: 'var(--text-muted)' },
  support:         { label: 'Support',         bg: 'var(--accent-soft)',  color: 'var(--accent)'     },
}

export function TypeBadge({ type }: { type: FicheType }) {
  const meta = FICHE_TYPE_META[type] ?? FICHE_TYPE_META.doc_certiplace
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 'var(--radius-pill)',
        background: meta.bg,
        color: meta.color,
        fontSize: 11,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {meta.label}
    </span>
  )
}

// DESIGN.md → components.status-badge
// "archived" corrigé en revue : le libellé passe de text-faint à text-muted (contraste AA)
const STATUS_META: Record<FicheStatus, { dot: string; color: string; label: string; background?: string }> = {
  draft:     { dot: 'var(--warning)',    color: 'var(--warning)',    label: 'À valider' },
  published: { dot: 'var(--success)',    color: 'var(--success)',    label: 'Validée' },
  archived:  { dot: 'var(--text-faint)', color: 'var(--text-muted)', label: 'Archivée', background: 'var(--surface-2)' },
}

export function StatusBadge({ status }: { status: FicheStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
        ...(meta.background && { background: meta.background, padding: '2px 8px', borderRadius: 'var(--radius-pill)' }),
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot, display: 'inline-block' }} />
      <span style={{ fontSize: 11, fontWeight: 500, color: meta.color }}>{meta.label}</span>
    </div>
  )
}
