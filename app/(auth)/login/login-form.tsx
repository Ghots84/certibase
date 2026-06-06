'use client'

import { useState } from 'react'
import { signIn, signUp } from './actions'

export default function LoginForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const action = mode === 'login' ? signIn : signUp
    const result = await action(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Toggle connexion / inscription */}
      <div
        className="flex rounded-lg p-1 mb-6"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
      >
        {(['login', 'signup'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(null) }}
            className="flex-1 rounded-md text-sm font-semibold transition-all"
            style={{
              height: 32,
              border: 'none',
              cursor: 'pointer',
              background: mode === m ? 'var(--surface)' : 'transparent',
              color: mode === m ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: mode === m ? 'var(--shadow)' : 'none',
            }}
          >
            {m === 'login' ? 'Se connecter' : 'Créer un compte'}
          </button>
        ))}
      </div>

      <form action={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--text)' }} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="vous@certiplace.fr"
            className="rounded-md px-3 text-sm outline-none transition-colors"
            style={{
              height: 'var(--control-h)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--text)' }} htmlFor="password">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="••••••••"
            className="rounded-md px-3 text-sm outline-none transition-colors"
            style={{
              height: 'var(--control-h)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        {error && (
          <div
            className="rounded-md px-3 py-2 text-sm"
            style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md text-sm font-semibold transition-colors mt-2"
          style={{
            height: 'var(--control-h)',
            background: loading ? 'var(--border)' : 'var(--primary)',
            color: loading ? 'var(--text-faint)' : 'var(--primary-text)',
            border: 'none',
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading
            ? (mode === 'login' ? 'Connexion…' : 'Création…')
            : (mode === 'login' ? 'Se connecter' : 'Créer mon compte')}
        </button>
      </form>
    </div>
  )
}
