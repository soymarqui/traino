'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import HistoryIcon from '@mui/icons-material/History'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import Snackbar from '@mui/material/Snackbar'
import { createClient } from '@/lib/supabase/client'
import { displayName } from '@/lib/user'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import WorkoutCalendar from './WorkoutCalendar'

function dateKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

const menuItems = [
  {
    label: 'Entrenar',
    description: 'Iniciar un nuevo entrenamiento',
    icon: <PlayArrowIcon sx={{ fontSize: 32, color: 'primary.main' }} />,
    href: '/train',
  },
  {
    label: 'Historial',
    description: 'Ver entrenamientos pasados',
    icon: <HistoryIcon sx={{ fontSize: 32, color: 'primary.main' }} />,
    href: '/history',
  },
  {
    label: 'Ejercicios',
    description: 'Administrar biblioteca',
    icon: <MenuBookIcon sx={{ fontSize: 32, color: 'primary.main' }} />,
    href: '/exercises',
  },
  {
    label: 'Configuración',
    description: 'Perfil y preferencias',
    icon: <FitnessCenterIcon sx={{ fontSize: 32, color: 'primary.main' }} />,
    href: '/settings',
  },
]

export default function DashboardPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [doneByDate, setDoneByDate] = useState<Record<string, string>>({})
  const [planMsg, setPlanMsg] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email || '')
      setName(displayName(user))
    })

    supabase
      .from('workouts')
      .select('id, started_at, finished_at')
      .not('finished_at', 'is', null)
      .then(({ data }) => {
        const map: Record<string, string> = {}
        ;(data || []).forEach((w: { id: string; started_at: string }) => {
          map[dateKey(w.started_at)] = w.id
        })
        setDoneByDate(map)
      })
  }, [])

  return (
    <Box sx={{ minHeight: '100vh', pb: 10 }}>
      {/* Header */}
      <Box sx={{ px: 3, pt: 4, pb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {name ? `Hola, ${name} 👋` : 'Hola 👋'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {email}
        </Typography>
      </Box>

      {/* Calendario */}
      <Box sx={{ px: 3, mb: 3 }}>
        <WorkoutCalendar
          doneByDate={doneByDate}
          onSelectDone={(id) => router.push(`/train/${id}`)}
          onSelectFuture={() => setPlanMsg(true)}
        />
      </Box>

      {/* Menu */}
      <Box
        sx={{
          px: 3,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 2,
        }}
      >
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  transform: 'scale(1.02)',
                },
              }}
            >
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2.5 }}>
                {item.icon}
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  {item.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.description}
                </Typography>
              </CardContent>
            </Card>
          </Link>
        ))}
      </Box>

      <Snackbar
        open={planMsg}
        autoHideDuration={3000}
        onClose={() => setPlanMsg(false)}
        message="Pronto vas a poder planificar tu entrenamiento para este día"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 8 }}
      />
    </Box>
  )
}