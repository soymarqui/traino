import type { User } from '@supabase/supabase-js'

// Nombre a mostrar: el full_name de user_metadata, o el local-part del email.
export function displayName(user: User | null): string {
  const full = (user?.user_metadata?.full_name as string | undefined)?.trim()
  if (full) return full
  if (user?.email) return user.email.split('@')[0]
  return ''
}

export function initialOf(user: User | null): string {
  const name = displayName(user)
  return name ? name[0].toUpperCase() : '?'
}
