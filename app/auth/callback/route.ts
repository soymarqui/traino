import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Intercambia el ?code del link de email por una sesión y redirige a `next`.
// Usado por el flujo de recuperación de contraseña (y futuros magic links).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Si el perfil aún no tiene handle (ej: primer login con Google), completar perfil.
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('handle')
          .eq('id', user.id)
          .maybeSingle()
        if (!profile?.handle) {
          return NextResponse.redirect(`${origin}/onboarding`)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
