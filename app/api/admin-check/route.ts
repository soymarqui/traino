import { NextResponse } from 'next/server'

// Verificación NO destructiva de que SUPABASE_SERVICE_ROLE_KEY está configurada y
// tiene permisos admin. No devuelve datos. (Se puede borrar luego de verificar.)
export async function GET() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return NextResponse.json({ ok: false, reason: 'falta SUPABASE_SERVICE_ROLE_KEY' })

  const r = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )
  return NextResponse.json({ ok: r.ok, status: r.status })
}
