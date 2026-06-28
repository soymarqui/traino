'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import WorkoutCalendar from '@/components/WorkoutCalendar'

function dateKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type WorkoutSummary = {
  id: string
  started_at: string
  finished_at: string | null
  duration_seconds: number | null
  set_count: number
  exercise_count: number
}

export default function HistoryPage() {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([])
  const [doneByDate, setDoneByDate] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('workouts')
      .select(`
        id,
        started_at,
        finished_at,
        duration_seconds,
        sets(id, exercise_id)
      `)
      .not('finished_at', 'is', null)
      .order('started_at', { ascending: false })

    if (!data) return

    const summaries = data.map((w: any) => {
      const exerciseIds = new Set(w.sets.map((s: any) => s.exercise_id))
      return {
        id: w.id,
        started_at: w.started_at,
        finished_at: w.finished_at,
        duration_seconds: w.duration_seconds,
        set_count: w.sets.length,
        exercise_count: exerciseIds.size,
      }
    })

    const map: Record<string, string> = {}
    summaries.forEach((w) => {
      map[dateKey(w.started_at)] = w.id
    })

    setWorkouts(summaries)
    setDoneByDate(map)
    setLoading(false)
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null
    const m = Math.floor(seconds / 60)
    return `${m} min`
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 10 }}>
      {/* Header */}
      <Box sx={{ px: 3, pt: 4, pb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => router.back()}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Historial
        </Typography>
      </Box>

      {/* Calendario */}
      <Box sx={{ px: 3, mb: 2 }}>
        <WorkoutCalendar
          doneByDate={doneByDate}
          plannedDates={[]}
          onSelectDone={(id) => router.push(`/train/${id}`)}
          onToggleFuture={() => {}}
          onSelectEmptyPast={(d) => router.push(`/train?date=${d}`)}
        />
      </Box>

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {loading && (
          <Typography color="text.secondary">Cargando...</Typography>
        )}

        {!loading && workouts.length === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pt: 8 }}>
            <FitnessCenterIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Typography color="text.secondary">
              Todavía no completaste ningún entrenamiento.
            </Typography>
          </Box>
        )}

        {workouts.map((workout) => (
          <Card key={workout.id}>
            <CardActionArea onClick={() => router.push(`/train/${workout.id}`)}>
            <CardContent>
              <Typography variant="body1" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                {formatDate(workout.started_at)}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {workout.exercise_count} ejercicios
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {workout.set_count} series
                </Typography>
                {workout.duration_seconds && (
                  <Typography variant="body2" color="text.secondary">
                    {formatDuration(workout.duration_seconds)}
                  </Typography>
                )}
              </Box>
            </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Box>
  )
}