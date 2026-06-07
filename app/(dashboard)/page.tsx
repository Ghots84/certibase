import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function getStats() {
  const admin = createAdminClient()
  const [fichesRes, draftsRes, importsRes] = await Promise.all([
    admin.from('fiches').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    admin.from('import_fiches_draft').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('imports').select('id', { count: 'exact', head: true }).in('status', ['pending', 'extracting', 'analyzing']),
  ])
  return {
    fiches: fichesRes.count ?? 0,
    drafts: draftsRes.count ?? 0,
    imports: importsRes.count ?? 0,
  }
}

export default async function OverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, role')
    .eq('id', user!.id)
    .single()

  const stats = await getStats()
  const firstName = profile?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'vous'

  const STAT_CARDS = [
    {
      label: 'Fiches validées',
      value: stats.fiches,
      sub: 'dans la base de connaissance',
      color: 'var(--success)',
    },
    {
      label: 'À valider',
      value: stats.drafts,
      sub: 'extractions en attente',
      color: stats.drafts > 0 ? 'var(--warning)' : 'var(--text-faint)',
    },
    {
      label: 'Angles morts',
      value: 0,
      sub: 'détectés par l\'IA',
      color: 'var(--primary)',
    },
    {
      label: 'Imports actifs',
      value: stats.imports,
      sub: 'dans le pipeline',
      color: 'var(--text-muted)',
    },
  ]

  const SHORTCUTS = [
    {
      href: '/fiches',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="6" rx="1.5" />
          <rect x="3" y="14" width="18" height="6" rx="1.5" />
        </svg>
      ),
      title: 'Base de connaissance',
      description: 'Parcourir, filtrer et gérer les fiches publiées',
    },
    {
      href: '/imports',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12" /><path d="M8 11l4 4 4-4" />
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
      ),
      title: 'Imports & validation',
      description: 'Importer du contenu et valider les drafts générés',
    },
    {
      href: '/assistant',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" />
        </svg>
      ),
      title: 'Assistant interne',
      description: 'Interroger la base en langage naturel avec sources citées',
    },
  ]

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      {/* Header */}
      <div
        className="px-7 py-5"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <h1 className="font-bold text-[18px]" style={{ color: 'var(--text)', letterSpacing: 'var(--head-spacing)' }}>
          Bonjour, {firstName}
        </h1>
        <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Vue d&apos;ensemble de CertiBase
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-6 flex flex-col gap-6">

        {/* Stat cards */}
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {STAT_CARDS.map(card => (
            <div
              key={card.label}
              className="rounded-xl px-5 py-4 flex flex-col gap-1"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>
                {card.label}
              </span>
              <span className="text-[28px] font-bold leading-none" style={{ color: card.color }}>
                {card.value}
              </span>
              <span className="text-[11.5px]" style={{ color: 'var(--text-faint)' }}>
                {card.sub}
              </span>
            </div>
          ))}
        </div>

        {/* Shortcut cards */}
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {SHORTCUTS.map(s => (
            <Link
              key={s.href}
              href={s.href}
              className="cb-shortcut rounded-xl px-5 py-5 flex flex-col gap-3 no-underline"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                className="flex items-center justify-center rounded-xl"
                style={{ width: 42, height: 42, background: 'var(--primary-soft, rgba(232,101,30,0.1))', color: 'var(--primary)' }}
              >
                {s.icon}
              </div>
              <div>
                <div className="font-semibold text-[14px]" style={{ color: 'var(--text)' }}>{s.title}</div>
                <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.description}</div>
              </div>
              <span className="text-[12.5px] font-medium" style={{ color: 'var(--primary)' }}>
                Ouvrir →
              </span>
            </Link>
          ))}
        </div>

        {/* Principe directeur */}
        <div
          className="rounded-xl px-6 py-5 flex items-start gap-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div
            className="flex items-center justify-center rounded-lg flex-shrink-0"
            style={{ width: 36, height: 36, background: 'var(--primary-soft, rgba(232,101,30,0.1))', color: 'var(--primary)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-[13.5px] mb-1" style={{ color: 'var(--text)' }}>
              Principe directeur
            </div>
            <p className="text-[13px]" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
              20 fiches parfaitement structurées valent mieux que 200 pages de documentation mal indexées.
              Chaque fiche doit être autonome, actionnable et directement utilisable par les agents.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
