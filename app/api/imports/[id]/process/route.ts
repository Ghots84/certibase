import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ── YouTube helpers ──────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m?.[1] ?? null
}

async function fetchYouTubeCaptions(videoId: string): Promise<string> {
  for (const lang of ['fr', 'en']) {
    const res = await fetch(
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=xml`,
    )
    if (!res.ok) continue
    const xml = await res.text()
    if (!xml.trim()) continue

    // Parse <text start="..." dur="...">content</text>
    const lines = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
      .map(m => m[1].replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).trim())
      .filter(Boolean)

    if (lines.length > 0) return lines.join(' ')
  }
  throw new Error('Aucun sous-titre disponible pour cette vidéo YouTube')
}

// ── Extraction dispatch ──────────────────────────────────────────────────────

async function extractAudioVideo(filePath: string, originalName: string): Promise<string> {
  const admin = createAdminClient()
  const { data: blob, error } = await admin.storage
    .from('certibase-imports')
    .download(filePath)

  if (error || !blob) throw new Error(`Téléchargement Storage impossible : ${error?.message}`)

  const ext = originalName.split('.').pop()?.toLowerCase() ?? 'mp3'
  const mimeMap: Record<string, string> = {
    mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav',
    mp4: 'video/mp4', mov: 'video/quicktime',
  }
  const mime = mimeMap[ext] ?? 'audio/mpeg'

  const transcription = await openai.audio.transcriptions.create({
    file: new File([blob], originalName, { type: mime }),
    model: 'whisper-1',
    language: 'fr',
    response_format: 'text',
  })

  return transcription as unknown as string
}

async function extractPdf(filePath: string, originalName: string): Promise<string> {
  const admin = createAdminClient()
  const { data: blob, error } = await admin.storage
    .from('certibase-imports')
    .download(filePath)

  if (error || !blob) throw new Error(`Téléchargement Storage impossible : ${error?.message}`)

  const ext = originalName.split('.').pop()?.toLowerCase() ?? 'pdf'
  const mediaMime = ext === 'pptx'
    ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    : 'application/pdf'

  const base64 = Buffer.from(await blob.arrayBuffer()).toString('base64')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: mediaMime as 'application/pdf', data: base64 },
        },
        {
          type: 'text',
          text: 'Extrait intégralement le texte de ce document. Préserve la structure (titres, listes, tableaux). Retourne uniquement le texte brut, sans commentaire.',
        },
      ],
    }],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Réponse Claude inattendue')
  return block.text
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // Auth — accept both session cookie and internal header (fire-and-forget bypass)
  const isInternal = request.headers.get('x-internal-pipeline') === process.env.PIPELINE_SECRET
  let userId: string | null = null

  if (!isInternal) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })
    userId = user.id
  }

  const admin = createAdminClient()

  // Check admin role if called via session
  if (userId) {
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    if (profile?.role !== 'admin') {
      return Response.json({ error: 'forbidden' }, { status: 403 })
    }
  }

  // Load import record
  const { data: imp, error: fetchErr } = await admin
    .from('imports')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !imp) {
    return Response.json({ error: 'Import introuvable' }, { status: 404 })
  }

  // Already done — no re-run needed
  if (imp.status === 'ready') {
    return Response.json({ message: 'Import déjà traité' })
  }

  // Set extracting
  await admin.from('imports').update({ status: 'extracting', error_message: null }).eq('id', id)

  try {
    let transcription = ''

    if (imp.file_type === 'audio' || imp.file_type === 'video') {
      if (!imp.file_path) throw new Error('Chemin de fichier manquant')
      transcription = await extractAudioVideo(imp.file_path, imp.original_name ?? 'file')

    } else if (imp.file_type === 'pdf') {
      if (!imp.file_path) throw new Error('Chemin de fichier manquant')
      transcription = await extractPdf(imp.file_path, imp.original_name ?? 'file.pdf')

    } else if (imp.file_type === 'url') {
      if (!imp.file_url) throw new Error('URL manquante')
      const videoId = extractYouTubeId(imp.file_url)
      if (!videoId) throw new Error('URL YouTube invalide — impossible d\'extraire le videoId')
      transcription = await fetchYouTubeCaptions(videoId)

    } else {
      throw new Error(`Type d'import non supporté : ${imp.file_type}`)
    }

    await admin.from('imports').update({
      transcription,
      status: 'analyzing',
      error_message: null,
    }).eq('id', id)

    return Response.json({ success: true })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    await admin.from('imports').update({
      status: 'error',
      error_message: message,
    }).eq('id', id)

    return Response.json({ error: message }, { status: 500 })
  }
}
