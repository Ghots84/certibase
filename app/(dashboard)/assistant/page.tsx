'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Profil = 'csm' | 'sales' | 'all'

type Source = {
  id: string
  title: string
  type: string
  similarity: number
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  text: string
  sources?: Source[]
  loading?: boolean
}

const PROFILS: { value: Profil; label: string; color: string }[] = [
  { value: 'csm',   label: 'CSM',   color: '#2D7DD2' },
  { value: 'sales', label: 'Sales', color: '#E8651E' },
  { value: 'all',   label: 'Tous',  color: '#5B6675' },
]

const TYPE_LABELS: Record<string, string> = {
  objection:       'Objection',
  guide_situation: 'Guide',
  cas_client:      'Cas client',
  concurrent:      'Concurrent',
  doc_certiplace:  'Doc',
  veille:          'Veille',
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="flex items-center gap-1 text-[11.5px] px-2 py-1 rounded transition-all"
      style={{
        background: 'transparent',
        border: '1px solid var(--border)',
        color: 'var(--text-faint)',
        cursor: 'pointer',
      }}
    >
      {copied ? '✓ Copié' : 'Copier'}
    </button>
  )
}

function SourceChip({ source }: { source: Source }) {
  const pct = Math.round(source.similarity * 100)
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded text-[11.5px]"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        color: 'var(--text-muted)',
        whiteSpace: 'nowrap',
      }}
      title={source.title}
    >
      <span
        className="rounded px-1 font-medium"
        style={{ background: 'var(--accent-soft)', color: 'var(--accent-soft-text)', fontSize: 10 }}
      >
        {TYPE_LABELS[source.type] ?? source.type}
      </span>
      <span className="truncate max-w-[140px]">{source.title}</span>
      <span className="mono" style={{ color: 'var(--text-faint)' }}>{pct}%</span>
    </div>
  )
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div
        className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-[14px] max-w-[70%]"
        style={{ background: 'var(--primary)', color: '#fff', lineHeight: 1.55 }}
      >
        {text}
      </div>
    </div>
  )
}

