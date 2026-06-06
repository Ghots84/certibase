'use client'

import { usePathname } from 'next/navigation'
import { IconChevron, IconBell } from './icons'

const ROUTE_LABELS: Record<string, string> = {
  '/':          "Vue d'ensemble",
  '/fiches':    'Fiches',
  '/imports':   'Imports & validation',
  '/assistant': 'Assistant interne',
}

export default function Topbar() {
  const pathname = usePathname()
  const label = ROUTE_LABELS[pathname] ?? 'CertiBase'

  return (
    <header
      className="flex items-center justify-between px-6 flex-shrink-0"
      style={{
        height: 60,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Fil d'ariane */}
      <div className="flex items-center gap-2 text-[13.5px]">
        <span className="font-medium" style={{ color: 'var(--text-faint)' }}>CertiBase</span>
        <IconChevron size={14} style={{ color: 'var(--text-faint)' }} />
        <span className="font-semibold" style={{ color: 'var(--text)' }}>{label}</span>
      </div>

      {/* Cloche */}
      <button
        className="flex items-center justify-center rounded-md relative transition-colors"
        style={{
          width: 38,
          height: 38,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--text-muted)',
          cursor: 'pointer',
        }}
        aria-label="Notifications"
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement
          el.style.background = 'var(--surface-2)'
          el.style.color = 'var(--text)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement
          el.style.background = 'var(--surface)'
          el.style.color = 'var(--text-muted)'
        }}
      >
        <IconBell size={18} />
        <span
          className="absolute rounded-full"
          style={{
            top: 9,
            right: 10,
            width: 7,
            height: 7,
            background: 'var(--primary)',
            border: '2px solid var(--surface)',
          }}
        />
      </button>
    </header>
  )
}
