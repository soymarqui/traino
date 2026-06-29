'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
    })
  }, [])

  const handleSubmit = async () => {
    setError('')
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('No se pudo actualizar la contraseña. Pedí un nuevo link.')
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
          TRAINO
        </Typography>

        {hasSession === false ? (
          <>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Link inválido o vencido
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Volvé a pedir el link de recuperación.
            </Typography>
            <Link href="/forgot-password" style={{ color: '#C6F135' }}>
              Recuperar contraseña
            </Link>
          </>
        ) : (
          <>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Nueva contraseña
            </Typography>

            {error && (
              <Typography variant="body2" sx={{ color: 'error.main' }}>
                {error}
              </Typography>
            )}

            <TextField
              label="Nueva contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />

            <TextField
              label="Repetir contraseña"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              fullWidth
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleSubmit}
              disabled={loading || hasSession === null}
            >
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </Button>
          </>
        )}
      </Box>
    </Box>
  )
}
