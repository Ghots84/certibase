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
      className="flex items-center gap-[11px] px-[11px] py-[9px] rounded-md text-sm font-medium no-underline transition-colors relative"
      style={{
        color: isActive ? 'var(--sidebar-active-text)' : 'var(--sidebar-muted)',
        background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
        fontWeight: isActive ? 600 : 500,
      }}
    >
      {isActive && (
        <span
          className="absolute rounded-r-sm"
          style={{
            left: -14,
            top: 8,
            bottom: 8,
            width: 3,
            background: 'var(--sidebar-active-bar)',
          }}
        />
      )}
      {icon}
      <span className="flex-1">{label}</span>
      {badge && (
        <span
          className="text-[11px] font-bold text-center"
          style={{
            background: 'var(--sidebar-active-bar)',
            color: '#fff',
            padding: '1px 7px',
            borderRadius: 'var(--radius-pill)',
            minWidth: 20,
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  )
}
