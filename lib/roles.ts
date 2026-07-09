import type { UserRole } from '@/lib/supabase/types'

// Valeurs hex brutes (pas var(--role-*)) : certains usages construisent un fond
// translucide par concaténation (`color + '18'`), qui exige une chaîne hex.
export const ROLE_COLORS: Record<UserRole, string> = {
  admin: '#7A5AF8',
  csm:   '#2D7DD2',
  sales: '#E8651E',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Knowledge Manager',
  csm:   'Customer Success',
  sales: 'Account Executive',
}
