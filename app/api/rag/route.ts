import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { MatchDocumentResult } from '@/lib/supabase/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function POST(request: Request) {
  const { question } = await request.json()

  if (!question?.trim()) {
    return Response.json({ error: 'question required' }, { status: 400 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const send = (data: unknown) =>
        controller.enqueue(encoder.encode(sseEvent(data)))

      try {
        // 1. Embed the question
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: question,
        })
        const queryEmbedding = embeddingResponse.data[0].embedding

        // 2. Retrieve relevant fiches via pgvector
        const supabase = await createClient()
        const { data: fiches, error } = await supabase.rpc('match_documents', {
          query_embedding: `[${queryEmbedding.join(',')}]`,
          match_threshold: 0.35,
          match_count: 5,
          profile_filter: 'all',
        })

        if (error) throw new Error(`match_documents error: ${error.message}`)

        const results: MatchDocumentResult[] = fiches ?? []

        // Détecter les angles morts : aucune fiche satisfaisante (similarity < 0.75)
        const maxSimilarity = results.length > 0
          ? Math.max(...results.map(r => r.similarity))
          : 0
        if (maxSimilarity < 0.75) {
          // Fire-and-forget — ne jamais bloquer le stream SSE
          createAdminClient()
            .from('import_fiches_draft')
            .insert({
              import_id: null,
              type: 'missing_info',
              title: question.slice(0, 500),
              content: question,
              confidence: 0,
              canal_source: 'assistant',
              status: 'pending',
            })
            .then()
        }

        if (results.length === 0) {
          send({
            type: 'text',
            text: `Aucune fiche pertinente trouvée.\n\nSuggestions :\n- Reformulez avec des termes métier (ex : "CDC", "accrochage", "offre Premium")\n- Si le sujet est récent, la fiche n'est peut-être pas encore indexée`,
          })
          send({ type: 'sources', sources: [] })
          send({ type: 'done' })
          controller.close()
          return
        }

        // 3. Build context from retrieved fiches
        const context = results
          .map(
            (f, i) =>
              `### Fiche ${i + 1} [TYPE: ${f.type.toUpperCase()}, PROFIL: ${f.profil_cible}, PERTINENCE: ${(f.similarity * 100).toFixed(0)}%]\n**Titre :** ${f.title}\n${f.content}`
          )
          .join('\n\n---\n\n')

        const systemPrompt = `Tu es l'assistant IA interne de CertiBase, spécialisé dans la certification professionnelle RNCP.
Tu réponds aux équipes CSM et Sales en t'appuyant EXCLUSIVEMENT sur les fiches de connaissance fournies.

Règles de réponse :
- Si la question porte sur une objection client, structure ta réponse en : réponse flash → arguments → reformulation.
- Si la question porte sur un guide situation (TYPE: GUIDE_SITUATION), donne des étapes numérotées et des messages types.
- Si la question cite un concurrent ou compare des offres, appuie-toi sur les fiches de type CONCURRENT et DOC_CERTIPLACE.
- Si la question inclut un cas client réel, cite les chiffres exacts de la fiche (TYPE: CAS_CLIENT).
- Sois direct et actionnable. Évite les formules vagues.
- Si l'utilisateur demande de rédiger un email, un brouillon, une réponse client ou un script, entoure UNIQUEMENT le contenu rédigé avec les balises <draft> et </draft>. Le reste de ta réponse (explication, contexte) reste en dehors des balises.
- Si aucune fiche ne couvre la question, réponds : "Je n'ai pas de fiche sur ce sujet. Essayez de reformuler ou contactez l'équipe Produit."
- Réponds en français. Utilise le markdown (titres ##, listes, **gras**, tableaux) pour structurer quand c'est utile.

## Fiches de connaissance (triées par pertinence) :

${context}`

        // 4. Stream Claude's response
        const claudeStream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: question }],
        })

        for await (const event of claudeStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            send({ type: 'text', text: event.delta.text })
          }
        }

        // 5. Send sources and close
        send({
          type: 'sources',
          sources: results.map((f) => ({
            id: f.id,
            title: f.title,
            type: f.type,
            similarity: f.similarity,
          })),
        })
        send({ type: 'done' })
        controller.close()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue'
        send({ type: 'error', message })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
