'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import WorkoutCalendar from '@/components/WorkoutCalendar'
import SwipeableRow from '@/components/SwipeableRow'

function dateKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type WorkoutSummary = {
  id: string
  started_at: string
  finished_at: string | null
  duration_seconds: number | null
  photo_url: string | null
  set_count: number
  exercise_count: number
}

export default function HistoryPage() {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([])
  const [doneByDate, setDoneByDate] = useState<Record<string, string>>({})
  const [plannedDates, setPlannedDates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async () => {
    if (!deleteId) return
    const id = deleteId
    setDeleteId(null)
    setWorkouts((prev) => prev.filter((w) => w.id !== id))
    await supabase.from('sets').delete().eq('workout_id', id)
    await supabase.from('workouts').delete().eq('id', id)
    fetchHistory()
  }

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
        photo_url,
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
        photo_url: w.photo_url,
        set_count: w.sets.length,
        exercise_count: exerciseIds.size,
      }
    })

    const map: Record<string, string> = {}
    summaries.forEach((w) => {
      map[dateKey(w.started_at)] = w.id
    })

    const { data: planned } = await supabase.from('planned_workouts').select('date')
    setPlannedDates((planned || []).map((p: { date: string }) => p.date))

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
          plannedDates={plannedDates}
          onSelectDone={(id) => router.push(`/train/${id}`)}
          onSelectFuture={(d) => router.push(`/plan/${d}`)}
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
          <SwipeableRow
            key={workout.id}
            onPress={() => router.push(`/train/${workout.id}`)}
            trailing={[
              { label: 'Editar', bg: '#3b82f6', icon: <EditIcon fontSize="small" />, onClick: () => router.push(`/train/${workout.id}`) },
              { label: 'Borrar', bg: '#b00020', icon: <DeleteIcon fontSize="small" />, onClick: () => setDeleteId(workout.id) },
            ]}
          >
            <Card>
              {workout.photo_url && (
                <Box
                  component="img"
                  src={workout.photo_url}
                  alt="Foto del entrenamiento"
                  sx={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                />
              )}
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
            </Card>
          </SwipeableRow>
        ))}
      </Box>

      {/* Confirmar borrar sesión */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} fullWidth maxWidth="xs">
        <DialogTitle>Eliminar entrenamiento</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Se borra esta sesión y sus series. Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDeleteId(null)}>
            Cancelar
          </Button>
          <Button color="error" onClick={handleDelete}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}