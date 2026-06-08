'use client'

import { useState, useRef, useEffect } from 'react'
import {
  IconAudio, IconVideo, IconPdf, IconLink, IconUpload, IconChevron,
} from '@/components/icons'
import type { Import, ImportFicheDraft } from '@/lib/supabase/types'

// ── Constants ─────────────────────────────────────────────────────────────────

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

const DRAFT_TYPE_LABEL: Record<string, string> = {
  objection:       'Objection',
  guide_situation: 'Guide situation',
  cas_client:      'Cas client',
  concurrent:      'Concurrent',
  missing_info:    'Angle mort',
}

const IN_PROGRESS = new Set(['pending', 'extracting', 'analyzing'])

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ status }: { status: string }) {
  if (!IN_PROGRESS.has(status)) return null
  return (
    <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginTop: 5 }}>
      <div style={{
        height: '100%', width: '40%', borderRadius: 2,
        background: status === 'analyzing' ? 'var(--primary)' : 'var(--accent)',
        animation: 'cbprogress 1.6s ease-in-out infinite',
      }} />
    </div>
  )
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 85 ? 'var(--success)' : pct >= 70 ? 'var(--warning)' : 'var(--danger)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.3s ease' }} />
      </div>
      <span className="mono" style={{ fontSize: 11, color, fontWeight: 600, minWidth: 28 }}>{pct}%</span>
    </div>
  )
}

type DraftState = 'pending' | 'approved' | 'rejected' | 'processing'

function ValidationCard({
  draft,
  state,
  isAdmin,
  onApprove,
  onReject,
}: {
  draft: ImportFicheDraft
  state: DraftState
  isAdmin: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const conf = draft.confidence ?? 0
  const isMissing = draft.type === 'missing_info'
  const lowConfidence = conf < 0.7

  const cardStyle: React.CSSProperties = {
    background: state === 'approved' ? 'var(--success-soft)' : 'var(--surface)',
    border: state === 'approved'
      ? '1px solid rgba(31,138,91,0.25)'
      : state === 'rejected'
        ? '1px solid var(--border)'
        : '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '14px',
    opacity: state === 'rejected' ? 0.45 : 1,
    transition: 'opacity 0.2s ease, background 0.2s ease',
  }

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 2, flexShrink: 0 }}>
          {draft.id.slice(0, 8)}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{
              padding: '1px 7px', borderRadius: 'var(--radius-pill)',
              background: isMissing ? 'var(--warning-soft)' : 'var(--accent-soft)',
              color: isMissing ? 'var(--warning)' : 'var(--accent)',
              fontSize: 11, fontWeight: 600,
            }}>
              {DRAFT_TYPE_LABEL[draft.type ?? 'objection'] ?? draft.type}
            </span>
            {lowConfidence && (
              <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 500 }}>⚠ Confiance faible</span>
            )}
          </div>
          <p className="font-semibold" style={{ color: 'var(--text)', fontSize: 13, margin: 0, lineHeight: 1.4 }}>
            {draft.title}
          </p>
        </div>
      </div>

      {/* Confidence */}
      <div style={{ marginBottom: 8 }}>
        <ConfidenceBar value={conf} />
      </div>

      {/* Extrait */}
      <p style={{
        color: 'var(--text-muted)', fontSize: 12.5, margin: '0 0 12px',
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', lineHeight: 1.5,
      }}>
        {draft.content}
      </p>

      {/* Actions */}
      {state === 'pending' && isAdmin && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onReject}
            style={{
              flex: 1, padding: '6px 0', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 500,
              cursor: 'pointer', transition: 'color 0.12s, border-color 0.12s',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.color = 'var(--danger)'
              ;(e.target as HTMLButtonElement).style.borderColor = 'var(--danger)'
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.color = 'var(--text-muted)'
              ;(e.target as HTMLButtonElement).style.borderColor = 'var(--border)'
            }}
          >
            Rejeter
          </button>
          <button
            onClick={onApprove}
            style={{
              flex: 2, padding: '6px 0', borderRadius: 'var(--radius-sm)',
              border: 'none', background: 'var(--success)',
              color: '#fff', fontSize: 12.5, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Valider
          </button>
        </div>
      )}

      {state === 'processing' && (
        <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: 0 }}>Traitement...</p>
      )}

      {state === 'approved' && (
        <p style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, margin: 0 }}>
          Fiche validée — exposée aux agents
        </p>
      )}

      {state === 'rejected' && (
        <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: 0 }}>Rejetée</p>
      )}
    </div>
  )
}

