import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// Borra la cuenta del usuario autenticado y todos sus datos.
export async function POST() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json(
      { error: 'Falta SUPABASE_SERVICE_ROLE_KEY en el servidor' },
      { status: 500 }
    )
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false },
  })

  // Borrar workouts + sets (por si no cascadean al borrar el auth user).
  const { data: ws } = await admin.from('workouts').select('id').eq('user_id', user.id)
  const ids = (ws || []).map((w: { id: string }) => w.id)
  if (ids.length) {
    await admin.from('sets').delete().in('workout_id', ids)
    await admin.from('workouts').delete().eq('user_id', user.id)
  }

  // Borra el usuario de Auth; el resto de las tablas cascadean por FK.
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
