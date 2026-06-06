// Edge Function: generate-embedding
// Déclenché via Database Webhook Supabase sur INSERT/UPDATE de fiches (status = published)
// Génère l'embedding text-embedding-3-small (1536D) via OpenAI API
// Runtime: Deno (Supabase Edge Functions)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const record = payload?.record

    // Ne traiter que les fiches publiées avec du contenu
    if (!record?.content || record?.status !== 'published') {
      return new Response(
        JSON.stringify({ message: 'skipped: not published or no content' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ne pas régénérer si embedding déjà présent (optimisation)
    if (record?.embedding && payload?.type === 'UPDATE') {
      const oldRecord = payload?.old_record
      if (oldRecord?.content === record.content && oldRecord?.status === record.status) {
        return new Response(
          JSON.stringify({ message: 'skipped: content unchanged' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Appel OpenAI text-embedding-3-small
    const openaiResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: record.content,
        model: 'text-embedding-3-small',
      }),
    })

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text()
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${error}`)
    }

    const openaiData = await openaiResponse.json()
    const embedding: number[] = openaiData.data[0].embedding

    // Mise à jour de l'embedding dans Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error: updateError } = await supabase
      .from('fiches')
      .update({ embedding })
      .eq('id', record.id)

    if (updateError) {
      throw new Error(`Supabase update error: ${updateError.message}`)
    }

    return new Response(
      JSON.stringify({ message: 'embedding generated', fiche_id: record.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('generate-embedding error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
