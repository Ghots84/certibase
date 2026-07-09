import Link from 'next/link'
import NavItem from './nav-item'
import { IconGrid, IconCards, IconImport, IconChat, IconUsers, IconBook } from './icons'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SignOutButton from './sign-out-button'

const MAIN_NAV = [
  { href: '/',          label: "Vue d'ensemble", icon: <IconGrid size={18} /> },
  { href: '/fiches',    label: 'Fiches',          icon: <IconCards size={18} />,  badge: '8' },
  { href: '/imports',   label: 'Imports',         icon: <IconImport size={18} />, badge: '4' },
  { href: '/assistant', label: 'Assistant',       icon: <IconChat size={18} /> },
]

const ADMIN_NAV = [
  { href: '/users', label: 'Utilisateurs', icon: <IconUsers size={18} /> },
]

const AGENTS = [
  { label: 'CSM Digital',      color: 'var(--success)', active: true  },
  { label: 'Sales Digital',    color: 'var(--success)', active: true  },
  { label: 'Assistant',        color: 'var(--primary)', active: false, tag: 'V1' },
]

const ROLE_COLORS: Record<string, string> = {
  admin: '#7A5AF8',
  csm:   '#2D7DD2',
  sales: '#E8651E',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Knowledge Manager',
  csm:   'Customer Success',
  sales: 'Account Executive',
}

function getInitials(name: string | null, email: string): string {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return email.slice(0, 2).toUpperCase()
}

export default async function Sidebar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const admin = createAdminClient()
    const { data } = await admin
      .from('profiles')
      .select('full_name, role, avatar_initials, email')
      .eq('id', user.id)
      .single()
    profile = data
  }

  const email = profile?.email ?? user?.email ?? ''
  const initials = profile?.avatar_initials ?? getInitials(profile?.full_name ?? null, email)
  const role = profile?.role ?? 'csm'
  const avatarColor = ROLE_COLORS[role] ?? '#8A94A2'
  const roleLabel = ROLE_LABELS[role] ?? role
  const isAdmin = role === 'admin'

  return (
    <nav
      className="flex flex-col"
      style={{
        width: 248,
        flexShrink: 0,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        padding: '16px 12px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflow: 'hidden',
      }}
    >
      {/* ── Brand ── */}
      <div className="flex items-center gap-3 px-2 mb-5">
        <div
          className="flex items-center justify-center rounded-lg text-white font-extrabold flex-shrink-0"
          style={{ width: 36, height: 36, background: 'var(--primary)', fontSize: 14, letterSpacing: '-0.03em' }}
        >
          CB
        </div>
        <div>
          <div className="font-bold text-[15px]" style={{ color: 'var(--sidebar-text)', letterSpacing: 'var(--head-spacing)' }}>
            CertiBase
          </div>
          <div className="text-[11px]" style={{ color: 'var(--sidebar-muted)' }}>
            Console interne
          </div>
        </div>
      </div>

      {/* ── Main nav ── */}
      <div className="flex flex-col gap-0.5 mb-1">
        <p className="text-[10.5px] font-bold uppercase px-2 mb-1.5" style={{ color: 'var(--sidebar-muted)', letterSpacing: '0.08em' }}>
          Navigation
        </p>
        {MAIN_NAV.map(n => (
          <NavItem key={n.href} {...n} />
        ))}
      </div>

      {/* ── Admin nav ── */}
      {isAdmin && (
        <div className="flex flex-col gap-0.5 mt-3">
          <div
            className="flex items-center gap-2 px-2 mb-1.5"
            style={{ borderTop: '1px solid var(--sidebar-border)', paddingTop: 12 }}
          >
            <p className="text-[10.5px] font-bold uppercase flex-1" style={{ color: 'var(--sidebar-muted)', letterSpacing: '0.08em' }}>
              Admin
            </p>
          </div>
          {ADMIN_NAV.map(n => (
            <NavItem key={n.href} {...n} />
          ))}
        </div>
      )}

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── API Docs ── */}
      <Link
        href="/docs"
        className="flex items-center gap-2.5 px-2 py-1.5 rounded-md mb-2 transition-colors"
        style={{ color: 'var(--sidebar-muted)' }}
      >
        <IconBook size={15} />
        <span className="text-[12.5px]">Documentation API</span>
      </Link>

      {/* ── Agents alimentés ── */}
      <div
        className="rounded-lg p-3 mb-3"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--sidebar-border)' }}
      >
        <p
          className="text-[10.5px] uppercase font-bold mb-2.5"
          style={{ letterSpacing: '0.07em', color: 'var(--sidebar-muted)' }}
        >
          Agents alimentés
        </p>
        {AGENTS.map(a => (
          <div key={a.label} className="flex items-center gap-2 py-[3.5px]" style={{ color: 'var(--sidebar-text)' }}>
            <span
              className={`rounded-full flex-shrink-0 ${a.active ? 'cb-dot-pulse' : ''}`}
              style={{ width: 7, height: 7, background: a.color }}
            />
            <span className="flex-1 text-[12.5px] truncate">{a.label}</span>
            <span className="mono text-[10.5px]" style={{ color: 'var(--sidebar-muted)' }}>
              {a.active ? 'actif' : a.tag}
            </span>
          </div>
        ))}
      </div>

      {/* ── Utilisateur ── */}
      <div
        className="flex items-center gap-2.5 pt-3"
        style={{ borderTop: '1px solid var(--sidebar-border)' }}
      >
        <div
          className="flex items-center justify-center rounded-md flex-shrink-0 text-white font-bold"
          style={{ width: 32, height: 32, background: avatarColor, fontSize: 11.5 }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--sidebar-text)' }}>
            {profile?.full_name ?? email}
          </div>
          <div className="text-[11px] truncate" style={{ color: 'var(--sidebar-muted)' }}>
            {roleLabel}
          </div>
        </div>
        <SignOutButton />
      </div>
    </nav>
  )
}
