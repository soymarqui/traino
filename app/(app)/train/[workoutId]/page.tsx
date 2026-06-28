    'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'

type SetRow = {
  id: string
  exercise_id: string
  set_number: number
  weight: number | null
  reps_target: number | null
  reps_actual: number | null
  rpe: number | null
  completed: boolean
}

type ExerciseWithSets = {
  id: string
  name: string
  suggested_sets: number
  reps_min: number
  reps_max: number
  rest_seconds: number
  sets: SetRow[]
}

export default function WorkoutPage() {
  const [exercises, setExercises] = useState<ExerciseWithSets[]>([])
  const [loading, setLoading] = useState(true)
  const [finishing, setFinishing] = useState(false)
  const router = useRouter()
  const params = useParams()
  const workoutId = params.workoutId as string
  const supabase = createClient()

  useEffect(() => {
    fetchWorkout()
  }, [])

  const fetchWorkout = async () => {
    const { data: sets } = await supabase
      .from('sets')
      .select('*, exercise:exercises(id, name, suggested_sets, reps_min, reps_max, rest_seconds)')
      .eq('workout_id', workoutId)
      .order('set_number')

    if (!sets) return

    // Agrupar por ejercicio
    const map = new Map<string, ExerciseWithSets>()
    sets.forEach((s: any) => {
      if (!map.has(s.exercise_id)) {
        map.set(s.exercise_id, {
          ...s.exercise,
          sets: [],
        })
      }
      map.get(s.exercise_id)!.sets.push({
        id: s.id,
        exercise_id: s.exercise_id,
        set_number: s.set_number,
        weight: s.weight,
        reps_target: s.reps_target,
        reps_actual: s.reps_actual,
        rpe: s.rpe,
        completed: s.completed,
      })
    })

    setExercises(Array.from(map.values()))
    setLoading(false)
  }

  const updateSet = async (setId: string, field: string, value: any) => {
    // Actualizar localmente
    setExercises((prev) =>
      prev.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) =>
          s.id === setId ? { ...s, [field]: value } : s
        ),
      }))
    )

    // Guardar en Supabase
    await supabase.from('sets').update({ [field]: value }).eq('id', setId)
  }

  const toggleComplete = async (setId: string, current: boolean) => {
    await updateSet(setId, 'completed', !current)
  }

  const handleFinish = async () => {
    setFinishing(true)
    await supabase
      .from('workouts')
      .update({
        finished_at: new Date().toISOString(),
      })
      .eq('id', workoutId)

    router.push('/history')
  }

  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0)
  const completedSets = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  )

  return (
    <Box sx={{ minHeight: '100vh', pb: 12 }}>
      {/* Header */}
      <Box sx={{ px: 3, pt: 4, pb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Entrenando
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {completedSets}/{totalSets} series completadas
        </Typography>
      </Box>

      {/* Ejercicios */}
      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {loading && <Typography color="text.secondary">Cargando...</Typography>}

        {exercises.map((exercise) => (
          <Card key={exercise.id}>
            <CardContent>
              <Typography variant="body1" sx={{ fontWeight: 700, mb: 0.5 }}>
                {exercise.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {exercise.reps_min}–{exercise.reps_max} reps · {exercise.rest_seconds}s descanso
              </Typography>

              {/* Cabecera de tabla */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 32px', gap: 1, mb: 1, px: 0.5 }}>
                <Typography variant="caption" color="text.secondary">#</Typography>
                <Typography variant="caption" color="text.secondary">Peso (kg)</Typography>
                <Typography variant="caption" color="text.secondary">Reps</Typography>
                <Box />
              </Box>

              {/* Series */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {exercise.sets.map((set) => (
                  <Box
                    key={set.id}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '32px 1fr 1fr 32px',
                      gap: 1,
                      alignItems: 'center',
                      opacity: set.completed ? 0.5 : 1,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {set.set_number}
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      value={set.weight ?? ''}
                      onChange={(e) => updateSet(set.id, 'weight', parseFloat(e.target.value) || null)}
                      placeholder="0"
                      slotProps={{ htmlInput: { style: { textAlign: 'center' } } }}
                    />
                    <TextField
                      size="small"
                      type="number"
                      value={set.reps_actual ?? set.reps_target ?? ''}
                      onChange={(e) => updateSet(set.id, 'reps_actual', parseInt(e.target.value) || null)}
                      placeholder={String(set.reps_target || '')}
                      slotProps={{ htmlInput: { style: { textAlign: 'center' } } }}
                    />
                    <Checkbox
                      checked={set.completed}
                      onChange={() => toggleComplete(set.id, set.completed)}
                      icon={<RadioButtonUncheckedIcon />}
                      checkedIcon={<CheckCircleIcon sx={{ color: 'primary.main' }} />}
                      sx={{ p: 0 }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Botón finalizar */}
      {!loading && (
        <Box sx={{ px: 3, mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleFinish}
            disabled={finishing}
          >
            {finishing ? 'Guardando...' : 'Finalizar entrenamiento'}
          </Button>
        </Box>
      )}
    </Box>
  )
}
