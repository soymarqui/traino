'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import PasswordField from '@/components/PasswordField'
import { wordmarkSx } from '@/lib/theme'
import GoogleButton from '@/components/GoogleButton'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [handle, setHandle] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async () => {
    setLoading(true)
    setError('')

    const cleanHandle = handle.trim().toLowerCase()

    if (!/^[a-z0-9_]{3,20}$/.test(cleanHandle)) {
      setError('El usuario debe tener 3-20 caracteres: letras, números o _ (sin espacios).')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      setLoading(false)
      return
    }

    // ¿Handle disponible?
    const { data: taken } = await supabase
      .from('profiles')
      .select('id')
      .eq('handle', cleanHandle)
      .maybeSingle()
    if (taken) {
      setError('Ese nombre de usuario ya está en uso.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { handle: cleanHandle },
      },
    })

    if (error) {
      setError('Error al crear la cuenta. Intentá de nuevo.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  if (success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 3,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography variant="h4" sx={wordmarkSx}>
            TRAINO
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Revisá tu email
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Te mandamos un link de confirmación a {email}. Hacé click en el link para activar tu cuenta.
          </Typography>
          <Link href="/login" style={{ color: '#C6F135' }}>
            Volver al login
          </Link>
        </Box>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h4" sx={wordmarkSx}>
          TRAINO
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Crear cuenta
        </Typography>

        {error && (
          <Typography variant="body2" sx={{ color: 'error.main' }}>
            {error}
          </Typography>
        )}

        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
        />

        <TextField
          label="Nombre de usuario"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          fullWidth
          placeholder="ej: marcos_fit"
          slotProps={{ input: { startAdornment: <span style={{ color: '#888', marginRight: 2 }}>@</span> } }}
        />

        <PasswordField
          label="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
        />

        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </Button>

        <Divider sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>o</Divider>

        <GoogleButton onClick={handleGoogle} label="Registrarme con Google" />

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" style={{ color: '#C6F135' }}>
            Iniciá sesión
          </Link>
        </Typography>
      </Box>
    </Box>
  )
}