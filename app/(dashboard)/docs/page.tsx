export const metadata = { title: 'Documentation API — CertiBase' }

const BASE = 'https://fks9nne2cukvhooub7j722o3.161.97.84.193.sslip.io'

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

const METHOD_COLORS: Record<Method, string> = {
  GET:    '#2D7DD2',
  POST:   '#1a9e5c',
  PATCH:  '#E8651E',
  DELETE: '#c0392b',
}

function Badge({ method }: { method: Method }) {
  return (
    <span
      className="mono text-[11px] font-bold px-2 py-0.5 rounded"
      style={{ background: METHOD_COLORS[method] + '22', color: METHOD_COLORS[method] }}
    >
      {method}
    </span>
  )
}

function Code({ children }: { children: string }) {
  return (
    <pre
      className="mono text-[12.5px] rounded-lg overflow-x-auto"
      style={{
        background: 'var(--surface-raised, rgba(0,0,0,0.18))',
        border: '1px solid var(--border)',
        padding: '14px 16px',
        lineHeight: 1.6,
        whiteSpace: 'pre',
      }}
    >
      {children}
    </pre>
  )
}

function Endpoint({
  method,
  path,
  description,
  auth = true,
  adminOnly = false,
  request,
  response,
  note,
}: {
  method: Method
  path: string
  description: string
  auth?: boolean
  adminOnly?: boolean
  request?: string
  response: string
  note?: string
}) {
  return (
    <div
      className="rounded-xl p-5 mb-4"
      style={{ border: '1px solid var(--border)', background: 'var(--surface-raised, rgba(255,255,255,0.03))' }}
    >
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <Badge method={method} />
        <code className="mono text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          {path}
        </code>
        {adminOnly && (
          <span
            className="text-[10.5px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: '#7A5AF822', color: '#7A5AF8' }}
          >
            admin
          </span>
        )}
      </div>
      <p className="text-[13.5px] mb-3" style={{ color: 'var(--text-secondary)' }}>
        {description}
        {auth && !adminOnly && (
          <span className="ml-2 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            · Auth requise (cookie session)
          </span>
        )}
        {adminOnly && (
          <span className="ml-2 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            · Role admin uniquement
          </span>
        )}
      </p>
      {note && (
        <p className="text-[12.5px] mb-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(45,125,210,0.1)', color: '#2D7DD2', borderLeft: '3px solid #2D7DD2' }}>
          {note}
        </p>
      )}
      {request && (
        <div className="mb-3">
          <p className="text-[11.5px] uppercase font-bold mb-1.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.07em' }}>
            Request body
          </p>
          <Code>{request}</Code>
        </div>
      )}
      <div>
        <p className="text-[11.5px] uppercase font-bold mb-1.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.07em' }}>
          Response
        </p>
        <Code>{response}</Code>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2
        className="text-[15px] font-bold mb-4 pb-2"
        style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

export default function DocsPage() {
  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-[26px] font-extrabold mb-2"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
        >
          Documentation API
        </h1>
        <p className="text-[14px] mb-4" style={{ color: 'var(--text-secondary)' }}>
          API REST interne de CertiBase. Toutes les routes nécessitent une session utilisateur active (cookie <code className="mono">sb-*</code>).
        </p>
        <div
          className="flex items-center gap-2 mono text-[12.5px] px-3 py-2 rounded-lg"
          style={{ background: 'var(--surface-raised, rgba(0,0,0,0.12))', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          <span style={{ color: 'var(--text-muted)' }}>Base URL</span>
          <span>{BASE}</span>
        </div>
      </div>

      {/* Authentication */}
      <Section title="Authentification">
        <div
          className="rounded-xl p-5 text-[13.5px]"
          style={{ border: '1px solid var(--border)', background: 'var(--surface-raised, rgba(255,255,255,0.03))', color: 'var(--text-secondary)', lineHeight: 1.7 }}
        >
          <p className="mb-3">
            L&apos;API utilise les cookies Supabase (<code className="mono">sb-*</code>) injectés automatiquement par le navigateur.
            Pour des appels serveur-à-serveur, passez le token JWT dans le header :
          </p>
          <Code>{`Authorization: Bearer <supabase_jwt_token>`}</Code>
          <p className="mt-3 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            Les routes marquées <strong>admin</strong> vérifient en plus que le profil a le rôle <code className="mono">admin</code>.
          </p>
        </div>
      </Section>

      {/* RAG */}
      <Section title="Assistant RAG">
        <Endpoint
          method="POST"
          path="/api/rag"
          description="Interroge la base de connaissance via RAG (Retrieval-Augmented Generation). Réponse en streaming SSE."
          note="La réponse est un stream Server-Sent Events. Chaque ligne est un objet JSON préfixé data: "
          request={`{
  "question": "Comment répondre à l'objection sur le prix ?"
}`}
          response={`// Événements SSE successifs :
data: {"type":"text","text":"Voici comment répondre..."}
data: {"type":"text","text":" à cette objection"}
data: {"type":"sources","sources":[{"id":"uuid","title":"Objection prix","type":"objection","similarity":0.91}]}
data: {"type":"done"}

// En cas d'erreur :
data: {"type":"error","message":"..."}`}
        />

        <Endpoint
          method="GET"
          path="/api/chat/messages"
          description="Récupère l'historique des messages de l'assistant pour l'utilisateur connecté."
          response={`[
  {
    "id": "uuid",
    "user_id": "uuid",
    "role": "user",          // "user" | "assistant"
    "content": "Comment...",
    "created_at": "2026-07-09T10:00:00Z"
  }
]`}
        />

        <Endpoint
          method="POST"
          path="/api/chat/messages"
          description="Sauvegarde un message dans l'historique de l'assistant."
          request={`{
  "role": "user",       // "user" | "assistant"
  "content": "..."
}`}
          response={`{
  "id": "uuid",
  "user_id": "uuid",
  "role": "user",
  "content": "...",
  "created_at": "2026-07-09T10:00:00Z"
}`}
        />
      </Section>

      {/* Fiches */}
      <Section title="Fiches">
        <Endpoint
          method="GET"
          path="/api/fiches"
          description="Liste les fiches publiées. Avec ?include_drafts=1, inclut aussi les brouillons (admin uniquement)."
          response={`[
  {
    "id": "uuid",
    "type": "objection",     // objection | guide_situation | cas_client | concurrent
                             // doc_certiplace | veille | support
    "title": "Objection sur le prix",
    "content": "...",
    "status": "published",   // draft | published | archived
    "profil_cible": "all",   // all | csm | sales | csm_sales
    "confidence_threshold": 0.75,
    "source": "manual",      // manual | webinar | presentation | sales_call | doc | n8n
    "created_at": "2026-07-09T10:00:00Z"
  }
]`}
        />

        <Endpoint
          method="POST"
          path="/api/fiches"
          description="Crée une fiche manuellement. Créée en statut draft."
          adminOnly
          request={`{
  "title": "Réponse à l'objection prix",
  "type": "objection",        // objection | guide_situation | cas_client | concurrent
                              // doc_certiplace | veille | support
  "content": "...",
  "profil_cible": "all"       // all | csm | sales | csm_sales — optionnel, défaut: "all"
}`}
          response={`// 201 Created
{
  "id": "uuid",
  "type": "objection",
  "title": "Réponse à l'objection prix",
  "content": "...",
  "status": "draft",
  "profil_cible": "all",
  "confidence_threshold": 0.75,
  "source": "manual",
  "created_at": "2026-07-09T10:00:00Z"
}`}
        />

        <Endpoint
          method="PATCH"
          path="/api/fiches/[id]"
          description="Met à jour une fiche (contenu, statut, profil cible…). Tous les champs sont optionnels."
          adminOnly
          request={`{
  "title": "Nouveau titre",         // optionnel
  "content": "...",                 // optionnel
  "status": "published",            // optionnel: draft | published | archived
  "profil_cible": "csm",            // optionnel
  "confidence_threshold": 0.8       // optionnel
}`}
          response={`{
  "id": "uuid",
  "type": "objection",
  "title": "Nouveau titre",
  "content": "...",
  "status": "published",
  "profil_cible": "csm",
  "confidence_threshold": 0.8,
  "created_at": "2026-07-09T10:00:00Z"
}`}
        />
      </Section>

      {/* Concurrents (n8n) */}
      <Section title="Concurrents (n8n)">
        <Endpoint
          method="POST"
          path="/api/ingest/concurrents"
          description="Ingère les données de veille concurrentielle (prix + alertes) produites par le workflow n8n de scraping. Crée/actualise des fiches type=concurrent (une par offre) et type=veille (une par changement détecté), publiées automatiquement."
          auth={false}
          note="Authentification via header x-api-key (variable N8N_INGEST_API_KEY) — pas de session Supabase, cette route est exemptée du middleware d'auth pour permettre l'appel serveur-à-serveur depuis n8n."
          request={`// Header
x-api-key: <N8N_INGEST_API_KEY>

// Body — sortie brute du nœud "JS comparaison de tarif" du workflow n8n
{
  "tous_les_items": [
    { "concurrent": "Procertif", "abo": "Impact", "prix": 110, "fonctionnalites": ["Accès cours", "Certificat"] },
    { "concurrent": "Nous",      "abo": "Premium", "prix": 149, "fonctionnalites": ["CSM dédiée", "API incluse"] }
  ],
  "alertes": [
    { "concurrent": "Procertif", "abo": "Impact", "prix_avant": 120, "prix_apres": 110, "delta": "-10.00", "pct": -8.3, "direction": "baisse" }
  ],
  "alertes_fonctions": [
    { "concurrent": "Digiforma", "abo": "Basic", "ajouts": ["Signature électronique"], "suppressions": [] }
  ],
  "premiere_execution": false
}`}
          response={`{
  "ok": true,
  "snapshots_upserted": 2,
  "alerts_created": 2
}`}
        />

        <Endpoint
          method="POST"
          path="/api/ingest/argumentaire"
          description="Ingère l'argumentaire commercial généré par le nœud n8n 'AI Agent' (accroche, meilleurs arguments par concurrent, objections-réponses, cibles prioritaires). Archive l'argumentaire précédent puis crée la nouvelle fiche type=objection, publiée automatiquement — affichée en tête de la page Espace concurrent. Une seule fiche active à la fois, pas d'accumulation au fil des exécutions."
          auth={false}
          note="Authentification via header x-api-key (variable N8N_INGEST_API_KEY), même mécanisme que /api/ingest/concurrents."
          request={`// Header
x-api-key: <N8N_INGEST_API_KEY>

// Body — sortie brute du nœud "AI Agent" du workflow n8n
{
  "argumentaire": "🎯 Accroche commerciale...\\n\\n💪 Nos 3 meilleurs arguments...\\n\\n❓ Objections → réponses..."
}`}
          response={`{
  "ok": true,
  "id": "uuid"
}`}
        />
      </Section>

      {/* Imports */}
      <Section title="Imports">
        <Endpoint
          method="GET"
          path="/api/imports"
          description="Liste les imports de l'utilisateur connecté, triés par date décroissante."
          response={`[
  {
    "id": "uuid",
    "file_type": "audio",   // audio | video | pdf | url
    "import_type": "webinar", // webinar | presentation | sales_call | internal_doc | other
    "original_name": "reunion.mp3",
    "file_url": null,
    "status": "ready",      // pending | extracting | analyzing | ready | error
    "fiches_count": 12,
    "error_message": null,
    "created_at": "2026-07-09T10:00:00Z"
  }
]`}
        />

        <Endpoint
          method="POST"
          path="/api/imports/upload"
          description="Upload un fichier (audio, vidéo, PDF ou PPTX) via multipart/form-data. Le pipeline RAG démarre en arrière-plan."
          note="Formats acceptés : mp3, m4a, wav, mp4, mov, pdf, pptx. La taille max dépend du plan Supabase (50 MB par défaut)."
          request={`// Content-Type: multipart/form-data
file        File      // fichier à uploader
import_type string    // webinar | presentation | sales_call | internal_doc | other`}
          response={`// 200 OK — l'import est créé, le traitement démarre en arrière-plan
{
  "id": "uuid",
  "file_type": "audio",
  "import_type": "webinar",
  "original_name": "reunion.mp3",
  "status": "pending",
  "fiches_count": 0,
  "created_at": "2026-07-09T10:00:00Z"
}

// Polling recommandé sur GET /api/imports/[id] jusqu'à status === "ready"`}
        />

        <Endpoint
          method="POST"
          path="/api/imports/url"
          description="Importe une page web ou une vidéo YouTube via son URL. Le pipeline RAG démarre en arrière-plan."
          note="YouTube → extraction des sous-titres. Autre URL https:// → scraping via Jina.ai Reader (markdown propre)."
          request={`{
  "url": "https://doc.certiplace.fr/guide-cdc",
  "import_type": "internal_doc"  // webinar | presentation | sales_call | internal_doc | other
}`}
          response={`{
  "id": "uuid",
  "file_type": "url",
  "import_type": "internal_doc",
  "file_url": "https://doc.certiplace.fr/guide-cdc",
  "status": "pending",
  "fiches_count": 0,
  "created_at": "2026-07-09T10:00:00Z"
}`}
        />

        <Endpoint
          method="GET"
          path="/api/imports/[id]"
          description="Récupère le statut d'un import spécifique. Utile pour le polling."
          response={`{
  "id": "uuid",
  "status": "ready",       // pending | extracting | analyzing | ready | error
  "fiches_count": 12,
  "error_message": null,
  "transcription": "..."   // texte extrait, disponible une fois status === "ready"
}`}
        />
      </Section>

      {/* Misc */}
      <Section title="Utilitaires">
        <Endpoint
          method="GET"
          path="/api/me"
          description="Retourne le profil de l'utilisateur connecté."
          response={`{
  "id": "uuid",
  "email": "user@certiplace.fr",
  "full_name": "Marie Dupont",
  "role": "csm",            // admin | csm | sales
  "avatar_initials": "MD",
  "created_at": "2026-07-09T10:00:00Z"
}`}
        />

        <Endpoint
          method="GET"
          path="/api/notifications"
          description="Retourne les notifications non lues de l'utilisateur connecté."
          response={`[
  {
    "id": "uuid",
    "type": "import_ready",
    "message": "Import \"reunion.mp3\" terminé — 12 fiches générées",
    "read": false,
    "created_at": "2026-07-09T10:00:00Z"
  }
]`}
        />

        <Endpoint
          method="GET"
          path="/api/blindspots"
          description="Retourne les questions sans fiche satisfaisante, détectées automatiquement par l'assistant."
          adminOnly
          response={`[
  {
    "id": "uuid",
    "title": "Quelle est la durée minimale d'une VAE ?",
    "content": "...",
    "status": "pending",   // pending | processed | ignored
    "created_at": "2026-07-09T10:00:00Z"
  }
]`}
        />
      </Section>

      {/* Error format */}
      <Section title="Format des erreurs">
        <div
          className="rounded-xl p-5 text-[13.5px]"
          style={{ border: '1px solid var(--border)', background: 'var(--surface-raised, rgba(255,255,255,0.03))', color: 'var(--text-secondary)', lineHeight: 1.7 }}
        >
          <p className="mb-3">Toutes les erreurs retournent un JSON avec une clé <code className="mono">error</code>&nbsp;:</p>
          <Code>{`// 400 Bad Request
{ "error": "title, type et content sont requis" }

// 401 Unauthorized
{ "error": "unauthorized" }

// 403 Forbidden
{ "error": "forbidden" }

// 500 Internal Server Error
{ "error": "message d'erreur technique" }`}</Code>
        </div>
      </Section>

      {/* Example curl */}
      <Section title="Exemple complet — appel RAG">
        <Code>{`# 1. Interroger l'assistant (streaming SSE)
curl -N -X POST ${BASE}/api/rag \\
  -H "Content-Type: application/json" \\
  -H "Cookie: <cookie sb-*>" \\
  -d '{"question":"Comment répondre à l\\'objection sur le délai de certification ?"}'

# 2. Importer une page de documentation
curl -X POST ${BASE}/api/imports/url \\
  -H "Content-Type: application/json" \\
  -H "Cookie: <cookie sb-*>" \\
  -d '{"url":"https://doc.certiplace.fr/guide-cdc","import_type":"internal_doc"}'

# 3. Vérifier que l'import est terminé
curl ${BASE}/api/imports/<id> \\
  -H "Cookie: <cookie sb-*>"
# → {"status":"ready","fiches_count":8,...}`}</Code>
      </Section>
    </div>
  )
}
