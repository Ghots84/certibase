import { createAdminClient } from '@/lib/supabase/admin'

// Compteurs affichés en badge dans la nav (sidebar) — mêmes requêtes que
// getStats() de la Vue d'ensemble, gardées séparées pour ne pas coupler
// le rendu de la sidebar à celui de la page d'accueil.
export async function getNavCounts() {
  const admin = createAdminClient()
  const [fichesRes, importsRes] = await Promise.all([
    admin.from('fiches').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    admin.from('imports').select('id', { count: 'exact', head: true }).in('status', ['pending', 'extracting', 'analyzing']),
  ])
  return {
    fiches: fichesRes.count ?? 0,
    imports: importsRes.count ?? 0,
  }
}
