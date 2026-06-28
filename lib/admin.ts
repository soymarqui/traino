// Allowlist de admins por email.
// Mantener en sync con la función public.is_admin() de la migración SQL.
// Se puede sobreescribir con NEXT_PUBLIC_ADMIN_EMAILS (lista separada por comas).

const DEFAULT_ADMIN_EMAILS = [
  'marcos.bazterrica@superside.com',
  'bazterrica.marcos@gmail.com',
]

export const ADMIN_EMAILS: string[] = (
  process.env.NEXT_PUBLIC_ADMIN_EMAILS
    ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(',')
    : DEFAULT_ADMIN_EMAILS
).map((e) => e.trim().toLowerCase()).filter(Boolean)

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}