function AssistantBubble({ msg }: { msg: Message }) {
  return (
    <div className="flex justify-start">
      <div className="flex flex-col gap-2 max-w-[80%]">
        <div className="flex items-start gap-2">
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0 text-white text-[10px] font-bold mt-0.5"
            style={{ width: 26, height: 26, background: 'var(--primary)' }}
          >
            CB
          </div>
          <div
            className="rounded-2xl rounded-tl-sm px-4 py-2.5 text-[14px] flex-1"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              lineHeight: 1.6,
              minHeight: msg.loading ? 36 : undefined,
            }}
          >
            {msg.loading && !msg.text ? (
              <div className="flex gap-1 items-center py-1">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="rounded-full"
                    style={{
                      width: 6,
                      height: 6,
                      background: 'var(--text-faint)',
                      animation: `cbpulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="prose-certibase">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.text}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        {msg.sources && msg.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-[34px]">
            {msg.sources.map(s => (
              <SourceChip key={s.id} source={s} />
            ))}
          </div>
        )}

        {!msg.loading && msg.text && (
          <div className="pl-[34px]">
            <CopyButton text={msg.text} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function AssistantPage() {
  const [profil, setProfil] = useState<Profil>('all')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    const question = input.trim()
    if (!question || loading) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text: question,
    }
    const botId = crypto.randomUUID()
    const botMsg: Message = {
      id: botId,
      role: 'assistant',
      text: '',
      loading: true,
    }

    setMessages(prev => [...prev, userMsg, botMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, profil }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'text') {
              setMessages(prev =>
                prev.map(m =>
                  m.id === botId ? { ...m, text: m.text + event.text, loading: true } : m
                )
              )
            } else if (event.type === 'sources') {
              setMessages(prev =>
                prev.map(m =>
                  m.id === botId ? { ...m, sources: event.sources } : m
                )
              )
            } else if (event.type === 'done') {
              setMessages(prev =>
                prev.map(m =>
                  m.id === botId ? { ...m, loading: false } : m
                )
              )
            } else if (event.type === 'error') {
              setMessages(prev =>
                prev.map(m =>
                  m.id === botId
                    ? { ...m, text: `Erreur : ${event.message}`, loading: false }
                    : m
                )
              )
            }
          } catch {
            // ligne non-JSON, ignorée
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau'
      setMessages(prev =>
        prev.map(m =>
          m.id === botId ? { ...m, text: `Erreur : ${msg}`, loading: false } : m
        )
      )
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, loading, profil])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
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
            Assistant CertiBase
          </h1>
          <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Réponses basées sur les fiches de connaissance indexées
          </p>
        </div>

        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="text-[12px] px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              Nouvelle conversation
            </button>
          )}

          {/* Profile picker */}
          <div
            className="flex items-center gap-1.5 p-1 rounded-lg"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            {PROFILS.map(p => (
              <button
                key={p.value}
                onClick={() => setProfil(p.value)}
                className="px-3 py-1.5 rounded-md text-[12.5px] font-semibold transition-all"
                style={{
                  background: profil === p.value ? p.color : 'transparent',
                  color: profil === p.value ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-7 py-5 flex flex-col gap-4">
        {messages.length === 0 && (
          <div
            className="flex flex-col items-center justify-center h-full gap-3 text-center"
            style={{ color: 'var(--text-faint)' }}
          >
            <div
              className="flex items-center justify-center rounded-full text-white font-bold text-xl"
              style={{ width: 52, height: 52, background: 'var(--primary)', opacity: 0.8 }}
            >
              CB
            </div>
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-muted)' }}>
              Comment puis-je vous aider ?
            </p>
            <p className="text-[12.5px] max-w-[400px]">
              Posez vos questions sur les offres CertiPlace, les objections clients, les cas d&apos;usage ou la configuration.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {[
                'Quelles sont les différences Standard / Premium ?',
                "Comment gérer l'objection sur le prix ?",
                "Comment configurer l'espace candidat ?",
              ].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus() }}
                  className="px-3 py-1.5 rounded-lg text-[12.5px] transition-all"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg =>
          msg.role === 'user' ? (
            <UserBubble key={msg.id} text={msg.text} />
          ) : (
            <AssistantBubble key={msg.id} msg={msg} />
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        className="px-7 py-4"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <div
          className="flex items-end gap-3 rounded-xl px-4 py-2"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)' }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez votre question… (Entrée pour envoyer, Maj+Entrée pour sauter une ligne)"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none bg-transparent outline-none text-[14px] py-1.5"
            style={{ color: 'var(--text)', lineHeight: 1.5, maxHeight: 120, overflow: 'auto' }}
            onInput={e => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="flex items-center justify-center rounded-lg flex-shrink-0 mb-0.5 transition-all"
            style={{
              width: 34,
              height: 34,
              background: !input.trim() || loading ? 'var(--border)' : 'var(--primary)',
              color: !input.trim() || loading ? 'var(--text-faint)' : '#fff',
              border: 'none',
              cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill="currentColor" />
            </svg>
          </button>
        </div>
        <p className="text-center text-[11px] mt-2" style={{ color: 'var(--text-faint)' }}>
          Profil actif : <strong>{PROFILS.find(p => p.value === profil)?.label}</strong>
          {' · '}Réponses fondées sur les fiches CertiBase uniquement
        </p>
      </div>

      <style>{`
        @keyframes cbpulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        .prose-certibase { font-size: 14px; line-height: 1.6; color: var(--text); }
        .prose-certibase p { margin: 0 0 0.75em; }
        .prose-certibase p:last-child { margin-bottom: 0; }
        .prose-certibase strong { font-weight: 600; }
        .prose-certibase table { border-collapse: collapse; width: 100%; font-size: 13px; margin: 0.5em 0; }
        .prose-certibase th, .prose-certibase td { border: 1px solid var(--border); padding: 6px 10px; text-align: left; }
        .prose-certibase th { background: var(--surface-2); font-weight: 600; }
        .prose-certibase ul, .prose-certibase ol { padding-left: 1.4em; margin: 0.4em 0; }
        .prose-certibase li { margin-bottom: 0.2em; }
        .prose-certibase h2, .prose-certibase h3 { font-weight: 600; margin: 0.8em 0 0.4em; color: var(--text); }
        .prose-certibase h2 { font-size: 15px; }
        .prose-certibase h3 { font-size: 13.5px; }
        .prose-certibase code { background: var(--surface-2); padding: 2px 5px; border-radius: 4px; font-size: 12px; }
        .prose-certibase blockquote { border-left: 3px solid var(--border-strong); padding-left: 0.75em; color: var(--text-muted); margin: 0.5em 0; }
      `}</style>
    </div>
  )
}
