'use client'

import { useState } from 'react'

export default function InviteForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setError('')

    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue')
      setStatus('success')
      setEmail('')
      setTimeout(() => { setStatus('idle'); setOpen(false) }, 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau')
      setStatus('error')
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all"
        style={{
          background: 'var(--primary)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
        Inviter
      </button>
    )
  }

  return (
    <form onSubmit={handleInvite} className="flex items-center gap-2">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="email@organisation.fr"
        autoFocus
        disabled={status === 'loading'}
        className="rounded-lg px-3 py-2 text-[13px] outline-none"
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border-strong)',
          color: 'var(--text)',
          width: 220,
        }}
      />
      <button
        type="submit"
        disabled={!email.trim() || status === 'loading'}
        className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-all"
        style={{
          background: status === 'success' ? 'var(--success)' : 'var(--primary)',
          color: '#fff',
          border: 'none',
          cursor: !email.trim() || status === 'loading' ? 'not-allowed' : 'pointer',
          opacity: !email.trim() || status === 'loading' ? 0.7 : 1,
        }}
      >
        {status === 'loading' ? '...' : status === 'success' ? '✓ Envoyé' : 'Envoyer'}
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setEmail(''); setStatus('idle') }}
        className="px-3 py-2 rounded-lg text-[13px] transition-all"
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          color: 'var(--text-muted)',
          cursor: 'pointer',
        }}
      >
        Annuler
      </button>
      {status === 'error' && (
        <span className="text-[12px]" style={{ color: 'var(--danger)' }}>{error}</span>
      )}
    </form>
  )
}
