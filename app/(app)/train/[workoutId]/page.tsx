'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Slider from '@mui/material/Slider'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'

const FEELINGS = [
  { v: 1, e: '😵' },
  { v: 2, e: '😣' },
  { v: 3, e: '😐' },
  { v: 4, e: '🙂' },
  { v: 5, e: '😎' },
]
const GOOD = 4 // feeling >= GOOD se considera "cómodo"
const STEP = 2.5 // sugerencia de aumento de peso

function emoji(v: number | null) {
  return FEELINGS.find((f) => f.v === v)?.e ?? ''
}

type SetRow = {
  id: string
  exercise_id: string
  set_number: number
  weight: number | null
  reps_target: number | null
  reps_actual: number | null
  completed: boolean
  feeling: number | null
  rest_seconds: number | null
}

type ExerciseWithSets = {
  id: string
  name: string
  reps_min: number
  reps_max: number
  rest_seconds: number
  sets: SetRow[]
}

export default function WorkoutPage() {
  const [exercises, setExercises] = useState<ExerciseWithSets[]>([])
  const [suggestions, setSuggestions] = useState<Record<string, number>>({})
  const [lastWeight, setLastWeight] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [finishing, setFinishing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [marking, setMarking] = useState<{ set: SetRow; exName: string } | null>(null)
  const [weight, setWeight] = useState('')
  const [feeling, setFeeling] = useState(3)
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
      .select('*, exercise:exercises(id, name, reps_min, reps_max, rest_seconds)')
      .eq('workout_id', workoutId)
      .order('set_number')

    if (!sets) return

    const map = new Map<string, ExerciseWithSets>()
    sets.forEach((s: any) => {
      if (!map.has(s.exercise_id)) {
        map.set(s.exercise_id, { ...s.exercise, sets: [] })
      }
      map.get(s.exercise_id)!.sets.push({
        id: s.id,
        exercise_id: s.exercise_id,
        set_number: s.set_number,
        weight: s.weight,
        reps_target: s.reps_target,
        reps_actual: s.reps_actual,
        completed: s.completed,
        feeling: s.feeling,
        rest_seconds: s.rest_seconds,
      })
    })
    const list = Array.from(map.values())
    setExercises(list)
    setLoading(false)

    // Historial para sugerir progresión (sesiones anteriores).
    const exIds = list.map((e) => e.id)
    if (exIds.length) {
      const { data: hist } = await supabase
        .from('sets')
        .select('exercise_id, weight, feeling, workout:workouts(id, started_at)')
        .in('exercise_id', exIds)
        .eq('completed', true)
      computeProgression(hist || [])
    }
  }

  const computeProgression = (hist: any[]) => {
    const sugg: Record<string, number> = {}
    const last: Record<string, number> = {}

    const byExercise = new Map<string, any[]>()
    hist.forEach((h) => {
      if (!h.workout || h.workout.id === workoutId || h.weight == null) return
      if (!byExercise.has(h.exercise_id)) byExercise.set(h.exercise_id, [])
      byExercise.get(h.exercise_id)!.push(h)
    })

    byExercise.forEach((rows, exId) => {
      // Agrupar por sesión (workout): peso = máximo de la sesión, cómodo = todas >= GOOD.
      const sessions = new Map<string, { date: number; weight: number; good: boolean }>()
      rows.forEach((r) => {
        const wid = r.workout.id
        const date = new Date(r.workout.started_at).getTime()
        const prev = sessions.get(wid)
        const good = (r.feeling ?? 0) >= GOOD
        if (!prev) sessions.set(wid, { date, weight: r.weight, good })
        else
          sessions.set(wid, {
            date,
            weight: Math.max(prev.weight, r.weight),
            good: prev.good && good,
          })
      })
      const ordered = Array.from(sessions.values()).sort((a, b) => b.date - a.date)
      if (ordered.length) last[exId] = ordered[0].weight
      const top3 = ordered.slice(0, 3)
      if (
        top3.length >= 3 &&
        top3.every((s) => s.weight === top3[0].weight && s.good)
      ) {
        sugg[exId] = top3[0].weight + STEP
      }
    })

    setSuggestions(sugg)
    setLastWeight(last)
  }

  const openMark = (set: SetRow, exName: string, exId: string) => {
    setMarking({ set, exName })
    setWeight(
      set.weight != null
        ? String(set.weight)
        : suggestions[exId] != null
        ? String(suggestions[exId])
        : lastWeight[exId] != null
        ? String(lastWeight[exId])
        : ''
    )
    setFeeling(set.feeling ?? 3)
  }

  const saveMark = async () => {
    if (!marking) return
    const setId = marking.set.id
    const w = weight.trim() === '' ? null : parseFloat(weight)
    setExercises((prev) =>
      prev.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) =>
          s.id === setId
            ? { ...s, weight: w, feeling, completed: true, reps_actual: s.reps_target }
            : s
        ),
      }))
    )
    setMarking(null)
    await supabase
      .from('sets')
      .update({ weight: w, feeling, completed: true, reps_actual: marking.set.reps_target })
      .eq('id', setId)
  }

  const handleFinish = async () => {
    setFinishing(true)
    await supabase
      .from('workouts')
      .update({ finished_at: new Date().toISOString() })
      .eq('id', workoutId)
    router.push('/history')
  }

  const handleDelete = async () => {
    await supabase.from('sets').delete().eq('workout_id', workoutId)
    await supabase.from('workouts').delete().eq('id', workoutId)
    router.push('/dashboard')
  }

  const totalSets = exercises.reduce((a, ex) => a + ex.sets.length, 0)
  const completedSets = exercises.reduce(
    (a, ex) => a + ex.sets.filter((s) => s.completed).length,
    0
  )

  return (
    <Box sx={{ minHeight: '100vh', pb: 14 }}>
      <Box sx={{ px: 3, pt: 4, pb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Entrenando
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {completedSets}/{totalSets} series completadas
        </Typography>
      </Box>

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {loading && <Typography color="text.secondary">Cargando...</Typography>}

        {exercises.map((exercise) => (
          <Card key={exercise.id}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="body1" sx={{ fontWeight: 700, flex: 1 }}>
                  {exercise.name}
                </Typography>
                {suggestions[exercise.id] != null && (
                  <Chip
                    label={`Probá ${suggestions[exercise.id]} kg 💪`}
                    size="small"
                    color="primary"
                  />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {exercise.reps_min}–{exercise.reps_max} reps ·{' '}
                {(exercise.sets.find((s) => s.rest_seconds != null)?.rest_seconds ?? exercise.rest_seconds)}s descanso
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {exercise.sets.map((set) => (
                  <Box
                    key={set.id}
                    onClick={() => openMark(set, exercise.name, exercise.id)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1,
                      borderRadius: 2,
                      cursor: 'pointer',
                      bgcolor: set.completed ? 'action.selected' : 'transparent',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    {set.completed ? (
                      <CheckCircleIcon sx={{ color: 'primary.main' }} />
                    ) : (
                      <RadioButtonUncheckedIcon sx={{ color: 'text.secondary' }} />
                    )}
                    <Typography variant="body2" sx={{ width: 24, fontWeight: 600 }}>
                      {set.set_number}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                      {set.reps_target ? `${set.reps_target} reps` : 'serie'}
                    </Typography>
                    {set.completed ? (
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {set.weight != null ? `${set.weight} kg` : '—'} {emoji(set.feeling)}
                      </Typography>
                    ) : (
                      <Chip label="Hecho" size="small" variant="outlined" />
                    )}
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {!loading && (
        <Box sx={{ px: 3, mt: 4 }}>
          <Button variant="contained" size="large" fullWidth onClick={handleFinish} disabled={finishing}>
            {finishing ? 'Guardando...' : 'Finalizar entrenamiento'}
          </Button>
          <Button color="error" fullWidth onClick={() => setDeleteOpen(true)} sx={{ mt: 1 }}>
            Eliminar entrenamiento
          </Button>
        </Box>
      )}

      {/* Marcar serie como hecha */}
      <Dialog open={!!marking} onClose={() => setMarking(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {marking?.exName}
          <Typography variant="body2" color="text.secondary">
            Serie {marking?.set.set_number}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <TextField
            label="Peso (kg)"
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            fullWidth
            autoFocus
          />
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              ¿Cómo te sentiste?
            </Typography>
            <Box sx={{ px: 1 }}>
              <Slider
                value={feeling}
                onChange={(_, v) => setFeeling(v as number)}
                min={1}
                max={5}
                step={1}
                marks={FEELINGS.map((f) => ({ value: f.v, label: f.e }))}
                sx={{ '& .MuiSlider-markLabel': { fontSize: '1.2rem' } }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setMarking(null)}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={saveMark}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmar borrar entrenamiento */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Eliminar entrenamiento</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Se borra esta sesión y sus series. Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDeleteOpen(false)}>
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
