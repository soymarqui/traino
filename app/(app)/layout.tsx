'use client'

import { useEffect, useRef, useState } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
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
import Fab from '@mui/material/Fab'
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
import { wordmarkSx } from '@/lib/theme'

// Acciones primarias, siempre visibles abajo.
const BOTTOM_TABS = [
  { label: 'Inicio', value: '/dashboard', icon: <HomeIcon /> },
  { label: 'Comunidades', value: '/friends', icon: <GroupIcon /> },
  { label: 'Mis Rutinas', value: '/routine', icon: <ChecklistIcon /> },
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
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null)
  const [inactivePrompt, setInactivePrompt] = useState<{ id: string; startedAt: string; lastActivityAt: string } | null>(null)
  const [countdown, setCountdown] = useState(10)
  const inactiveHandled = useRef(false)
  const supabase = createClient()

  // Cuenta regresiva del aviso de inactividad: si llega a 0, se finaliza solo.
  useEffect(() => {
    if (!inactivePrompt) return
    if (countdown <= 0) {
      finishStale()
      return
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inactivePrompt, countdown])

  const finishStale = async () => {
    const p = inactivePrompt
    setInactivePrompt(null)
    inactiveHandled.current = false
    if (!p) return
    // Finaliza el entrenamiento SIN publicar check-in. Duración hasta la última actividad.
    const durationSec = Math.max(0, Math.round((new Date(p.lastActivityAt).getTime() - new Date(p.startedAt).getTime()) / 1000))
    await supabase
      .from('workouts')
      .update({ finished_at: p.lastActivityAt, duration_seconds: durationSec })
      .eq('id', p.id)
    setActiveWorkoutId(null)
  }

  const keepTraining = async () => {
    const p = inactivePrompt
    setInactivePrompt(null)
    inactiveHandled.current = false
    if (!p) return
    await supabase.from('workouts').update({ last_activity_at: new Date().toISOString() }).eq('id', p.id)
  }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (!user) return
      // Handle propio (para "Ver Perfil").
      const { data: myProfile } = await supabase.from('profiles').select('handle').eq('id', user.id).maybeSingle()
      setHandle((myProfile as { handle: string | null } | null)?.handle ?? null)
      // Entrenamiento en curso (sin finalizar) y reciente, para el botón flotante.
      // Se acota a las últimas 12 h para no contar sesiones viejas abandonadas.
      const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      const { data: active } = await supabase
        .from('workouts')
        .select('id, started_at, last_activity_at')
        .eq('user_id', user.id)
        .is('finished_at', null)
        .gte('started_at', since)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const aw = active as { id: string; started_at: string; last_activity_at: string } | null
      setActiveWorkoutId(aw?.id ?? null)
      // ¿Inactividad > 30 min? Preguntar si sigue entrenando.
      if (aw && !inactiveHandled.current) {
        const last = new Date(aw.last_activity_at).getTime()
        if (Date.now() - last > 30 * 60 * 1000) {
          inactiveHandled.current = true
          setInactivePrompt({ id: aw.id, startedAt: aw.started_at, lastActivityAt: aw.last_activity_at })
          setCountdown(10)
        }
      }
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

  // Navegación entre tabs con dirección: desliza hacia un lado u otro según el
  // orden de los tabs, para que se sienta como una app nativa.
  const goTab = (value: string) => {
    const from = BOTTOM_TABS.findIndex((t) => t.value === activeBottom)
    const to = BOTTOM_TABS.findIndex((t) => t.value === value)
    const type = to > from ? 'nav-forward' : to < from ? 'nav-back' : undefined
    router.push(value, type ? ({ transitionTypes: [type] } as never) : undefined)
  }

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
          <Typography
            onClick={() => router.push('/dashboard')}
            sx={{ ...wordmarkSx, fontSize: '1.15rem', flex: 1, cursor: 'pointer' }}
          >
            TRAINO
          </Typography>
          <IconButton onClick={() => router.push('/search')} sx={{ color: 'text.primary' }} aria-label="buscar">
            <SearchIcon />
          </IconButton>
          <IconButton onClick={() => router.push('/notificaciones')} sx={{ color: 'text.primary' }} aria-label="notificaciones">
            <Badge color="error" variant="dot" invisible={unread === 0}>
              <NotificationsNoneIcon />
            </Badge>
          </IconButton>
          <IconButton onClick={() => router.push(handle ? `/u/${handle}` : '/account')} sx={{ p: 0 }} aria-label="mi perfil">
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
          <Typography sx={{ ...wordmarkSx, fontSize: '1.15rem', px: 2 }}>
            TRAINO
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

      {/* ¿Seguís entrenando? (inactividad > 30 min) */}
      <Dialog open={!!inactivePrompt} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>¿Seguís entrenando? 🏋️</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            No detectamos actividad hace un rato. Si no respondés, damos por finalizado el
            entrenamiento en <b>{countdown}s</b> (no se publica ningún check-in).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={finishStale}>Finalizar</Button>
          <Button variant="contained" onClick={keepTraining}>Sí, sigo</Button>
        </DialogActions>
      </Dialog>

      {/* Botón flotante de "entrenamiento activo" (volver a la sesión en curso) */}
      {activeWorkoutId && pathname !== `/train/${activeWorkoutId}` && (
        <Fab
          color="primary"
          variant="extended"
          onClick={() => router.push(`/train/${activeWorkoutId}`)}
          sx={{
            position: 'fixed',
            bottom: 'calc(96px + env(safe-area-inset-bottom))',
            left: 'max(16px, calc(50% - 284px))',
            zIndex: 12,
            fontWeight: 700,
            textTransform: 'none',
          }}
        >
          <FitnessCenterIcon sx={{ mr: 1 }} />
          Entrenando
        </Fab>
      )}

      {/* Capa de blur con gradiente detrás del nav: difumina el contenido que
          pasa por atrás y se desvanece hacia arriba. */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 'calc(120px + env(safe-area-inset-bottom))',
          zIndex: 9,
          pointerEvents: 'none',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          maskImage: 'linear-gradient(to top, #000 55%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, #000 55%, transparent 100%)',
          background: (t) =>
            `linear-gradient(to top, ${alpha(t.palette.background.default, 0.6)}, ${alpha(t.palette.background.default, 0)})`,
        }}
      />

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
          onChange={(_, value) => goTab(value)}
          sx={{
            bgcolor: 'transparent',
            height: 64,
            '& .MuiBottomNavigationAction-root': { minWidth: 0, px: 0.5 },
            '& .MuiBottomNavigationAction-label': { fontSize: '0.62rem', lineHeight: 1.1 },
            '& .MuiBottomNavigationAction-label.Mui-selected': { fontSize: '0.66rem' },
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
