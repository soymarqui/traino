'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { createClient } from '@/lib/supabase/client'
import { displayName } from '@/lib/user'
import { useRouter } from 'next/navigation'
import WorkoutCalendar from '@/components/WorkoutCalendar'

const PHRASES = [
  '¿Qué vamos a entrenar hoy?',
  '¿De nuevo acá? 🔥',
  '¿Se viene otro día ganado?',
  'El que entrena hoy, gana mañana.',
  'Hora de aparecer.',
  'Hoy también cuenta. 💪',
  'Sin excusas, a darle.',
  'La constancia gana.',
  'Tu yo del futuro te lo agradece.',
  'Un día más, un paso más.',
  'Vamos que se puede. 🚀',
  'El progreso no se negocia.',
]

function dateKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

// Grupos musculares para la sugerencia del día.
const GROUP_DEFS = [
  { name: 'Piernas', emoji: '🦵', slugs: ['cuadriceps', 'isquios', 'gluteos', 'pantorrillas'] },
  { name: 'Pecho', emoji: '🎽', slugs: ['pecho'] },
  { name: 'Espalda', emoji: '🦅', slugs: ['espalda'] },
  { name: 'Hombros', emoji: '🏔️', slugs: ['hombros'] },
  { name: 'Brazos', emoji: '💪', slugs: ['biceps', 'triceps', 'antebrazos'] },
  { name: 'Core', emoji: '🧱', slugs: ['abdominales'] },
]
const SLUG_TO_GROUP: Record<string, number> = {}
GROUP_DEFS.forEach((g, i) => g.slugs.forEach((s) => (SLUG_TO_GROUP[s] = i)))

function computeSuggestion(hist: { workout?: { started_at: string } | null; exercise?: { muscle?: { slug: string } | null } | null }[]): string {
  const cutoff = Date.now() - 21 * 86400000
  const counts = GROUP_DEFS.map(() => 0)
  let total = 0
  hist.forEach((h) => {
    if (!h.workout) return
    if (new Date(h.workout.started_at).getTime() < cutoff) return
    const slug = h.exercise?.muscle?.slug
    if (slug == null || !(slug in SLUG_TO_GROUP)) return
    counts[SLUG_TO_GROUP[slug]]++
    total++
  })
  if (total === 0) return 'Arrancá por donde quieras 💪'
  let min = 0
  counts.forEach((c, i) => {
    if (c < counts[min]) min = i
  })
  return `Hoy toca: ${GROUP_DEFS[min].name} ${GROUP_DEFS[min].emoji}`
}

export default function DashboardPage() {
  const [name, setName] = useState('')
  const [doneByDate, setDoneByDate] = useState<Record<string, string>>({})
  const [plannedDates, setPlannedDates] = useState<string[]>([])
  const [phrase, setPhrase] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Frase al azar en cada apertura (en cliente, para no romper la hidratación).
    setPhrase(PHRASES[Math.floor(Math.random() * PHRASES.length)])

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setName(displayName(user))

      // Días con entrenamiento (iniciado o terminado) -> punto lleno.
      const { data: workouts } = await supabase
        .from('workouts')
        .select('id, started_at')
        .not('started_at', 'is', null)
      const map: Record<string, string> = {}
      ;(workouts || []).forEach((w: { id: string; started_at: string }) => {
        map[dateKey(w.started_at)] = w.id
      })
      setDoneByDate(map)

      // Días planificados -> contorno.
      const { data: planned } = await supabase
        .from('planned_workouts')
        .select('date')
      setPlannedDates((planned || []).map((p: { date: string }) => p.date))

      // Sugerencia del día.
      const now = new Date()
      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      if ((planned || []).some((p: { date: string }) => p.date === todayKey)) {
        setSuggestion('Hoy tenés un entrenamiento planeado 📅')
      } else {
        const { data: hist } = await supabase
          .from('sets')
          .select('exercise:exercises(muscle:muscles(slug)), workout:workouts(started_at)')
          .eq('completed', true)
        setSuggestion(computeSuggestion((hist as any) || []))
      }
    }
    load()
  }, [])

  return (
    <Box sx={{ minHeight: '100vh', pb: 10 }}>
      {/* Header */}
      <Box sx={{ px: 3, pt: 4, pb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {name ? `Hola, ${name} 💪` : 'Hola 💪'}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, minHeight: 40 }}>
          {phrase}
        </Typography>
        <Button
          variant="contained"
          size="large"
          fullWidth
          startIcon={<PlayArrowIcon />}
          onClick={() => router.push('/train')}
          sx={{ mt: 2.5, py: 1.5, fontSize: '1.05rem' }}
        >
          Empezar entrenamiento
        </Button>
        {suggestion && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, textAlign: 'center' }}>
            {suggestion}
          </Typography>
        )}
      </Box>

      {/* Calendario */}
      <Box sx={{ px: 3 }}>
        <WorkoutCalendar
          doneByDate={doneByDate}
          plannedDates={plannedDates}
          onSelectDone={(id) => router.push(`/train/${id}`)}
          onSelectFuture={(d) => router.push(`/plan/${d}`)}
        />
      </Box>
    </Box>
  )
}
