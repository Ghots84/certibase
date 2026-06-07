import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginForm from './login-form'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/')

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div
        className="cb-fade-in w-full max-w-sm rounded-xl p-8"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="flex items-center justify-center rounded-lg text-white font-extrabold text-sm"
            style={{ width: 38, height: 38, background: 'var(--primary)', letterSpacing: '-0.02em' }}
          >
            CB
          </div>
          <div>
            <div className="font-bold text-base" style={{ color: 'var(--text)', letterSpacing: 'var(--head-spacing)' }}>
              CertiBase
            </div>
            <div className="text-xs" style={{ color: 'var(--text-faint)' }}>Console interne</div>
          </div>
        </div>

        <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--text)' }}>
          Connexion
        </h1>

        <LoginForm />
      </div>
    </div>
  )
}
