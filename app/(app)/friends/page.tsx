'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import GroupIcon from '@mui/icons-material/Group'

export default function FriendsPage() {
  return (
    <Box sx={{ minHeight: '100vh', pb: 12 }}>
      <Box sx={{ px: 3, pt: 4, pb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Amigos
        </Typography>
      </Box>

      <Box
        sx={{
          px: 3,
          pt: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          textAlign: 'center',
        }}
      >
        <GroupIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Próximamente
        </Typography>
        <Typography color="text.secondary">
          Vas a poder conectar con amigos, crear challenges y ver qué están
          entrenando.
        </Typography>
      </Box>
    </Box>
  )
}
