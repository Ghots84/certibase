'use client'

import { useState, useRef, useEffect } from 'react'
import {
  IconAudio, IconVideo, IconPdf, IconLink, IconUpload,
} from '@/components/icons'
import type { Import } from '@/lib/supabase/types'

type FileMode = 'audio' | 'video' | 'pdf' | 'url'

const FILE_MODES: {
  value: FileMode
  label: string
  accept?: string
  icon: React.ReactNode
  bg: string
}[] = [
  { value: 'audio', label: 'Audio', accept: '.mp3,.m4a,.wav', icon: <IconAudio size={16} />, bg: 'var(--primary-soft)' },
  { value: 'video', label: 'Vidéo', accept: '.mp4,.mov',       icon: <IconVideo size={16} />, bg: 'var(--accent-soft)' },
  { value: 'pdf',   label: 'PDF',   accept: '.pdf,.pptx',      icon: <IconPdf size={16} />,   bg: 'var(--surface-2)' },
  { value: 'url',   label: 'URL',                              icon: <IconLink size={16} />,  bg: 'var(--warning-soft)' },
]

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  pending:    { label: 'En file',       bg: 'var(--warning-soft)',  color: 'var(--warning)' },
  extracting: { label: 'Extraction...', bg: 'var(--accent-soft)',   color: 'var(--accent)' },
  analyzing:  { label: 'Analyse...',    bg: 'var(--primary-soft)',  color: 'var(--primary)' },
  ready:      { label: 'Prêt',          bg: 'var(--success-soft)',  color: 'var(--success)' },
  error:      { label: 'Erreur',        bg: 'var(--danger-soft)',   color: 'var(--danger)' },
}

const FILE_TYPE_META: Record<string, { bg: string; icon: React.ReactNode }> = {
  audio: { bg: 'var(--primary-soft)', icon: <IconAudio size={18} /> },
  video: { bg: 'var(--accent-soft)',  icon: <IconVideo size={18} /> },
  pdf:   { bg: 'var(--surface-2)',    icon: <IconPdf size={18} /> },
  url:   { bg: 'var(--warning-soft)', icon: <IconLink size={18} /> },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function ImportsPage() {
  const [mode, setMode] = useState<FileMode>('audio')
  const [dragOver, setDragOver] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [imports, setImports] = useState<Import[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentMode = FILE_MODES.find(m => m.value === mode)!

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/imports')
      if (res.ok) setImports(await res.json())
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

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) await uploadFile(file)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await uploadFile(file)
    e.target.value = ''
  }

  return (
    <div className="p-7 cb-fade-in" style={{ maxWidth: 880 }}>
      <h1
        className="text-2xl font-bold mb-1"
        style={{ color: 'var(--text)', letterSpacing: 'var(--head-spacing)' }}
      >
        Imports &amp; validation
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Déposez un fichier ou collez une URL pour lancer l&apos;ingestion dans la base.
      </p>

      {/* Type chips */}
      <div className="flex gap-2 mb-4" role="group" aria-label="Type d'import">
        {FILE_MODES.map(m => (
          <button
            key={m.value}
            onClick={() => { setMode(m.value); setError(null) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 14px',
              borderRadius: 'var(--radius-pill)',
              border: mode === m.value
                ? '1.5px solid var(--primary)'
                : '1.5px solid var(--border)',
              background: mode === m.value ? 'var(--primary-soft)' : 'var(--surface)',
              color: mode === m.value ? 'var(--primary)' : 'var(--text-muted)',
              fontSize: 13,
              fontWeight: mode === m.value ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </div>

      {/* Zone d'import */}
      {mode !== 'url' ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Zone de dépôt de fichiers"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
          style={{
            width: '100%',
            minHeight: 156,
            borderRadius: 'var(--radius-lg)',
            border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
            background: dragOver ? 'var(--primary-soft)' : 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
            transition: 'border-color 0.15s ease, background 0.15s ease',
            marginBottom: 24,
          }}
        >
          <span style={{ color: dragOver ? 'var(--primary)' : 'var(--text-faint)' }}>
            <IconUpload size={28} />
          </span>
          <p
            className="font-medium"
            style={{ color: dragOver ? 'var(--primary)' : 'var(--text)', margin: 0, fontSize: 14 }}
          >
            {loading ? 'Envoi en cours...' : `Glissez un fichier ${currentMode.label} ici`}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12.5, margin: 0 }}>
            ou cliquez pour parcourir
            {currentMode.accept && ` — ${currentMode.accept}`}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={currentMode.accept}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      ) : (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 16,
            display: 'flex',
            gap: 10,
            marginBottom: 24,
          }}
        >
          <input
            type="url"
            className="cb-input"
            placeholder="https://youtube.com/watch?v=... ou zoom.us/rec/..."
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addUrl()}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              fontSize: 14,
            }}
          />
          <button
            onClick={addUrl}
            disabled={loading || !urlInput.trim()}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius)',
              background: urlInput.trim() && !loading ? 'var(--primary)' : 'var(--border)',
              color: urlInput.trim() && !loading ? '#fff' : 'var(--text-muted)',
              border: 'none',
              fontWeight: 600,
              fontSize: 13.5,
              cursor: urlInput.trim() && !loading ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap',
              transition: 'background 0.12s ease, color 0.12s ease',
            }}
          >
            {loading ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      )}

      {/* Message d'erreur */}
      {error && (
        <div
          className="mb-5"
          style={{
            background: 'var(--danger-soft)',
            color: 'var(--danger)',
            borderRadius: 'var(--radius)',
            padding: '10px 14px',
            fontSize: 13.5,
            border: '1px solid rgba(192,57,43,0.15)',
          }}
        >
          {error}
        </div>
      )}

      {/* Liste des imports */}
      <div>
        <p
          className="text-[13px] font-bold uppercase mb-3"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.07em' }}
        >
          Imports récents
        </p>

        {imports.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 0',
              color: 'var(--text-faint)',
              fontSize: 14,
              background: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
            }}
          >
            Aucun import pour le moment
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {imports.map(imp => {
              const status = STATUS_MAP[imp.status] ?? STATUS_MAP.pending
              const meta = FILE_TYPE_META[imp.file_type ?? 'pdf'] ?? FILE_TYPE_META.pdf
              const label = imp.original_name ?? imp.file_url ?? 'Import'

              return (
                <div
                  key={imp.id}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '11px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  {/* Icône type */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--radius-sm)',
                      background: meta.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      flexShrink: 0,
                    }}
                  >
                    {meta.icon}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-medium truncate"
                      style={{ color: 'var(--text)', fontSize: 14, margin: 0 }}
                      title={label}
                    >
                      {label}
                    </p>
                    <p
                      className="mono"
                      style={{ color: 'var(--text-faint)', fontSize: 12, margin: 0 }}
                    >
                      {imp.file_type?.toUpperCase()} · {formatDate(imp.created_at)}
                      {imp.fiches_count > 0 && ` · ${imp.fiches_count} fiche${imp.fiches_count > 1 ? 's' : ''}`}
                    </p>
                  </div>

                  {/* Badge statut */}
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-pill)',
                      background: status.bg,
                      color: status.color,
                      fontSize: 12,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {status.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
