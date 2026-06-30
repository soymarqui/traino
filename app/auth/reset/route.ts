import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Link de recuperación de contraseña: intercambia el ?code por sesión y manda a
// /reset-password. Ruta dedicada (sin ?next anidado) para que el redirect_to del
// email quede limpio y no se rompa al concatenar el code.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/reset-password`)
    }
  }

  return NextResponse.redirect(`${origin}/forgot-password?error=expired`)
}
