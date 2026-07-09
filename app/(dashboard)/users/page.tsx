import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { IconUsers } from '@/components/icons'
import InviteForm from './invite-form'
import RoleSelect from './role-select'

type Profile = {
  id: string
  email: string
  full_name: string | null
  role: string
  avatar_initials: string | null
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Knowledge Manager',
  csm:   'Customer Success',
  sales: 'Account Executive',
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#7A5AF8',
  csm:   '#2D7DD2',
  sales: '#E8651E',
}

function getInitials(profile: Profile) {
  if (profile.avatar_initials) return profile.avatar_initials
  if (profile.full_name) return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return profile.email.slice(0, 2).toUpperCase()
}

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: currentProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (currentProfile?.role !== 'admin') redirect('/')

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, full_name, role, avatar_initials, created_at')
    .order('created_at', { ascending: true })

  const users: Profile[] = profiles ?? []

  return (
    <div className="cb-fade-in flex flex-col" style={{ height: '100%' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-7 py-4"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <div>
          <h1
            className="font-bold text-[17px]"
            style={{ color: 'var(--text)', letterSpacing: 'var(--head-spacing)' }}
          >
            Gestion des utilisateurs
          </h1>
          <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {users.length} membre{users.length > 1 ? 's' : ''} · invitations et rôles
          </p>
        </div>
        <InviteForm />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-7 py-5">
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          {/* Table header */}
          <div
            className="grid text-[11.5px] font-semibold uppercase px-5 py-3"
            style={{
              gridTemplateColumns: '2fr 1fr 1fr',
              background: 'var(--surface-2)',
              borderBottom: '1px solid var(--border)',
              letterSpacing: '0.05em',
              color: 'var(--text-muted)',
            }}
          >
            <span>Utilisateur</span>
            <span>Rôle</span>
            <span>Membre depuis</span>
          </div>

          {users.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
              <div
                className="flex items-center justify-center rounded-xl"
                style={{ width: 48, height: 48, background: 'var(--surface-2)', color: 'var(--text-faint)' }}
              >
                <IconUsers size={22} />
              </div>
              <p className="text-[13px]" style={{ color: 'var(--text-faint)' }}>
                Aucun utilisateur pour le moment.
              </p>
            </div>
          )}

          {users.map((profile, i) => (
            <div
              key={profile.id}
              className="grid items-center px-5 py-3.5"
              style={{
                gridTemplateColumns: '2fr 1fr 1fr',
                borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none',
                background: 'var(--surface)',
              }}
            >
              {/* User info */}
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center rounded-md flex-shrink-0 text-white text-[11px] font-bold"
                  style={{
                    width: 32,
                    height: 32,
                    background: ROLE_COLORS[profile.role] ?? '#8A94A2',
                  }}
                >
                  {getInitials(profile)}
                </div>
                <div>
                  <div className="text-[13.5px] font-medium" style={{ color: 'var(--text)' }}>
                    {profile.full_name ?? profile.email}
                  </div>
                  {profile.full_name && (
                    <div className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                      {profile.email}
                    </div>
                  )}
                </div>
              </div>

              {/* Role selector */}
              <div>
                {profile.id === user.id ? (
                  <span
                    className="text-[12px] px-2.5 py-1 rounded-md font-medium"
                    style={{
                      background: 'var(--surface-2)',
                      color: ROLE_COLORS[profile.role],
                      border: '1px solid var(--border)',
                    }}
                  >
                    {ROLE_LABELS[profile.role] ?? profile.role}
                  </span>
                ) : (
                  <RoleSelect
                    userId={profile.id}
                    currentRole={profile.role}
                    roleLabels={ROLE_LABELS}
                    roleColors={ROLE_COLORS}
                  />
                )}
              </div>

              {/* Date */}
              <div className="mono text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {new Date(profile.created_at).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Info rôles */}
        <div
          className="mt-4 rounded-xl px-5 py-4 text-[12.5px]"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
          }}
        >
          <span className="font-semibold" style={{ color: 'var(--text)' }}>Customer Success</span>
          {' '}— accès aux fiches CSM et à l&apos;assistant orienté suivi client.
          {' · '}
          <span className="font-semibold" style={{ color: 'var(--text)' }}>Account Executive</span>
          {' '}— accès aux fiches Sales et à l&apos;assistant orienté commercial.
        </div>
      </div>
    </div>
  )
}
