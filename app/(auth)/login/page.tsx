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
import GoogleButton from '@/components/GoogleButton'
import PasswordField from '@/components/PasswordField'
import { wordmarkSx } from '@/lib/theme'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async () => {
    setLoading(true)
    setError('')

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    })

    if (!res.ok) {
      setError('Email/usuario o contraseña incorrectos.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
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
          Iniciá sesión
        </Typography>

        {error && (
          <Typography variant="body2" sx={{ color: 'error.main' }}>
            {error}
          </Typography>
        )}

        <TextField
          label="Email o usuario"
          type="text"
          autoCapitalize="none"
          autoCorrect="off"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          fullWidth
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />

        <PasswordField
          label="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />

        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>

        <Divider sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>o</Divider>

        <GoogleButton onClick={handleGoogle} label="Continuar con Google" />

        <Typography variant="body2" sx={{ textAlign: 'center' }}>
          <Link href="/forgot-password" style={{ color: '#888888' }}>
            ¿Olvidaste tu contraseña?
          </Link>
        </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          ¿No tenés cuenta?{' '}
          <Link href="/register" style={{ color: '#C6F135' }}>
            Crear cuenta
          </Link>
        </Typography>
      </Box>
    </Box>
  )
}