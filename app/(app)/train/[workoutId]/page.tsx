'use client'

import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Slider from '@mui/material/Slider'
import TextField from '@mui/material/TextField'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import LinearProgress from '@mui/material/LinearProgress'
import IconButton from '@mui/material/IconButton'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { muscleLabel } from '@/lib/muscles'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto'
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
  is_warmup: boolean
  muscle?: { name: string; slug: string } | null
  sets: SetRow[]
}

export default function WorkoutPage() {
  const [exercises, setExercises] = useState<ExerciseWithSets[]>([])
  const [suggestions, setSuggestions] = useState<Record<string, number>>({})
  const [lastWeight, setLastWeight] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [finishing, setFinishing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)
  const [routineRef, setRoutineRef] = useState<
    Record<string, Record<number, { id: string; reps: number | null; weight: number | null }>>
  >({})
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([])
  const [shareOpen, setShareOpen] = useState(false)
  const [shareSel, setShareSel] = useState<string[]>([])
  const [shared, setShared] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [marking, setMarking] = useState<{ set: SetRow; exName: string } | null>(null)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [feeling, setFeeling] = useState(3)
  const router = useRouter()
  const params = useParams()
  const workoutId = params.workoutId as string
  const supabase = createClient()

  useEffect(() => {
    fetchWorkout()
  }, [])

  const fetchWorkout = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)

    const { data: workout } = await supabase
      .from('workouts')
      .select('photo_url')
      .eq('id', workoutId)
      .maybeSingle()
    setPhotoUrl((workout as { photo_url: string | null } | null)?.photo_url ?? '')

    supabase.from('groups').select('id, name').then(({ data }) => setGroups(data || []))

    // Referencia de la rutina activa (para "Actualizar en rutina").
    if (user) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('active_routine_id')
        .eq('id', user.id)
        .maybeSingle()
      const rid = (prof as { active_routine_id: string | null } | null)?.active_routine_id
      if (rid) {
        const { data: res } = await supabase
          .from('routine_exercises')
          .select('exercise_id, sets:routine_exercise_sets(id, set_number, reps, weight)')
          .eq('routine_id', rid)
        const ref: Record<string, Record<number, { id: string; reps: number | null; weight: number | null }>> = {}
        ;(res || []).forEach((re: any) => {
          ref[re.exercise_id] = {}
          ;(re.sets || []).forEach((s: { id: string; set_number: number; reps: number | null; weight: number | null }) => {
            ref[re.exercise_id][s.set_number] = { id: s.id, reps: s.reps, weight: s.weight }
          })
        })
        setRoutineRef(ref)
      }
    }

    const { data: sets } = await supabase
      .from('sets')
      .select('*, exercise:exercises(id, name, reps_min, reps_max, rest_seconds, is_warmup, muscle:muscles(name, slug))')
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
    // Warm-ups primero.
    list.sort((a, b) => (b.is_warmup ? 1 : 0) - (a.is_warmup ? 1 : 0))
    setExercises(list)
    // Expandir el primer ejercicio con series pendientes.
    const firstIncomplete = list.find((e) => e.sets.some((s) => !s.completed))
    setExpandedId(firstIncomplete?.id ?? list[0]?.id ?? null)
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
    setReps(set.reps_actual != null ? String(set.reps_actual) : set.reps_target != null ? String(set.reps_target) : '')
  }

  const saveMark = async () => {
    if (!marking) return
    const setId = marking.set.id
    const w = weight.trim() === '' ? null : parseFloat(weight)
    const r = reps.trim() === '' ? null : parseInt(reps)
    setExercises((prev) =>
      prev.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) =>
          s.id === setId ? { ...s, weight: w, feeling, completed: true, reps_actual: r } : s
        ),
      }))
    )
    setMarking(null)
    await supabase
      .from('sets')
      .update({ weight: w, feeling, completed: true, reps_actual: r })
      .eq('id', setId)
  }

  const updateRoutineRef = async () => {
    if (!marking) return
    const ex = marking.set.exercise_id
    const sn = marking.set.set_number
    const ref = routineRef[ex]?.[sn]
    const w = weight.trim() === '' ? null : parseFloat(weight)
    const r = reps.trim() === '' ? null : parseInt(reps)
    if (ref) {
      await supabase.from('routine_exercise_sets').update({ weight: w, reps: r }).eq('id', ref.id)
      setRoutineRef((prev) => ({ ...prev, [ex]: { ...prev[ex], [sn]: { ...ref, weight: w, reps: r } } }))
    }
    await saveMark()
  }

  const deleteSet = async () => {
    if (!marking) return
    const setId = marking.set.id
    setExercises((prev) =>
      prev.map((ex) => ({ ...ex, sets: ex.sets.filter((s) => s.id !== setId) }))
    )
    setMarking(null)
    await supabase.from('sets').delete().eq('id', setId)
  }

  const addSet = async (ex: ExerciseWithSets) => {
    const nextNumber = ex.sets.reduce((m, s) => Math.max(m, s.set_number), 0) + 1
    const last = ex.sets[ex.sets.length - 1]
    const { data } = await supabase
      .from('sets')
      .insert({
        workout_id: workoutId,
        exercise_id: ex.id,
        set_number: nextNumber,
        reps_target: last?.reps_target ?? null,
        rest_seconds: last?.rest_seconds ?? null,
        completed: false,
      })
      .select()
      .single()
    if (data) {
      setExercises((prev) =>
        prev.map((e) =>
          e.id === ex.id
            ? {
                ...e,
                sets: [
                  ...e.sets,
                  {
                    id: data.id,
                    exercise_id: ex.id,
                    set_number: nextNumber,
                    weight: null,
                    reps_target: last?.reps_target ?? null,
                    reps_actual: null,
                    completed: false,
                    feeling: null,
                    rest_seconds: last?.rest_seconds ?? null,
                  },
                ],
              }
            : e
        )
      )
    }
  }

  const handleFinish = async () => {
    setFinishing(true)
    await supabase
      .from('workouts')
      .update({ finished_at: new Date().toISOString() })
      .eq('id', workoutId)
    setFinishing(false)
    setShowSummary(true)
  }

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploadingPhoto(true)
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${userId}/${workoutId}.${ext}`
    const { error } = await supabase.storage
      .from('workout-photos')
      .upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('workout-photos').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`
      await supabase.from('workouts').update({ photo_url: url }).eq('id', workoutId)
      setPhotoUrl(url)
    }
    setUploadingPhoto(false)
  }

  const shareToGroups = async () => {
    const summaryText = `${exercises.length} ejercicios · ${completedSets} series`
    for (const gid of shareSel) {
      await supabase.from('group_posts').insert({
        group_id: gid,
        user_id: userId,
        workout_id: workoutId,
        summary: summaryText,
        photo_url: photoUrl || null,
      })
    }
    setShareOpen(false)
    setShared(true)
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

  if (showSummary) {
    return (
      <Box
        sx={{
          minHeight: '100vh', pb: 12, px: 3, pt: 8,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textAlign: 'center',
        }}
      >
        <input ref={photoRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
        <CheckCircleIcon sx={{ fontSize: 64, color: 'primary.main' }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          ¡Entrenamiento terminado!
        </Typography>
        <Typography color="text.secondary">
          {completedSets}/{totalSets} series · {exercises.length} ejercicios
        </Typography>

        {photoUrl && (
          <Box
            component="img"
            src={photoUrl}
            alt="Foto del entrenamiento"
            sx={{ width: '100%', maxWidth: 360, borderRadius: 3, mt: 1 }}
          />
        )}

        <Button
          variant="outlined"
          color="inherit"
          startIcon={<AddAPhotoIcon />}
          onClick={() => photoRef.current?.click()}
          disabled={uploadingPhoto}
          sx={{ mt: 1 }}
        >
          {uploadingPhoto ? 'Subiendo...' : photoUrl ? 'Cambiar foto' : 'Agregar foto'}
        </Button>

        {groups.length > 0 && (
          <Button
            variant="outlined"
            color="inherit"
            fullWidth
            onClick={() => setShareOpen(true)}
            disabled={shared}
            sx={{ mt: 1 }}
          >
            {shared ? 'Compartido ✓' : 'Compartir a un grupo'}
          </Button>
        )}

        <Button variant="contained" size="large" fullWidth onClick={() => router.push('/history')} sx={{ mt: 2 }}>
          Ver historial
        </Button>

        {/* Compartir a grupos */}
        <Dialog open={shareOpen} onClose={() => setShareOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle>Compartir entrenamiento</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Elegí a qué grupos enviarlo:
            </Typography>
            {groups.map((g) => (
              <FormControlLabel
                key={g.id}
                control={
                  <Checkbox
                    checked={shareSel.includes(g.id)}
                    onChange={() =>
                      setShareSel((prev) =>
                        prev.includes(g.id) ? prev.filter((x) => x !== g.id) : [...prev, g.id]
                      )
                    }
                  />
                }
                label={g.name}
                sx={{ display: 'flex' }}
              />
            ))}
          </DialogContent>
          <DialogActions>
            <Button color="inherit" onClick={() => setShareOpen(false)}>
              Cancelar
            </Button>
            <Button variant="contained" onClick={shareToGroups} disabled={shareSel.length === 0}>
              Compartir
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 14 }}>
      <input ref={photoRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
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

        {exercises.map((exercise, idx) => {
          const prev = exercises[idx - 1]
          const showWarmupHeader = exercise.is_warmup && idx === 0
          const showMainHeader = !exercise.is_warmup && (idx === 0 || prev?.is_warmup)
          return (
          <Box key={exercise.id} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {showWarmupHeader && (
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', textTransform: 'uppercase', letterSpacing: 1 }}>
              🔥 Warm-Up
            </Typography>
          )}
          {showMainHeader && exercises.some((e) => e.is_warmup) && (
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
              Ejercicios
            </Typography>
          )}
          {(() => {
            const total = exercise.sets.length
            const done = exercise.sets.filter((s) => s.completed).length
            const pct = total ? (done / total) * 100 : 0
            const expanded = expandedId === exercise.id
            return (
          <Card sx={exercise.is_warmup ? { borderColor: 'primary.main' } : undefined}>
            <CardContent>
              {/* Header (colapsable) */}
              <Box
                onClick={() => setExpandedId(expanded ? null : exercise.id)}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
              >
                <Box sx={{ flex: 1 }}>
                  {exercise.muscle?.name && (
                    <Chip
                      label={muscleLabel(exercise.muscle.slug, exercise.muscle.name)}
                      size="small"
                      sx={{ mb: 0.5, height: 20 }}
                    />
                  )}
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    {exercise.is_warmup && '🔥 '}{exercise.name}
                  </Typography>
                </Box>
                {suggestions[exercise.id] != null && (
                  <Chip label={`Probá ${suggestions[exercise.id]} kg 💪`} size="small" color="primary" />
                )}
                <Typography variant="caption" color="text.secondary">
                  {done}/{total}
                </Typography>
                <IconButton
                  size="small"
                  aria-label="Ver ejercicio"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation()
                    router.push(`/exercises/${exercise.id}`)
                  }}
                >
                  <ChevronRightIcon />
                </IconButton>
                <ExpandMoreIcon
                  sx={{ color: 'text.secondary', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                />
              </Box>
              <LinearProgress
                variant="determinate"
                value={pct}
                sx={{ mt: 1, borderRadius: 2, height: 6 }}
              />

              {!expanded ? null : (
              <>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
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
                    {set.completed && (
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {set.weight != null ? `${set.weight} kg` : '—'} {emoji(set.feeling)}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
              <Button size="small" onClick={() => addSet(exercise)} sx={{ mt: 1 }}>
                + Agregar serie
              </Button>
              </>
              )}
            </CardContent>
          </Card>
            )
          })()}
          </Box>
          )
        })}
      </Box>

      {!loading && (
        <Box sx={{ px: 3, mt: 4 }}>
          {photoUrl && (
            <Box
              component="img"
              src={photoUrl}
              alt="Foto del entrenamiento"
              sx={{ width: '100%', borderRadius: 3, mb: 1 }}
            />
          )}
          <Button
            color="inherit"
            fullWidth
            startIcon={<AddAPhotoIcon />}
            onClick={() => photoRef.current?.click()}
            disabled={uploadingPhoto}
            sx={{ mb: 1 }}
          >
            {uploadingPhoto ? 'Subiendo...' : photoUrl ? 'Cambiar foto' : 'Agregar foto'}
          </Button>
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
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Peso (kg)"
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Reps"
              type="number"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              fullWidth
            />
          </Box>
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

          {(() => {
            const ref = marking ? routineRef[marking.set.exercise_id]?.[marking.set.set_number] : undefined
            if (!ref) return null
            const w = weight.trim() === '' ? null : parseFloat(weight)
            const r = reps.trim() === '' ? null : parseInt(reps)
            if (w === ref.weight && r === ref.reps) return null
            return (
              <Button variant="outlined" color="primary" onClick={updateRoutineRef}>
                Actualizar en rutina
              </Button>
            )
          })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="error" onClick={deleteSet} sx={{ mr: 'auto' }}>
            Eliminar serie
          </Button>
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
