'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async () => {
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
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
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
          Traino
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
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
        />

        <TextField
          label="Contraseña"
          type="password"
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