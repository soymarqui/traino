import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// Login con email O handle. Si el identificador no es un email, se resuelve el
// email server-side (service role) sin exponerlo al cliente, y se inicia sesión.
export async function POST(request: Request) {
  const { identifier, password } = await request.json().catch(() => ({}))
  if (!identifier || !password) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  const id = String(identifier).trim()
  let email = id

  if (!id.includes('@')) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: 'Falta SUPABASE_SERVICE_ROLE_KEY en el servidor' }, { status: 500 })
    }
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
      auth: { persistSession: false },
    })
    const handle = id.replace(/^@/, '')
    const { data: prof } = await admin.from('profiles').select('id').ilike('handle', handle).maybeSingle()
    if (!prof) return NextResponse.json({ error: 'invalid' }, { status: 401 })
    const { data: u } = await admin.auth.admin.getUserById((prof as { id: string }).id)
    const found = u?.user?.email
    if (!found) return NextResponse.json({ error: 'invalid' }, { status: 401 })
    email = found
  }

  // Inicia sesión con el cliente con cookies: deja la sesión seteada en el navegador.
  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return NextResponse.json({ error: 'invalid' }, { status: 401 })
  return NextResponse.json({ ok: true })
}