// ── Right panel ───────────────────────────────────────────────────────────────

function ImportPanel({
  imp,
  onRetry,
  retrying,
  isAdmin,
}: {
  imp: Import | null
  onRetry: (id: string) => void
  retrying: Set<string>
  isAdmin: boolean
}) {
  const [drafts, setDrafts] = useState<ImportFicheDraft[]>([])
  const [draftStates, setDraftStates] = useState<Record<string, DraftState>>({})
  const [loadingDrafts, setLoadingDrafts] = useState(false)

  const impId = imp?.id
  const impStatus = imp?.status

  useEffect(() => {
    async function load() {
      if (!impId || impStatus !== 'ready') {
        setDrafts([])
        setDraftStates({})
        return
      }
      setLoadingDrafts(true)
      const res = await fetch(`/api/imports/${impId}/drafts`)
      const data: ImportFicheDraft[] = res.ok ? await res.json() : []
      setDrafts(data)
      const initial: Record<string, DraftState> = {}
      data.forEach(d => { initial[d.id] = (d.status as DraftState) ?? 'pending' })
      setDraftStates(initial)
      setLoadingDrafts(false)
    }
    load()
  }, [impId, impStatus])

  async function handleApprove(draftId: string) {
    setDraftStates(prev => ({ ...prev, [draftId]: 'processing' }))
    const res = await fetch(`/api/drafts/${draftId}/approve`, { method: 'POST' })
    if (res.ok) {
      setDraftStates(prev => ({ ...prev, [draftId]: 'approved' }))
      window.cbToast('Fiche validée — exposée aux agents')
    } else {
      setDraftStates(prev => ({ ...prev, [draftId]: 'pending' }))
      const d = await res.json()
      window.cbToast(d.error ?? 'Erreur', 'error')
    }
  }

  async function handleReject(draftId: string) {
    setDraftStates(prev => ({ ...prev, [draftId]: 'processing' }))
    const res = await fetch(`/api/drafts/${draftId}/reject`, { method: 'POST' })
    if (res.ok) {
      setDraftStates(prev => ({ ...prev, [draftId]: 'rejected' }))
      window.cbToast('Draft rejeté')
    } else {
      setDraftStates(prev => ({ ...prev, [draftId]: 'pending' }))
      window.cbToast('Erreur', 'error')
    }
  }

  const panelStyle: React.CSSProperties = {
    width: 380,
    flexShrink: 0,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    maxHeight: 'calc(100vh - 160px)',
    position: 'sticky',
    top: 16,
  }

  // Empty state
  if (!imp) {
    return (
      <div style={{ ...panelStyle, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10, color: 'var(--text-faint)' }}>
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
  const pendingCount = Object.values(draftStates).filter(s => s === 'pending').length
  const approvedCount = Object.values(draftStates).filter(s => s === 'approved').length

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
            {meta.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="font-semibold truncate" style={{ color: 'var(--text)', fontSize: 13, margin: 0 }} title={label}>{label}</p>
            <p className="mono" style={{ color: 'var(--text-faint)', fontSize: 11, margin: 0 }}>
              {imp.file_type?.toUpperCase()} · {formatDate(imp.created_at)}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-pill)', background: status.bg, color: status.color, fontSize: 11.5, fontWeight: 600 }}>
            {status.label}
          </span>
          {imp.status === 'ready' && drafts.length > 0 && (
            <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
              {approvedCount}/{drafts.length} validées
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* En cours */}
        {IN_PROGRESS.has(imp.status) && (
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 8px' }}>Pipeline en cours…</p>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '45%', borderRadius: 2, background: imp.status === 'analyzing' ? 'var(--primary)' : 'var(--accent)', animation: 'cbprogress 1.6s ease-in-out infinite' }} />
            </div>
          </div>
        )}

        {/* Erreur */}
        {imp.status === 'error' && (
          <div style={{ background: 'var(--danger-soft)', border: '1px solid rgba(192,57,43,0.15)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
            <p style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>Erreur de traitement</p>
            {imp.error_message && (
              <p className="mono" style={{ color: 'var(--danger)', fontSize: 11.5, margin: 0, wordBreak: 'break-word' }}>{imp.error_message}</p>
            )}
          </div>
        )}

        {/* Chargement drafts */}
        {loadingDrafts && (
          <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', margin: '16px 0' }}>Chargement des drafts...</p>
        )}

        {/* Résumé validation */}
        {imp.status === 'ready' && !loadingDrafts && drafts.length > 0 && pendingCount > 0 && (
          <div style={{ background: 'var(--primary-soft)', border: '1px solid rgba(232,101,30,0.2)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 4 }}>
            <p style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 600, margin: 0 }}>
              {pendingCount} fiche{pendingCount > 1 ? 's' : ''} à valider
            </p>
          </div>
        )}

        {/* Drafts vides */}
        {imp.status === 'ready' && !loadingDrafts && drafts.length === 0 && (
          <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', margin: '16px 0' }}>Aucun draft pour cet import</p>
        )}

        {/* Validation cards */}
        {drafts.map(draft => (
          <ValidationCard
            key={draft.id}
            draft={draft}
            state={draftStates[draft.id] ?? 'pending'}
            isAdmin={isAdmin}
            onApprove={() => handleApprove(draft.id)}
            onReject={() => handleReject(draft.id)}
          />
        ))}
      </div>

      {/* Footer */}
      {imp.status === 'error' && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button
            onClick={() => onRetry(imp.id)}
            disabled={retrying.has(imp.id)}
            style={{
              width: '100%', padding: '8px 0', borderRadius: 'var(--radius)',
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text)', fontSize: 13.5, fontWeight: 500,
              cursor: retrying.has(imp.id) ? 'not-allowed' : 'pointer',
            }}
          >
            {retrying.has(imp.id) ? 'Relance...' : 'Relancer le pipeline'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
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
  const [isAdmin, setIsAdmin] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentMode = FILE_MODES.find(m => m.value === mode)!
  const selectedImport = imports.find(i => i.id === selectedId) ?? null

  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.role === 'admin') setIsAdmin(true)
    })
  }, [])

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
    setLoading(true); setError(null)
    const fd = new FormData()
    fd.append('file', file); fd.append('import_type', 'other')
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
    setLoading(true); setError(null)
    const res = await fetch('/api/imports/url', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: urlInput.trim(), import_type: 'webinar' }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Erreur'); window.cbToast(data.error ?? 'Erreur', 'error')
    } else {
      setUrlInput(''); window.cbToast('URL ajoutée à la file de traitement')
      setRefreshKey(k => k + 1)
    }
    setLoading(false)
  }

  async function retryImport(importId: string) {
    setRetrying(prev => new Set(prev).add(importId))
    const res = await fetch(`/api/imports/${importId}/process`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) window.cbToast(data.error ?? 'Erreur lors du relancement', 'error')
    else { window.cbToast('Pipeline relancé'); setRefreshKey(k => k + 1) }
    setRetrying(prev => { const s = new Set(prev); s.delete(importId); return s })
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDragOver(true) }
  function handleDragLeave(e: React.DragEvent) { e.preventDefault(); setDragOver(false) }
  async function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    if (e.dataTransfer.files[0]) await uploadFile(e.dataTransfer.files[0])
  }
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) await uploadFile(e.target.files[0])
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
      <div className="flex gap-2 mb-4">
        {FILE_MODES.map(m => (
          <button key={m.value} onClick={() => { setMode(m.value); setError(null) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 13px',
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
          role="button" tabIndex={0} aria-label="Zone de dépôt"
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
          style={{
            width: '100%', minHeight: 130, borderRadius: 'var(--radius-lg)',
            border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
            background: dragOver ? 'var(--primary-soft)' : 'var(--surface)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 6, cursor: 'pointer', marginBottom: 20,
            transition: 'border-color 0.15s ease, background 0.15s ease',
          }}
        >
          <span style={{ color: dragOver ? 'var(--primary)' : 'var(--text-faint)' }}><IconUpload size={24} /></span>
          <p className="font-medium" style={{ color: dragOver ? 'var(--primary)' : 'var(--text)', margin: 0, fontSize: 13.5 }}>
            {loading ? 'Envoi...' : `Glissez un fichier ${currentMode.label} ici`}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>
            ou cliquez pour parcourir{currentMode.accept && ` — ${currentMode.accept}`}
          </p>
          <input ref={fileInputRef} type="file" accept={currentMode.accept} onChange={handleFileChange} style={{ display: 'none' }} />
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 14, display: 'flex', gap: 10, marginBottom: 20 }}>
          <input type="url" className="cb-input" placeholder="https://youtube.com/watch?v=..."
            value={urlInput} onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addUrl()}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}
          />
          <button onClick={addUrl} disabled={loading || !urlInput.trim()}
            style={{
              padding: '8px 18px', borderRadius: 'var(--radius)',
              background: urlInput.trim() && !loading ? 'var(--primary)' : 'var(--border)',
              color: urlInput.trim() && !loading ? '#fff' : 'var(--text-muted)',
              border: 'none', fontWeight: 600, fontSize: 13.5,
              cursor: urlInput.trim() && !loading ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? '...' : 'Ajouter'}
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 13.5 }}>
          {error}
        </div>
      )}

      <p className="text-[13px] font-bold uppercase mb-3" style={{ color: 'var(--text-muted)', letterSpacing: '0.07em' }}>
        Imports récents
      </p>

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
                <div key={imp.id} onClick={() => setSelectedId(isSelected ? null : imp.id)}
                  style={{
                    background: 'var(--surface)',
                    border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius)', padding: '11px 14px',
                    display: 'flex', alignItems: 'center', gap: 11,
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 0 0 2px rgba(232,101,30,0.12)' : 'none',
                    transition: 'border-color 0.12s, box-shadow 0.12s',
                  }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
                    {meta.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="font-medium truncate" style={{ color: 'var(--text)', fontSize: 13.5, margin: 0 }} title={label}>{label}</p>
                    <p className="mono" style={{ color: 'var(--text-faint)', fontSize: 11.5, margin: 0 }}>
                      {imp.file_type?.toUpperCase()} · {formatDate(imp.created_at)}
                      {imp.fiches_count > 0 && ` · ${imp.fiches_count} fiche${imp.fiches_count > 1 ? 's' : ''}`}
                    </p>
                    <ProgressBar status={imp.status} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {imp.status === 'error' && (
                      <button onClick={e => { e.stopPropagation(); retryImport(imp.id) }}
                        disabled={retrying.has(imp.id)}
                        style={{ padding: '2px 9px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 11.5, cursor: retrying.has(imp.id) ? 'not-allowed' : 'pointer' }}
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
          <ImportPanel imp={selectedImport} onRetry={retryImport} retrying={retrying} isAdmin={isAdmin} />
        </div>
      )}
    </div>
  )
}
