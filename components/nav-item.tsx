'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItemProps = {
  href: string
  label: string
  icon: ReactNode
  badge?: string
}

export default function NavItem({ href, label, icon, badge }: NavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      data-active={isActive}
      className="cb-nav-link flex items-center gap-[11px] px-[11px] py-[9px] rounded-md text-sm no-underline relative"
      style={{
        color: isActive ? 'var(--sidebar-active-text)' : 'var(--sidebar-muted)',
        background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
        fontWeight: isActive ? 600 : 500,
      }}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span
          className="absolute rounded-r-sm"
          style={{
            left: -11,
            top: 6,
            bottom: 6,
            width: 3,
            background: 'var(--sidebar-active-bar)',
          }}
        />
      )}

      {icon}
      <span className="flex-1 truncate">{label}</span>

      {badge && (
        <span
          className="mono text-[11px] font-semibold"
          style={{
            color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--sidebar-muted)',
            minWidth: 16,
            textAlign: 'right',
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  )
}
