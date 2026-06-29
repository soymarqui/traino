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
import Badge from '@mui/material/Badge'
import MenuIcon from '@mui/icons-material/Menu'
import SearchIcon from '@mui/icons-material/Search'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import HomeIcon from '@mui/icons-material/Home'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import ChecklistIcon from '@mui/icons-material/Checklist'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import HistoryIcon from '@mui/icons-material/History'
import InsightsIcon from '@mui/icons-material/Insights'
import TuneIcon from '@mui/icons-material/Tune'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import PersonIcon from '@mui/icons-material/Person'
import LogoutIcon from '@mui/icons-material/Logout'
import GroupIcon from '@mui/icons-material/Group'
import { createClient } from '@/lib/supabase/client'
import { initialOf, avatarUrl } from '@/lib/user'
import { usePathname, useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { RestTimerProvider } from '@/components/RestTimer'
import { alpha } from '@mui/material/styles'
import { fetchNotifications, countUnread } from '@/lib/notifications'

// Acciones primarias, siempre visibles abajo.
const BOTTOM_TABS = [
  { label: 'Inicio', value: '/dashboard', icon: <HomeIcon /> },
  { label: 'Comunidades', value: '/friends', icon: <GroupIcon /> },
  { label: 'Rutina', value: '/routine', icon: <ChecklistIcon /> },
  { label: 'Entrenamiento', value: '/train', icon: <FitnessCenterIcon /> },
]

// Secciones secundarias, en el menú lateral (burger).
const DRAWER_ITEMS = [
  { label: 'Amigos', value: '/amigos', icon: <GroupIcon /> },
  { label: 'Ejercicios', value: '/exercises', icon: <MenuBookIcon /> },
  { label: 'Estadísticas', value: '/stats', icon: <InsightsIcon /> },
  { label: 'Historial', value: '/history', icon: <HistoryIcon /> },
  { label: 'Ajustes', value: '/settings', icon: <TuneIcon /> },
  { label: 'Configuración de cuenta', value: '/account', icon: <ManageAccountsIcon /> },
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
  const [handle, setHandle] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (!user) return
      // Handle propio (para "Ver Perfil").
      const { data: myProfile } = await supabase.from('profiles').select('handle').eq('id', user.id).maybeSingle()
      setHandle((myProfile as { handle: string | null } | null)?.handle ?? null)
      // Notificaciones sin leer (para el indicador de la campana).
      try {
        const notifs = await fetchNotifications(supabase, user.id)
        setUnread(countUnread(notifs, user.user_metadata?.notifs_seen_at ?? null))
      } catch {
        /* noop */
      }
    }
    load()
  }, [pathname])

  const go = (value: string) => {
    setDrawerOpen(false)
    router.push(value)
  }

  const viewProfile = () => {
    setDrawerOpen(false)
    router.push(handle ? `/u/${handle}` : '/account')
  }

  const signOut = async () => {
    setDrawerOpen(false)
    await supabase.auth.signOut()
    router.push('/login')
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
        <Toolbar sx={{ gap: 1, maxWidth: 600, mx: 'auto', width: '100%' }}>
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
          <IconButton onClick={() => router.push('/search')} sx={{ color: 'text.primary' }} aria-label="buscar">
            <SearchIcon />
          </IconButton>
          <IconButton onClick={() => router.push('/notificaciones')} sx={{ color: 'text.primary' }} aria-label="notificaciones">
            <Badge color="error" variant="dot" invisible={unread === 0}>
              <NotificationsNoneIcon />
            </Badge>
          </IconButton>
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
            <ListItemButton onClick={viewProfile}>
              <ListItemIcon sx={{ color: 'text.secondary' }}><PersonIcon /></ListItemIcon>
              <ListItemText primary="Ver perfil" />
            </ListItemButton>
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
            <Divider sx={{ my: 1 }} />
            <ListItemButton onClick={signOut}>
              <ListItemIcon sx={{ color: 'text.secondary' }}><LogoutIcon /></ListItemIcon>
              <ListItemText primary="Cerrar sesión" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      <RestTimerProvider>
        <Box sx={{ maxWidth: 600, mx: 'auto', width: '100%' }}>{children}</Box>
      </RestTimerProvider>

      {/* Navegación inferior flotante (pill) */}
      <Paper
        elevation={0}
        sx={{
          position: 'fixed',
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
          left: 0,
          right: 0,
          mx: 'auto',
          width: 'min(568px, calc(100% - 32px))',
          zIndex: 10,
          borderRadius: 999,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: (t) => alpha(t.palette.background.paper, 0.8),
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: (t) => `0 8px 32px ${alpha(t.palette.common.black, t.palette.mode === 'light' ? 0.15 : 0.55)}`,
          overflow: 'hidden',
        }}
      >
        <BottomNavigation
          value={activeBottom}
          onChange={(_, value) => router.push(value)}
          sx={{
            bgcolor: 'transparent',
            height: 64,
            '& .MuiBottomNavigationAction-root': { minWidth: 0 },
          }}
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
