'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { IconChevron, IconBell, IconAudio, IconVideo, IconPdf, IconLink } from './icons'
import type { Import } from '@/lib/supabase/types'

const ROUTE_LABELS: [string, string][] = [
  ['/',          "Vue d'ensemble"],
  ['/fiches',    'Fiches'],
  ['/imports',   'Imports & validation'],
  ['/assistant', 'Assistant interne'],
  ['/users',     'Utilisateurs'],
]

const TYPE_META: Record<string, { bg: string; icon: React.ReactNode }> = {
  audio: { bg: 'var(--primary-soft)', icon: <IconAudio size={14} /> },
  video: { bg: 'var(--accent-soft)',  icon: <IconVideo size={14} /> },
  pdf:   { bg: 'var(--surface-2)',    icon: <IconPdf size={14} /> },
  url:   { bg: 'var(--warning-soft)', icon: <IconLink size={14} /> },
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  ready: { label: 'Prêt',   color: 'var(--success)' },
  error: { label: 'Erreur', color: 'var(--danger)'  },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return 'à l\'instant'
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

export default function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const match = ROUTE_LABELS.find(([prefix]) =>
    prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(prefix + '/')
  )
  const label = match?.[1] ?? 'CertiBase'

  const [notifs, setNotifs] = useState<Import[]>([])
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Init seenIds depuis localStorage
  useEffect(() => {
    async function init() {
      try {
        const raw = localStorage.getItem('cb_seen_notifs')
        if (raw) setSeenIds(new Set(JSON.parse(raw) as string[]))
      } catch {}
    }
    init()
  }, [])

  // Polling toutes les 30s
  useEffect(() => {
    async function poll() {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data: Import[] = await res.json()
        setNotifs(data)
      }
    }
    poll()
    const id = setInterval(poll, 30_000)
    return () => clearInterval(id)
  }, [])

  // Fermer au clic extérieur
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const unseenCount = notifs.filter(n => !seenIds.has(n.id)).length

  function handleBellClick() {
    if (!open) {
      // Marquer tout comme vu
      const next = new Set([...seenIds, ...notifs.map(n => n.id)])
      setSeenIds(next)
      try { localStorage.setItem('cb_seen_notifs', JSON.stringify([...next])) } catch {}
    }
    setOpen(prev => !prev)
  }

  function handleNotifClick(notif: Import) {
    setOpen(false)
    router.push(`/imports?selected=${notif.id}`)
  }

  return (
    <header
      className="flex items-center justify-between px-6 flex-shrink-0"
      style={{
        height: 60,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Fil d'ariane */}
      <div className="flex items-center gap-2 text-[13.5px]">
        <span className="font-medium" style={{ color: 'var(--text-faint)' }}>CertiBase</span>
        <IconChevron size={14} style={{ color: 'var(--text-faint)' }} />
        <span className="font-semibold" style={{ color: 'var(--text)' }}>{label}</span>
      </div>

      {/* Cloche + dropdown */}
      <div ref={wrapperRef} style={{ position: 'relative' }}>
        <button
          className="cb-icon-btn relative"
          aria-label="Notifications"
          onClick={handleBellClick}
        >
          <IconBell size={18} />
          {unseenCount > 0 && (
            <span
              className="absolute rounded-full"
              style={{
                top: 9, right: 10,
                width: 7, height: 7,
                background: 'var(--primary)',
                border: '2px solid var(--surface)',
              }}
            />
          )}
        </button>

        {open && (
          <div style={{
            position: 'absolute', right: 0, top: 'calc(100% + 8px)',
            width: 300, background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            zIndex: 50, overflow: 'hidden',
          }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
              <p className="font-semibold" style={{ color: 'var(--text)', fontSize: 13, margin: 0 }}>
                Notifications
              </p>
            </div>

            {notifs.length === 0 ? (
              <p style={{ color: 'var(--text-faint)', fontSize: 13, padding: '20px 14px', margin: 0, textAlign: 'center' }}>
                Aucune notification récente
              </p>
            ) : (
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifs.map(notif => {
                  const meta = TYPE_META[notif.file_type ?? 'pdf'] ?? TYPE_META.pdf
                  const st = STATUS_LABEL[notif.status] ?? STATUS_LABEL.ready
                  const name = notif.original_name ?? notif.file_url ?? 'Import'
                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        gap: 10, padding: '10px 14px', background: 'transparent',
                        border: 'none', borderBottom: '1px solid var(--border)',
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                        background: meta.bg, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0,
                      }}>
                        {meta.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="truncate" style={{ color: 'var(--text)', fontSize: 12.5, fontWeight: 500, margin: 0 }} title={name}>
                          {name}
                        </p>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                          <span style={{ fontSize: 11, color: st.color, fontWeight: 600 }}>{st.label}</span>
                          {notif.status === 'ready' && notif.fiches_count > 0 && (
                            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                              · {notif.fiches_count} fiche{notif.fiches_count > 1 ? 's' : ''}
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 'auto' }}>
                            {timeAgo(notif.created_at)}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            <button
              onClick={() => { setOpen(false); router.push('/imports') }}
              style={{
                width: '100%', padding: '10px 14px', background: 'transparent',
                border: 'none', borderTop: notifs.length > 0 ? '1px solid var(--border)' : 'none',
                color: 'var(--primary)', fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer', textAlign: 'center',
              }}
            >
              Voir tous les imports →
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
