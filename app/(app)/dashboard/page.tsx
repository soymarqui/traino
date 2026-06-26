import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        px: 3,
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
        Traino
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Bienvenido, {user.email}
      </Typography>
    </Box>
  )
}