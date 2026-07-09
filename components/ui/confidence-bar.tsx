// DESIGN.md → components.confidence-bar — un seul composant, trois emplacements
// (fiche-card, fiche-drawer, import-card). Comportement : purement d'affichage.

export function ConfidenceBar({ value, width }: { value: number; width?: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 85 ? 'var(--success)' : pct >= 70 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div
        style={{
          ...(width ? { width, flexShrink: 0 } : { flex: 1 }),
          height: 4,
          background: 'var(--border)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.3s ease' }} />
      </div>
      <span className="mono" style={{ fontSize: 11, color, fontWeight: 600, minWidth: 28 }}>
        {pct}%
      </span>
    </div>
  )
}
