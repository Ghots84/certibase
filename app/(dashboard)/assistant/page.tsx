'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

const TYPE_LABELS: Record<string, string> = {
  objection:       'Objection',
  guide_situation: 'Guide',
  cas_client:      'Cas client',
  concurrent:      'Concurrent',
  doc_certiplace:  'Doc',
  veille:          'Veille',
}

const SUGGESTIONS = [
  { icon: '⚙️', text: "Comment configurer l'espace candidat ?" },
  { icon: '💰', text: "Comment gérer l'objection sur le prix ?" },
  { icon: '🏆', text: 'Quelles sont les différences Standard / Premium ?' },
]

function IconBot({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2z" />
      <path d="M5 14v7h14v-7" />
      <path d="M9 18v2" />
      <path d="M15 18v2" />
      <circle cx="9" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function parseDraftBlocks(text: string): Array<{ type: 'text' | 'draft'; content: string }> {
  const parts: Array<{ type: 'text' | 'draft'; content: string }> = []
  const regex = /<draft>([\s\S]*?)<\/draft>/g
  let last = 0
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: 'text', content: text.slice(last, match.index) })
    parts.push({ type: 'draft', content: match[1].trim() })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) })
  return parts.length ? parts : [{ type: 'text', content: text }]
}

function DraftBlock({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderLeft: '3px solid var(--primary)',
      borderRadius: 'var(--radius)',
      padding: '12px 14px',
      margin: '8px 0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--primary)' }}>
          ✨ Brouillon de réponse
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(content)
            window.cbToast?.('Brouillon copié')
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          style={{
            padding: '3px 10px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: copied ? 'var(--success-soft)' : 'var(--surface)',
            color: copied ? 'var(--success)' : 'var(--text-faint)',
            fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
          }}
        >
          {copied ? '✓ Copié' : 'Copier'}
        </button>
      </div>
      <p style={{
        margin: 0, fontSize: 13.5, color: 'var(--text-muted)',
        fontStyle: 'italic', lineHeight: 1.65, whiteSpace: 'pre-wrap',
      }}>
        {content}
      </p>
    </div>
  )
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
      className="flex items-center gap-1 text-[11.5px] px-2.5 py-1 rounded-md transition-all"
      style={{
        background: copied ? 'var(--success-soft)' : 'transparent',
        border: '1px solid var(--border)',
        color: copied ? 'var(--success)' : 'var(--text-faint)',
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
      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11.5px]"
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
      <span
        className="mono text-[10px] px-1 rounded"
        style={{ background: 'var(--surface)', color: 'var(--text-faint)', border: '1px solid var(--border)' }}
      >
        {pct}%
      </span>
    </div>
  )
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="cb-fade-in flex justify-end">
      <div
        className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-[14px] max-w-[72%]"
        style={{ background: 'var(--primary)', color: '#fff', lineHeight: 1.6 }}
      >
        {text}
      </div>
    </div>
  )
}

