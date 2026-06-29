'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function AccountPage() {
  return (
    <Box sx={{ minHeight: '100vh', pb: 12 }}>
      <Box sx={{ px: 3, pt: 4, pb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Configuración de cuenta
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Privacidad y preferencias de tu cuenta.
        </Typography>
      </Box>
    </Box>
  )
}
