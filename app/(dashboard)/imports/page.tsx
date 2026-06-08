'use client'

import { useState, useRef, useEffect } from 'react'
import {
  IconAudio, IconVideo, IconPdf, IconLink, IconUpload, IconChevron,
} from '@/components/icons'
import type { Import } from '@/lib/supabase/types'

type FileMode = 'audio' | 'video' | 'pdf' | 'url'

const FILE_MODES: { value: FileMode; label: string; accept?: string; icon: React.ReactNode }[] = [
  { value: 'audio', label: 'Audio', accept: '.mp3,.m4a,.wav', icon: <IconAudio size={15} /> },
  { value: 'video', label: 'Vidéo', accept: '.mp4,.mov',       icon: <IconVideo size={15} /> },
  { value: 'pdf',   label: 'PDF',   accept: '.pdf,.pptx',      icon: <IconPdf size={15} /> },
  { value: 'url',   label: 'URL',                              icon: <IconLink size={15} /> },
]

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  pending:    { label: 'En file',       bg: 'var(--warning-soft)',  color: 'var(--warning)' },
  extracting: { label: 'Extraction...', bg: 'var(--accent-soft)',   color: 'var(--accent)' },
  analyzing:  { label: 'Analyse...',    bg: 'var(--primary-soft)',  color: 'var(--primary)' },
  ready:      { label: 'Prêt',          bg: 'var(--success-soft)',  color: 'var(--success)' },
  error:      { label: 'Erreur',        bg: 'var(--danger-soft)',   color: 'var(--danger)' },
}

const FILE_TYPE_META: Record<string, { bg: string; icon: React.ReactNode }> = {
  audio: { bg: 'var(--primary-soft)', icon: <IconAudio size={17} /> },
  video: { bg: 'var(--accent-soft)',  icon: <IconVideo size={17} /> },
  pdf:   { bg: 'var(--surface-2)',    icon: <IconPdf size={17} /> },
  url:   { bg: 'var(--warning-soft)', icon: <IconLink size={17} /> },
}

const IN_PROGRESS = new Set(['pending', 'extracting', 'analyzing'])

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// ── Indeterminate progress bar ────────────────────────────────────────────────
function ProgressBar({ status }: { status: string }) {
  if (!IN_PROGRESS.has(status)) return null
  return (
    <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginTop: 5 }}>
      <div
        style={{
          height: '100%',
          width: '40%',
          background: status === 'analyzing' ? 'var(--primary)' : 'var(--accent)',
          borderRadius: 2,
          animation: 'cbprogress 1.6s ease-in-out infinite',
        }}
      />
    </div>
  )
}

