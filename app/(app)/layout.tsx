'use client'

import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import HomeIcon from '@mui/icons-material/Home'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import HistoryIcon from '@mui/icons-material/History'
import ChecklistIcon from '@mui/icons-material/Checklist'
import PersonIcon from '@mui/icons-material/Person'
import { usePathname, useRouter } from 'next/navigation'

const TABS = [
  { label: 'Inicio', value: '/dashboard', icon: <HomeIcon /> },
  { label: 'Entrenar', value: '/train', icon: <FitnessCenterIcon /> },
  { label: 'Ejercicios', value: '/exercises', icon: <MenuBookIcon /> },
  { label: 'Rutina', value: '/routine', icon: <ChecklistIcon /> },
  { label: 'Historial', value: '/history', icon: <HistoryIcon /> },
  { label: 'Perfil', value: '/settings', icon: <PersonIcon /> },
]

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  // La tab activa es el prefijo de ruta más largo que matchea (para que
  // /exercises/123 o /exercises/new resalten "Ejercicios").
  const active =
    TABS.map((t) => t.value)
      .filter((v) => pathname === v || pathname.startsWith(v + '/'))
      .sort((a, b) => b.length - a.length)[0] ?? false

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {children}

      <Paper
        elevation={0}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <BottomNavigation
          value={active}
          onChange={(_, value) => router.push(value)}
          showLabels
          sx={{ bgcolor: 'transparent', height: 64 }}
        >
          {TABS.map((tab) => (
            <BottomNavigationAction
              key={tab.value}
              label={tab.label}
              value={tab.value}
              icon={tab.icon}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  )
}
