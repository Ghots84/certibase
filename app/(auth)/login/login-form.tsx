'use client'

import { useState } from 'react'
import { signIn } from './actions'

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await signIn(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
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
          className="cb-input rounded-md px-3 text-sm outline-none"
          style={{
            height: 'var(--control-h)',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            transition: 'border-color 0.12s ease',
          }}
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
          autoComplete="current-password"
          placeholder="••••••••"
          className="cb-input rounded-md px-3 text-sm outline-none"
          style={{
            height: 'var(--control-h)',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            transition: 'border-color 0.12s ease',
          }}
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
        {loading ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  )
}
