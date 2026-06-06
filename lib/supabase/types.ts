// Types TypeScript pour les tables Supabase CertiBase
// Synchronisé avec les migrations SQL (supabase/migrations/)

export type UserRole = 'admin' | 'csm' | 'sales' | 'new'
export type ImportFileType = 'audio' | 'video' | 'pdf' | 'url'
export type ImportType = 'webinar' | 'presentation' | 'sales_call' | 'internal_doc' | 'other'
export type ImportStatus = 'pending' | 'extracting' | 'analyzing' | 'ready' | 'error'
export type ProfilCible = 'csm' | 'sales' | 'new' | 'all' | 'csm_sales'
export type FicheType = 'objection' | 'guide_situation' | 'cas_client' | 'concurrent' | 'doc_certiplace' | 'veille'
export type FicheSource = 'manual' | 'webinar' | 'presentation' | 'sales_call' | 'doc' | 'n8n'
export type FicheStatus = 'draft' | 'published' | 'archived'
export type DraftType = 'objection' | 'guide_situation' | 'cas_client' | 'concurrent' | 'missing_info'
export type DraftStatus = 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_initials: string | null
  created_at: string
}

export interface Tenant {
  id: string
  name: string
  certiplace_client_id: string | null
  agent_name: string
  primary_color: string
  logo_url: string | null
  csm_agent_active: boolean
  sales_agent_active: boolean
  created_at: string
}

export interface Import {
  id: string
  uploaded_by: string | null
  file_type: ImportFileType | null
  import_type: ImportType | null
  file_path: string | null
  file_url: string | null
  original_name: string | null
  title: string | null
  profil_cible: ProfilCible | null
  duration_sec: number | null
  total_pages: number | null
  transcription: string | null
  status: ImportStatus
  error_message: string | null
  fiches_count: number
  created_at: string
}

export interface ImportFicheDraft {
  id: string
  import_id: string
  validated_by: string | null
  fiche_id: string | null
  type: DraftType | null
  title: string
  content: string
  source_timestamp_sec: number | null
  source_page: number | null
  confidence: number | null
  status: DraftStatus
  created_at: string
}

export interface Fiche {
  id: string
  author_id: string | null
  tenant_id: string | null
  source_ref_id: string | null
  type: FicheType | null
  title: string
  content: string
  profil_cible: ProfilCible | null
  source: FicheSource | null
  source_timestamp_sec: number | null
  source_page: number | null
  confidence_threshold: number
  embedding: number[] | null  // VECTOR(1536) — ne pas renseigner manuellement
  status: FicheStatus
  expires_at: string | null
  updated_at: string
  created_at: string
}

// Résultat de match_documents()
export interface MatchDocumentResult {
  id: string
  title: string
  content: string
  type: FicheType
  profil_cible: ProfilCible
  source: FicheSource
  confidence_threshold: number
  similarity: number
}
