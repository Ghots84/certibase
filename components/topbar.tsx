'use client'

import { usePathname } from 'next/navigation'
import { IconChevron, IconBell } from './icons'

const ROUTE_LABELS: [string, string][] = [
  ['/',          "Vue d'ensemble"],
  ['/fiches',    'Fiches'],
  ['/imports',   'Imports & validation'],
  ['/assistant', 'Assistant interne'],
  ['/users',     'Utilisateurs'],
]

export default function Topbar() {
  const pathname = usePathname()
  const match = ROUTE_LABELS.find(([prefix]) =>
    prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(prefix + '/')
  )
  const label = match?.[1] ?? 'CertiBase'

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
        className="cb-icon-btn relative"
        aria-label="Notifications"
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
