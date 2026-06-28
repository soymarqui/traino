'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import MenuIcon from '@mui/icons-material/Menu'
import HomeIcon from '@mui/icons-material/Home'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import ChecklistIcon from '@mui/icons-material/Checklist'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import HistoryIcon from '@mui/icons-material/History'
import SettingsIcon from '@mui/icons-material/Settings'
import GroupIcon from '@mui/icons-material/Group'
import { createClient } from '@/lib/supabase/client'
import { initialOf, avatarUrl } from '@/lib/user'
import { usePathname, useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

// Acciones primarias, siempre visibles abajo.
const BOTTOM_TABS = [
  { label: 'Inicio', value: '/dashboard', icon: <HomeIcon /> },
  { label: 'Entrenar', value: '/train', icon: <FitnessCenterIcon /> },
  { label: 'Rutina', value: '/routine', icon: <ChecklistIcon /> },
  { label: 'Comunidad', value: '/friends', icon: <GroupIcon /> },
]

// Secciones secundarias, en el menú lateral (burger).
const DRAWER_ITEMS = [
  { label: 'Ejercicios', value: '/exercises', icon: <MenuBookIcon /> },
  { label: 'Historial', value: '/history', icon: <HistoryIcon /> },
  { label: 'Configuración', value: '/settings', icon: <SettingsIcon /> },
]

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  const go = (value: string) => {
    setDrawerOpen(false)
    router.push(value)
  }

  const activeBottom =
    BOTTOM_TABS.map((t) => t.value)
      .filter((v) => pathname === v || pathname.startsWith(v + '/'))
      .sort((a, b) => b.length - a.length)[0] ?? false

  const initial = initialOf(user)

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Barra superior */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'background.default',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <IconButton
            edge="start"
            onClick={() => setDrawerOpen(true)}
            sx={{ color: 'text.primary' }}
            aria-label="menú"
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', flex: 1 }}>
            Traino
          </Typography>
          <IconButton onClick={() => router.push('/settings')} sx={{ p: 0 }} aria-label="perfil">
            <Avatar
              src={avatarUrl(user) || undefined}
              sx={{
                width: 32,
                height: 32,
                bgcolor: 'primary.main',
                color: '#0A0A0A',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              {initial}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Menú lateral */}
      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 260, pt: 2 }} role="presentation">
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', px: 2 }}>
            Traino
          </Typography>
          {user?.email && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ px: 2, mb: 1, wordBreak: 'break-all' }}
            >
              {user.email}
            </Typography>
          )}
          <Divider />
          <List>
            {DRAWER_ITEMS.map((item) => (
              <ListItemButton
                key={item.value}
                selected={pathname === item.value || pathname.startsWith(item.value + '/')}
                onClick={() => go(item.value)}
              >
                <ListItemIcon sx={{ color: 'text.secondary' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      {children}

      {/* Navegación inferior */}
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
          value={activeBottom}
          onChange={(_, value) => router.push(value)}
          showLabels
          sx={{ bgcolor: 'transparent', height: 64 }}
        >
          {BOTTOM_TABS.map((tab) => (
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
