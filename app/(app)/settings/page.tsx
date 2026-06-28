'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import LogoutIcon from '@mui/icons-material/Logout'
import { createClient } from '@/lib/supabase/client'
import { isAdmin } from '@/lib/admin'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const [email, setEmail] = useState('')
  const [admin, setAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email || '')
      setAdmin(isAdmin(user?.email))
      setLoading(false)
    })
  }, [])

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 12 }}>
      {/* Header */}
      <Box sx={{ px: 3, pt: 4, pb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Perfil
        </Typography>
      </Box>

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AccountCircleIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body1"
                sx={{ fontWeight: 600, wordBreak: 'break-all' }}
              >
                {loading ? 'Cargando...' : email || 'Sin sesión'}
              </Typography>
              {admin && (
                <Chip label="Admin" size="small" color="primary" sx={{ mt: 0.5 }} />
              )}
            </Box>
          </CardContent>
        </Card>

        <Button
          variant="outlined"
          color="inherit"
          size="large"
          fullWidth
          startIcon={<LogoutIcon />}
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </Button>
      </Box>
    </Box>
  )
}
