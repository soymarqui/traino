'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Snackbar from '@mui/material/Snackbar'
import AddIcon from '@mui/icons-material/Add'
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import { createClient } from '@/lib/supabase/client'
import { isAdmin } from '@/lib/admin'
import { muscleLabel } from '@/lib/muscles'
import { Exercise, Muscle } from '@/types/database'
import { useRouter } from 'next/navigation'
import SwipeableRow from '@/components/SwipeableRow'
import AddToRoutineDialog from './[id]/AddToRoutineDialog'

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [muscles, setMuscles] = useState<Muscle[]>([])
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [admin, setAdmin] = useState(false)
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null)
  const [activeDayId, setActiveDayId] = useState<string | null>(null)
  const [activeRoutineName, setActiveRoutineName] = useState<string>('')
  const [dialogExercise, setDialogExercise] = useState<Exercise | null>(null)
  const [snack, setSnack] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
    loadActiveRoutine()
  }, [])

  const fetchData = async () => {
    setLoading(true)

    const { data: musclesData } = await supabase
      .from('muscles')
      .select('*')
      .order('name')

    const { data: exercisesData } = await supabase
      .from('exercises')
      .select('*, muscle:muscles(id, name, slug)')
      .eq('active', true)
      .order('name')

    setMuscles(musclesData || [])
    setExercises(exercisesData || [])
    setLoading(false)
  }

  const loadActiveRoutine = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setAdmin(isAdmin(user?.email))
    if (!user) return
    const { data: profile } = await supabase
      .from('profiles')
      .select('active_routine_id')
      .eq('id', user.id)
      .maybeSingle()
    const rid = (profile as { active_routine_id: string | null } | null)?.active_routine_id
    if (!rid) return
    const [{ data: routine }, { data: day }] = await Promise.all([
      supabase.from('routines').select('name').eq('id', rid).maybeSingle(),
      supabase.from('routine_days').select('id').eq('routine_id', rid).order('position').limit(1).maybeSingle(),
    ])
    setActiveRoutineId(rid)
    setActiveRoutineName((routine as { name: string } | null)?.name ?? '')
    setActiveDayId((day as { id: string } | null)?.id ?? null)
  }

  const addToActive = async (ex: Exercise) => {
    if (!activeRoutineId || !activeDayId) {
      setSnack('No tenés una rutina activa con días')
      return
    }
    const { count } = await supabase
      .from('routine_exercises')
      .select('id', { count: 'exact', head: true })
      .eq('routine_day_id', activeDayId)
    const { data: re } = await supabase
      .from('routine_exercises')
      .insert({
        routine_id: activeRoutineId,
        routine_day_id: activeDayId,
        exercise_id: ex.id,
        rest_seconds: ex.rest_seconds,
        position: count ?? 0,
      })
      .select()
      .single()
    if (re) {
      const rows = Array.from({ length: ex.suggested_sets || 3 }, (_, i) => ({
        routine_exercise_id: re.id,
        set_number: i + 1,
        reps: ex.reps_min,
      }))
      await supabase.from('routine_exercise_sets').insert(rows)
      setSnack(`Agregado a ${activeRoutineName}`)
    }
  }

  const filtered = selectedMuscle
    ? exercises.filter((e) => e.muscle_id === selectedMuscle)
    : exercises

  return (
    <Box sx={{ minHeight: '100vh', pb: 10 }}>
      {/* Header */}
      <Box
        sx={{
          px: 3,
          pt: 4,
          pb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Ejercicios
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {admin && (
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              href="/exercises/requests"
            >
              Solicitudes
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="small"
            href="/exercises/new"
          >
            {admin ? 'Agregar' : 'Solicitar'}
          </Button>
        </Box>
      </Box>

      {/* Filtro por músculo */}
      <Box
        sx={{
          px: 3,
          pb: 2,
          display: 'flex',
          gap: 1,
          overflowX: 'auto',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Chip
          label="Todos"
          onClick={() => setSelectedMuscle(null)}
          color={selectedMuscle === null ? 'primary' : 'default'}
          sx={{ flexShrink: 0 }}
        />
        {muscles.map((m) => (
          <Chip
            key={m.id}
            label={muscleLabel(m.slug, m.name)}
            onClick={() => setSelectedMuscle(m.id)}
            color={selectedMuscle === m.id ? 'primary' : 'default'}
            sx={{ flexShrink: 0 }}
          />
        ))}
      </Box>

      {/* Lista de ejercicios */}
      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {loading && (
          <Typography color="text.secondary">Cargando...</Typography>
        )}

        {!loading && filtered.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              pt: 8,
            }}
          >
            <FitnessCenterIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Typography color="text.secondary">
              No hay ejercicios todavía.
            </Typography>
            <Button variant="contained" href="/exercises/new">
              Solicitar ejercicio
            </Button>
          </Box>
        )}

        {filtered.map((exercise) => (
          <SwipeableRow
            key={exercise.id}
            onPress={() => router.push(`/exercises/${exercise.id}`)}
            trailing={[
              {
                label: 'A activa',
                bg: '#C6F135',
                color: '#0A0A0A',
                icon: <AddIcon fontSize="small" />,
                onClick: () => addToActive(exercise),
              },
            ]}
          >
            <Card>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5 }}>
                <Typography variant="body1" sx={{ fontWeight: 600, flex: 1 }}>
                  {exercise.name}
                </Typography>
                {exercise.muscle?.name && (
                  <Chip label={muscleLabel(exercise.muscle.slug, exercise.muscle.name)} size="small" />
                )}
                <IconButton
                  size="small"
                  aria-label="Agregar a rutina"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDialogExercise(exercise)
                  }}
                >
                  <PlaylistAddIcon />
                </IconButton>
              </CardContent>
            </Card>
          </SwipeableRow>
        ))}
      </Box>

      {dialogExercise && (
        <AddToRoutineDialog
          exercise={dialogExercise}
          open={!!dialogExercise}
          onClose={() => setDialogExercise(null)}
          onAdded={() => setSnack('Agregado a tu rutina')}
        />
      )}

      <Snackbar
        open={!!snack}
        autoHideDuration={2500}
        onClose={() => setSnack('')}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 8 }}
      />
    </Box>
  )
}