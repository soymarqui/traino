'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const handleSubmit = async () => {
    if (!email) return
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      setError('No se pudo enviar el email. Revisá la dirección e intentá de nuevo.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
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

        {sent ? (
          <>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Revisá tu email
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Si {email} tiene una cuenta, te mandamos un link para restablecer la
              contraseña.
            </Typography>
            <Link href="/login" style={{ color: '#C6F135' }}>
              Volver al login
            </Link>
          </>
        ) : (
          <>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Recuperar contraseña
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ingresá tu email y te mandamos un link para crear una nueva contraseña.
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
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleSubmit}
              disabled={loading || !email}
            >
              {loading ? 'Enviando...' : 'Enviar link'}
            </Button>

            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              <Link href="/login" style={{ color: '#C6F135' }}>
                Volver al login
              </Link>
            </Typography>
          </>
        )}
      </Box>
    </Box>
  )
}
