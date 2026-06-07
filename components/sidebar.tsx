import NavItem from './nav-item'
import { IconGrid, IconCards, IconImport, IconChat } from './icons'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from './sign-out-button'

const NAV = [
  { href: '/',          label: "Vue d'ensemble",      icon: <IconGrid size={18} /> },
  { href: '/fiches',    label: 'Fiches',               icon: <IconCards size={18} />,  badge: '8' },
  { href: '/imports',   label: 'Imports & validation', icon: <IconImport size={18} />, badge: '4' },
  { href: '/assistant', label: 'Assistant interne',    icon: <IconChat size={18} /> },
]

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  return email.slice(0, 2).toUpperCase()
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#7A5AF8',
  csm:   '#2D7DD2',
  sales: '#E8651E',
  new:   '#8A94A2',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Knowledge Manager',
  csm:   'Customer Success',
  sales: 'Account Executive',
  new:   'Nouveau',
}

export default async function Sidebar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, role, avatar_initials, email')
      .eq('id', user.id)
      .single()
    profile = data
  }

  const email = profile?.email ?? user?.email ?? ''
  const initials = profile?.avatar_initials ?? getInitials(profile?.full_name ?? null, email)
  const role = profile?.role ?? 'new'
  const avatarColor = ROLE_COLORS[role] ?? '#8A94A2'
  const roleLabel = ROLE_LABELS[role] ?? role

  return (
    <nav
      className="flex flex-col"
      style={{
        width: 250,
        flexShrink: 0,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        padding: '18px 14px',
        gap: 6,
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-[11px] px-2 pb-4">
        <div
          className="flex items-center justify-center rounded-lg text-white font-extrabold"
          style={{ width: 38, height: 38, background: 'var(--primary)', fontSize: 15, letterSpacing: '-0.02em' }}
        >
          CB
        </div>
        <div>
          <div className="font-bold text-base" style={{ color: 'var(--sidebar-text)', letterSpacing: 'var(--head-spacing)' }}>
            CertiBase
          </div>
          <div className="text-[11.5px]" style={{ color: 'var(--sidebar-muted)' }}>
            Console interne
          </div>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-[3px]">
        {NAV.map(n => (
          <NavItem key={n.href} {...n} />
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Agents alimentés */}
      <div
        className="rounded-lg p-3 mb-2"
        style={{ background: 'var(--sidebar-active-bg)', border: '1px solid var(--sidebar-border)' }}
      >
        <div
          className="text-[11px] uppercase font-bold mb-[9px]"
          style={{ letterSpacing: '0.06em', color: 'var(--sidebar-muted)' }}
        >
          Agents alimentés
        </div>
        {[
          { label: 'CSM Digital',        color: 'var(--success)', state: 'actif' },
          { label: 'Sales Digital',       color: 'var(--success)', state: 'actif' },
          { label: 'Assistant interne',   color: 'var(--primary)', state: 'V1' },
        ].map(a => (
          <div key={a.label} className="flex items-center gap-2 py-[3px] text-[12.5px]" style={{ color: 'var(--sidebar-text)' }}>
            <span className="rounded-full flex-shrink-0" style={{ width: 7, height: 7, background: a.color }} />
            <span className="flex-1">{a.label}</span>
            <span className="mono text-[10.5px]" style={{ color: 'var(--sidebar-muted)' }}>{a.state}</span>
          </div>
        ))}
      </div>

      {/* Bloc utilisateur */}
      <div
        className="flex items-center gap-[10px] pt-2"
        style={{ borderTop: '1px solid var(--sidebar-border)' }}
      >
        <div
          className="flex items-center justify-center rounded-md flex-shrink-0 text-white text-[11.5px] font-bold"
          style={{ width: 30, height: 30, background: avatarColor }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--sidebar-text)' }}>
            {profile?.full_name ?? email}
          </div>
          <div className="text-[11px]" style={{ color: 'var(--sidebar-muted)' }}>
            {roleLabel}
          </div>
        </div>
        <SignOutButton />
      </div>
    </nav>
  )
}
