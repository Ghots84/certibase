'use client'

import { signOut } from '@/app/(auth)/login/actions'
import { IconLogout } from './icons'

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut()}
      title="Se déconnecter"
      className="cb-signout"
    >
      <IconLogout size={15} />
    </button>
  )
}
