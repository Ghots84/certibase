'use client'

import { signOut } from '@/app/(auth)/login/actions'
import { IconLogout } from './icons'

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut()}
      title="Se déconnecter"
      className="flex items-center justify-center rounded-md transition-colors flex-shrink-0"
      style={{
        width: 28,
        height: 28,
        color: 'var(--sidebar-muted)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--sidebar-muted)')}
    >
      <IconLogout size={15} />
    </button>
  )
}
