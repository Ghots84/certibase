'use client'

import { useEffect, useRef, useState } from 'react'
import { uuid } from '@/lib/uuid'

type Toast = {
  id: string
  message: string
  type?: 'success' | 'error' | 'info'
}

declare global {
  interface Window {
    cbToast: (message: string, type?: Toast['type']) => void
  }
}

export default function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    window.cbToast = (message, type = 'success') => {
      const id = uuid()
      setToasts(prev => [...prev, { id, message, type }])
      timers.current[id] = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
        delete timers.current[id]
      }, 3000)
    }
    const activeTimers = timers.current
    return () => {
      Object.values(activeTimers).forEach(clearTimeout)
    }
  }, [])

  const BG: Record<string, string> = {
    success: 'var(--success)',
    error:   'var(--danger)',
    info:    'var(--accent)',
  }

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className="cb-fade-in"
          style={{
            background: BG[t.type ?? 'success'],
            color: '#fff',
            borderRadius: 'var(--radius)',
            padding: '10px 16px',
            fontSize: 13.5,
            fontWeight: 500,
            boxShadow: 'var(--shadow-lg)',
            maxWidth: 320,
            pointerEvents: 'auto',
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