// ── Right panel ───────────────────────────────────────────────────────────────
function ImportPanel({
  imp,
  onRetry,
  retrying,
}: {
  imp: Import | null
  onRetry: (id: string) => void
  retrying: Set<string>
}) {
  if (!imp) {
    return (
      <div
        style={{
          flex: '0 0 340px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          gap: 10,
          color: 'var(--text-faint)',
        }}
      >
        <IconChevron size={28} style={{ opacity: 0.3, transform: 'rotate(180deg)' }} />
        <p style={{ fontSize: 13.5, textAlign: 'center', margin: 0 }}>
          Sélectionnez un import<br />pour voir les détails
        </p>
      </div>
    )
  }

  const status = STATUS_MAP[imp.status] ?? STATUS_MAP.pending
  const meta = FILE_TYPE_META[imp.file_type ?? 'pdf'] ?? FILE_TYPE_META.pdf
  const label = imp.original_name ?? imp.file_url ?? 'Import'

  return (
    <div
      style={{
        flex: '0 0 340px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 'var(--radius-sm)',
              background: meta.bg, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0,
            }}
          >
            {meta.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="font-semibold truncate" style={{ color: 'var(--text)', fontSize: 13.5, margin: 0 }} title={label}>
              {label}
            </p>
            <p className="mono" style={{ color: 'var(--text-faint)', fontSize: 11.5, margin: 0 }}>
              {imp.file_type?.toUpperCase()} · {formatDate(imp.created_at)}
            </p>
          </div>
        </div>
        <span
          style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: 'var(--radius-pill)',
            background: status.bg,
            color: status.color,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {status.label}
        </span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* En cours */}
        {IN_PROGRESS.has(imp.status) && (
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 8px' }}>
              Pipeline en cours de traitement…
            </p>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%', width: '45%', borderRadius: 2,
                  background: imp.status === 'analyzing' ? 'var(--primary)' : 'var(--accent)',
                  animation: 'cbprogress 1.6s ease-in-out infinite',
                }}
              />
            </div>
          </div>
        )}

        {/* Prêt */}
        {imp.status === 'ready' && (
          <div
            style={{
              background: 'var(--success-soft)',
              border: '1px solid rgba(31,138,91,0.2)',
              borderRadius: 'var(--radius)',
              padding: '14px 16px',
            }}
          >
            <p className="font-semibold" style={{ color: 'var(--success)', fontSize: 14, margin: '0 0 4px' }}>
              {imp.fiches_count} fiche{imp.fiches_count !== 1 ? 's' : ''} générée{imp.fiches_count !== 1 ? 's' : ''}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12.5, margin: 0 }}>
              Prêtes à valider dans le dashboard
            </p>
          </div>
        )}

        {/* Erreur */}
        {imp.status === 'error' && (
          <div
            style={{
              background: 'var(--danger-soft)',
              border: '1px solid rgba(192,57,43,0.15)',
              borderRadius: 'var(--radius)',
              padding: '14px 16px',
            }}
          >
            <p className="font-semibold" style={{ color: 'var(--danger)', fontSize: 13, margin: '0 0 6px' }}>
              Erreur de traitement
            </p>
            {imp.error_message && (
              <p className="mono" style={{ color: 'var(--danger)', fontSize: 11.5, margin: 0, wordBreak: 'break-word' }}>
                {imp.error_message}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        {imp.status === 'error' && (
          <button
            onClick={() => onRetry(imp.id)}
            disabled={retrying.has(imp.id)}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 13.5,
              fontWeight: 500,
              cursor: retrying.has(imp.id) ? 'not-allowed' : 'pointer',
            }}
          >
            {retrying.has(imp.id) ? 'Relance...' : 'Relancer le pipeline'}
          </button>
        )}
        {imp.status === 'ready' && imp.fiches_count > 0 && (
          <button
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 'var(--radius)',
              border: 'none',
              background: 'var(--primary)',
              color: '#fff',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Voir les {imp.fiches_count} fiches →
          </button>
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ImportsPage() {
  const [mode, setMode] = useState<FileMode>('audio')
  const [dragOver, setDragOver] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [imports, setImports] = useState<Import[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [retrying, setRetrying] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentMode = FILE_MODES.find(m => m.value === mode)!
  const selectedImport = imports.find(i => i.id === selectedId) ?? null

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/imports')
      if (!res.ok) return
      const data: Import[] = await res.json()
      setImports(data)
      if (data.some(i => IN_PROGRESS.has(i.status))) {
        setTimeout(() => setRefreshKey(k => k + 1), 3000)
      }
    }
    load()
  }, [refreshKey])

  async function uploadFile(file: File) {
    setLoading(true)
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('import_type', 'other')

    const res = await fetch('/api/imports/upload', { method: 'POST', body: fd })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? "Erreur lors de l'upload")
      window.cbToast(data.error ?? "Erreur lors de l'upload", 'error')
    } else {
      window.cbToast('Fichier ajouté à la file de traitement')
      setRefreshKey(k => k + 1)
    }
    setLoading(false)
  }

  async function addUrl() {
    if (!urlInput.trim()) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/imports/url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: urlInput.trim(), import_type: 'webinar' }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Erreur')
      window.cbToast(data.error ?? 'Erreur', 'error')
    } else {
      setUrlInput('')
      window.cbToast('URL ajoutée à la file de traitement')
      setRefreshKey(k => k + 1)
    }
    setLoading(false)
  }

  async function retryImport(importId: string) {
    setRetrying(prev => new Set(prev).add(importId))
    const res = await fetch(`/api/imports/${importId}/process`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      window.cbToast(data.error ?? 'Erreur lors du relancement', 'error')
    } else {
      window.cbToast('Pipeline relancé')
      setRefreshKey(k => k + 1)
    }
    setRetrying(prev => { const s = new Set(prev); s.delete(importId); return s })
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDragOver(true) }
  function handleDragLeave(e: React.DragEvent) { e.preventDefault(); setDragOver(false) }
  async function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) await uploadFile(file)
  }
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await uploadFile(file)
    e.target.value = ''
  }

  return (
    <div className="p-7 cb-fade-in">
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)', letterSpacing: 'var(--head-spacing)' }}>
        Imports &amp; validation
      </h1>
      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
        Déposez un fichier ou collez une URL pour lancer l&apos;ingestion dans la base.
      </p>

      {/* Type chips */}
      <div className="flex gap-2 mb-4" role="group" aria-label="Type d'import">
        {FILE_MODES.map(m => (
          <button
            key={m.value}
            onClick={() => { setMode(m.value); setError(null) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 13px',
              borderRadius: 'var(--radius-pill)',
              border: mode === m.value ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
              background: mode === m.value ? 'var(--primary-soft)' : 'var(--surface)',
              color: mode === m.value ? 'var(--primary)' : 'var(--text-muted)',
              fontSize: 13, fontWeight: mode === m.value ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.12s ease',
            }}
          >
            {m.icon}{m.label}
          </button>
        ))}
      </div>

      {/* Dropzone ou URL */}
      {mode !== 'url' ? (
        <div
          role="button" tabIndex={0} aria-label="Zone de dépôt de fichiers"
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
          style={{
            width: '100%', minHeight: 140, borderRadius: 'var(--radius-lg)',
            border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
            background: dragOver ? 'var(--primary-soft)' : 'var(--surface)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 7, cursor: 'pointer', marginBottom: 24,
            transition: 'border-color 0.15s ease, background 0.15s ease',
          }}
        >
          <span style={{ color: dragOver ? 'var(--primary)' : 'var(--text-faint)' }}>
            <IconUpload size={26} />
          </span>
          <p className="font-medium" style={{ color: dragOver ? 'var(--primary)' : 'var(--text)', margin: 0, fontSize: 14 }}>
            {loading ? 'Envoi en cours...' : `Glissez un fichier ${currentMode.label} ici`}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12.5, margin: 0 }}>
            ou cliquez pour parcourir{currentMode.accept && ` — ${currentMode.accept}`}
          </p>
          <input ref={fileInputRef} type="file" accept={currentMode.accept} onChange={handleFileChange} style={{ display: 'none' }} />
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 14, display: 'flex', gap: 10, marginBottom: 24 }}>
          <input
            type="url" className="cb-input"
            placeholder="https://youtube.com/watch?v=... ou zoom.us/rec/..."
            value={urlInput} onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addUrl()}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}
          />
          <button
            onClick={addUrl} disabled={loading || !urlInput.trim()}
            style={{
              padding: '8px 18px', borderRadius: 'var(--radius)',
              background: urlInput.trim() && !loading ? 'var(--primary)' : 'var(--border)',
              color: urlInput.trim() && !loading ? '#fff' : 'var(--text-muted)',
              border: 'none', fontWeight: 600, fontSize: 13.5,
              cursor: urlInput.trim() && !loading ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap', transition: 'background 0.12s ease',
            }}
          >
            {loading ? '...' : 'Ajouter'}
          </button>
        </div>
      )}

      {/* Erreur upload */}
      {error && (
        <div className="mb-4" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 13.5, border: '1px solid rgba(192,57,43,0.15)' }}>
          {error}
        </div>
      )}

      {/* Section label */}
      <p className="text-[13px] font-bold uppercase mb-3" style={{ color: 'var(--text-muted)', letterSpacing: '0.07em' }}>
        Imports récents
      </p>

      {/* Layout : liste + panneau */}
      {imports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-faint)', fontSize: 14, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          Aucun import pour le moment
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* Liste */}
          <div className="flex flex-col gap-2" style={{ flex: 1, minWidth: 0 }}>
            {imports.map(imp => {
              const status = STATUS_MAP[imp.status] ?? STATUS_MAP.pending
              const meta = FILE_TYPE_META[imp.file_type ?? 'pdf'] ?? FILE_TYPE_META.pdf
              const label = imp.original_name ?? imp.file_url ?? 'Import'
              const isSelected = selectedId === imp.id
              const inProgress = IN_PROGRESS.has(imp.status)

              return (
                <div
                  key={imp.id}
                  onClick={() => setSelectedId(isSelected ? null : imp.id)}
                  style={{
                    background: 'var(--surface)',
                    border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '11px 14px',
                    display: 'flex', alignItems: 'center', gap: 11,
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 0 0 2px rgba(232,101,30,0.12)' : 'none',
                    transition: 'border-color 0.12s ease, box-shadow 0.12s ease',
                  }}
                >
                  {/* Icône */}
                  <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
                    {meta.icon}
                  </div>

                  {/* Infos */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="font-medium truncate" style={{ color: 'var(--text)', fontSize: 13.5, margin: 0 }} title={label}>
                      {label}
                    </p>
                    <p className="mono" style={{ color: 'var(--text-faint)', fontSize: 11.5, margin: 0 }}>
                      {imp.file_type?.toUpperCase()} · {formatDate(imp.created_at)}
                      {imp.fiches_count > 0 && ` · ${imp.fiches_count} fiche${imp.fiches_count > 1 ? 's' : ''}`}
                    </p>
                    <ProgressBar status={imp.status} />
                  </div>

                  {/* Badge statut + Relancer */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {imp.status === 'error' && (
                      <button
                        onClick={e => { e.stopPropagation(); retryImport(imp.id) }}
                        disabled={retrying.has(imp.id)}
                        style={{
                          padding: '2px 9px', borderRadius: 'var(--radius-pill)',
                          border: '1px solid var(--border)', background: 'var(--surface)',
                          color: 'var(--text-muted)', fontSize: 11.5, fontWeight: 500,
                          cursor: retrying.has(imp.id) ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {retrying.has(imp.id) ? '...' : 'Relancer'}
                      </button>
                    )}
                    <span style={{
                      padding: '2px 9px', borderRadius: 'var(--radius-pill)',
                      background: inProgress ? 'transparent' : status.bg,
                      color: status.color, fontSize: 11.5, fontWeight: 600,
                      border: inProgress ? `1px solid ${status.color}` : 'none',
                      whiteSpace: 'nowrap',
                    }}>
                      {status.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Panneau droit */}
          <ImportPanel imp={selectedImport} onRetry={retryImport} retrying={retrying} />
        </div>
      )}
    </div>
  )
}