function AssistantBubble({ msg }: { msg: Message }) {

  return (
    <div className="cb-fade-in flex justify-start">
      <div className="flex flex-col gap-2 max-w-[82%]">
        <div className="flex items-start gap-2.5">
          {/* Avatar */}
          <div
            className="flex items-center justify-center rounded-lg flex-shrink-0 mt-0.5"
            style={{ width: 32, height: 32, background: 'var(--primary-soft)', color: 'var(--primary)' }}
          >
            <IconBot />
          </div>

          {/* Bubble */}
          <div
            className="rounded-2xl rounded-tl-sm px-4 py-3 text-[14px] flex-1"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              lineHeight: 1.65,
            }}
          >
            {msg.loading && !msg.text ? (
              /* Dots — en attente du premier token */
              <div className="flex gap-1 items-center py-0.5">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="rounded-full"
                    style={{
                      width: 7,
                      height: 7,
                      background: 'var(--primary)',
                      opacity: 0.5,
                      animation: `cbbounce 1.2s ease-in-out ${i * 0.18}s infinite`,
                    }}
                  />
                ))}
              </div>
            ) : msg.loading ? (
              /* Streaming — afficher le texte brut, masquer les balises <draft> */
              <div className="prose-certibase cb-cursor">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.text.replace(/<\/?draft>/g, '')}
                </ReactMarkdown>
              </div>
            ) : (
              /* Terminé — parser et afficher les blocs draft */
              <div>
                {parseDraftBlocks(msg.text).map((part, i) =>
                  part.type === 'draft'
                    ? <DraftBlock key={i} content={part.content} />
                    : <div key={i} className="prose-certibase">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.content}</ReactMarkdown>
                      </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sources */}
        {msg.sources && msg.sources.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pl-[42px]">
            <span
              className="text-[10.5px] font-semibold uppercase"
              style={{ color: 'var(--text-faint)', letterSpacing: '0.07em' }}
            >
              Sources
            </span>
            {msg.sources.map(s => (
              <SourceChip key={s.id} source={s} />
            ))}
          </div>
        )}

        {/* Copy */}
        {!msg.loading && msg.text && (
          <div className="pl-[42px]">
            <CopyButton text={msg.text} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function AssistantPage() {
  const [firstName, setFirstName] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    async function loadUser() {
      const res = await fetch('/api/me')
      if (res.ok) {
        const me = await res.json()
        const name = (me.full_name ?? '').split(' ')[0] || me.email?.split('@')[0] || ''
        setFirstName(name)
      }
    }
    loadUser()
  }, [])

  useEffect(() => {
    async function loadHistory() {
      const res = await fetch('/api/chat/messages')
      if (res.ok) {
        const msgs = await res.json() as Array<{
          id: string; role: 'user' | 'assistant'; content: string
          sources?: Source[]; created_at: string
        }>
        setMessages(msgs.map(m => ({
          id: m.id,
          role: m.role,
          text: m.content,
          sources: m.sources ?? [],
          loading: false,
        })))
      }
      setHistoryLoaded(true)
    }
    loadHistory()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const resetInput = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
  }

  const sendMessage = useCallback(async (overrideText?: string) => {
    const question = (overrideText ?? input).trim()
    if (!question || loading) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text: question }
    const botId = crypto.randomUUID()
    const botMsg: Message = { id: botId, role: 'assistant', text: '', loading: true }

    setMessages(prev => [...prev, userMsg, botMsg])
    setInput('')
    resetInput()
    setLoading(true)

    try {
      const res = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalText = ''
      let finalSources: Source[] = []

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
              finalText += event.text as string
              setMessages(prev =>
                prev.map(m => m.id === botId ? { ...m, text: m.text + event.text, loading: true } : m)
              )
            } else if (event.type === 'sources') {
              finalSources = event.sources as Source[]
              setMessages(prev =>
                prev.map(m => m.id === botId ? { ...m, sources: event.sources } : m)
              )
            } else if (event.type === 'done') {
              setMessages(prev =>
                prev.map(m => m.id === botId ? { ...m, loading: false } : m)
              )
            } else if (event.type === 'error') {
              setMessages(prev =>
                prev.map(m =>
                  m.id === botId ? { ...m, text: `Erreur : ${event.message}`, loading: false } : m
                )
              )
            }
          } catch {
            // ligne non-JSON ignorée
          }
        }
      }

      // Sauvegarder l'échange en DB (fire-and-forget)
      fetch('/api/chat/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content: question }),
      }).catch(() => {})
      if (finalText) {
        fetch('/api/chat/messages', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'assistant', content: finalText, sources: finalSources }),
        }).catch(() => {})
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau'
      setMessages(prev =>
        prev.map(m => m.id === botId ? { ...m, text: `Erreur : ${msg}`, loading: false } : m)
      )
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading])

  const sendSuggestion = useCallback((text: string) => {
    sendMessage(text)
  }, [sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="cb-fade-in flex flex-col" style={{ height: '100%' }}>

      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-7 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <div>
          <h1 className="font-bold text-[17px]" style={{ color: 'var(--text)', letterSpacing: 'var(--head-spacing)' }}>
            Assistant CertiBase
          </h1>
          <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Réponses basées sur les fiches de connaissance indexées
          </p>
        </div>

        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); window.cbToast?.('Conversation réinitialisée') }}
            className="text-[12px] px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-faint)',
              cursor: 'pointer',
            }}
          >
            ↺ Réinitialiser
          </button>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto py-6" style={{ background: 'var(--bg)' }}>
        <div className="mx-auto px-6 flex flex-col gap-5" style={{ maxWidth: 720 }}>

          {/* Empty state — affiché uniquement quand l'historique est chargé */}
          {messages.length === 0 && historyLoaded && (
            <div className="flex flex-col items-center gap-4 pt-16 pb-8 text-center">
              <div
                className="flex items-center justify-center rounded-2xl"
                style={{
                  width: 64,
                  height: 64,
                  background: 'var(--primary-soft)',
                  color: 'var(--primary)',
                }}
              >
                <IconBot size={30} />
              </div>

              <div>
                <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text)' }}>
                  {firstName ? `Bonjour ${firstName} 👋` : 'Bonjour 👋'}
                </p>
                <p className="text-[13px] max-w-[380px]" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Posez votre question ou choisissez une suggestion ci-dessous.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2 mt-1">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s.text}
                    onClick={() => sendSuggestion(s.text)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12.5px] cb-shortcut"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span>{s.icon}</span>
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map(msg =>
            msg.role === 'user' ? (
              <UserBubble key={msg.id} text={msg.text} />
            ) : (
              <AssistantBubble key={msg.id} msg={msg} />
            )
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input ── */}
      <div
        className="flex-shrink-0 px-6 py-4"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <div className="mx-auto" style={{ maxWidth: 720 }}>
          <div
            className="flex items-end gap-3 rounded-xl px-4 py-2.5"
            style={{
              background: 'var(--surface-2)',
              border: `1px solid ${inputFocused ? 'var(--primary)' : 'var(--border-strong)'}`,
              boxShadow: inputFocused ? '0 0 0 3px rgba(232, 101, 30, 0.1)' : 'none',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Posez votre question… (Entrée ↵)"
              rows={1}
              disabled={loading}
              className="flex-1 resize-none bg-transparent outline-none text-[14px] py-1"
              style={{ color: 'var(--text)', lineHeight: 1.55, maxHeight: 120, overflow: 'auto' }}
              onInput={e => {
                const t = e.currentTarget
                t.style.height = 'auto'
                t.style.height = Math.min(t.scrollHeight, 120) + 'px'
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="flex items-center justify-center rounded-lg flex-shrink-0 mb-0.5 transition-all"
              style={{
                width: 38,
                height: 38,
                background: !input.trim() || loading ? 'var(--border)' : 'var(--primary)',
                color: !input.trim() || loading ? 'var(--text-faint)' : '#fff',
                border: 'none',
                cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
                transform: input.trim() && !loading ? 'scale(1)' : 'scale(0.95)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill="currentColor" />
              </svg>
            </button>
          </div>

          <p className="mono text-center text-[11px] mt-2" style={{ color: 'var(--text-faint)' }}>
            Maj+Entrée pour sauter une ligne
          </p>
        </div>
      </div>

      <style>{`
        .prose-certibase { font-size: 14px; line-height: 1.65; color: var(--text); }
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
        .prose-certibase code { background: var(--surface-2); padding: 2px 5px; border-radius: 4px; font-size: 12px; font-family: ui-monospace, monospace; }
        .prose-certibase blockquote { border-left: 3px solid var(--border-strong); padding-left: 0.75em; color: var(--text-muted); margin: 0.5em 0; }
        .prose-certibase a { color: var(--accent); text-decoration: underline; }
      `}</style>
    </div>
  )
}
