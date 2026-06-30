'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Link from 'next/link'
import { wordmarkSx } from '@/lib/theme'

export default function Home() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        px: 3,
      }}
    >
      <Typography variant="h2" sx={wordmarkSx}>
        TRAINO
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
        Registrá tu entrenamiento de fuerza.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Link href="/login" style={{ textDecoration: 'none' }}>
          <Button variant="contained" size="large">
            Entrar
          </Button>
        </Link>
        <Link href="/register" style={{ textDecoration: 'none' }}>
          <Button variant="outlined" size="large">
            Crear cuenta
          </Button>
        </Link>
      </Box>
    </Box>
  )
}