'use client'

import { Suspense, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { createClient } from '@/lib/supabase/client'
import { muscleEmoji, muscleLabel } from '@/lib/muscles'
import { gradientBorderSx } from '@/lib/theme'
import { useRestTimer } from '@/components/RestTimer'
import { useRouter, useSearchParams } from 'next/navigation'

type DayRow = {
  id: string
  name: string
  position: number
  routine_exercises: { exercise: { muscle: { slug: string } | null } | null }[]
}

type CustomItem = {
  exercise_id: string
  name: string
  muscleSlug: string | null
  muscleName: string | null
  restSeconds: number | null
  sets: { set_number: number; reps: number | null }[]
}

// Emojis distintos de los músculos del día (cue visual rápido).
function dayMuscleEmojis(day: DayRow): string[] {
  const slugs = new Set<string>()
  ;(day.routine_exercises || []).forEach((re: any) => {
    const ex = Array.isArray(re.exercise) ? re.exercise[0] : re.exercise
    const m = ex && (Array.isArray(ex.muscle) ? ex.muscle[0] : ex.muscle)
    if (m?.slug) slugs.add(m.slug)
  })
  return [...slugs].map((s) => muscleEmoji(s)).filter(Boolean) as string[]
}

function formatDateLabel(d: string): string {
  return new Date(`${d}T12:00:00`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function TrainInner() {
  const [routineName, setRoutineName] = useState<string | null>(null)
  const [days, setDays] = useState<DayRow[]>([])
  const [items, setItems] = useState<CustomItem[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [startingCustom, setStartingCustom] = useState(false)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const date = searchParams.get('date') // YYYY-MM-DD para registrar un día pasado
  const supabase = createClient()
  const { startCountdown } = useRestTimer()

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('active_routine_id')
      .eq('id', user.id)
      .maybeSingle()

    const activeId = (profile as { active_routine_id: string | null } | null)?.active_routine_id
    if (!activeId) {
      setLoading(false)
      return
    }

    const [{ data: routine }, { data: daysData }, { data: res }] = await Promise.all([
      supabase.from('routines').select('name').eq('id', activeId).maybeSingle(),
      supabase
        .from('routine_days')
        .select('id, name, position, routine_exercises(exercise:exercises(muscle:muscles(slug)))')
        .eq('routine_id', activeId)
        .order('position'),
      supabase
        .from('routine_exercises')
        .select('exercise_id, rest_seconds, exercise:exercises(id, name, muscle:muscles(slug, name)), sets:routine_exercise_sets(set_number, reps)')
        .eq('routine_id', activeId)
        .order('position'),
    ])

    setRoutineName((routine as { name: string } | null)?.name ?? null)
    setDays((daysData as unknown as DayRow[]) || [])

    // Ejercicios de la rutina (deduplicados) para armar un entrenamiento a medida.
    const map = new Map<string, CustomItem>()
    ;(res || []).forEach((re: any) => {
      if (map.has(re.exercise_id)) return
      const ex = Array.isArray(re.exercise) ? re.exercise[0] : re.exercise
      const m = ex && (Array.isArray(ex.muscle) ? ex.muscle[0] : ex.muscle)
      map.set(re.exercise_id, {
        exercise_id: re.exercise_id,
        name: ex?.name ?? 'Ejercicio',
        muscleSlug: m?.slug ?? null,
        muscleName: m?.name ?? null,
        restSeconds: re.rest_seconds ?? null,
        sets: (re.sets || []).slice().sort((a: any, b: any) => a.set_number - b.set_number),
      })
    })
    setItems([...map.values()])
    setLoading(false)
  }

  const toggleItem = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const startCustom = async () => {
    if (selected.length === 0) return
    setStartingCustom(true)
    if (!date) startCountdown(5)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: workout, error } = await supabase
      .from('workouts')
      .insert({
        user_id: user?.id,
        ...(date ? { started_at: new Date(`${date}T12:00:00`).toISOString() } : {}),
      })
      .select()
      .single()
    if (error || !workout) {
      setStartingCustom(false)
      return
    }
    const chosen = items.filter((it) => selected.includes(it.exercise_id))
    const rows = chosen.flatMap((it) => {
      const sets = it.sets.length ? it.sets : [{ set_number: 1, reps: null }]
      return sets.map((s) => ({
        workout_id: workout.id,
        exercise_id: it.exercise_id,
        set_number: s.set_number,
        reps_target: s.reps,
        rest_seconds: it.restSeconds,
        completed: false,
      }))
    })
    if (rows.length) await supabase.from('sets').insert(rows)
    router.push(`/train/${workout.id}`)
  }

  const startDay = async (dayId: string) => {
    setStarting(dayId)
    if (!date) startCountdown(5)
    const { data: { user } } = await supabase.auth.getUser()

    const { data: exs } = await supabase
      .from('routine_exercises')
      .select('exercise_id, position, rest_seconds, exercise:exercises(muscle_id), sets:routine_exercise_sets(*)')
      .eq('routine_day_id', dayId)
      .order('position')

    const { data: workout, error } = await supabase
      .from('workouts')
      .insert({
        user_id: user?.id,
        ...(date ? { started_at: new Date(`${date}T12:00:00`).toISOString() } : {}),
      })
      .select()
      .single()
    if (error || !workout) {
      setStarting(null)
      return
    }

    const rows: {
      workout_id: string
      exercise_id: string
      set_number: number
      reps_target: number | null
      rest_seconds: number | null
      completed: boolean
    }[] = []
    ;(exs || []).forEach(
      (re: { exercise_id: string; rest_seconds: number | null; sets: { set_number: number; reps: number | null }[] }) => {
        const sets = (re.sets || []).slice().sort((a, b) => a.set_number - b.set_number)
        const list = sets.length ? sets : [{ set_number: 1, reps: null }]
        list.forEach((s) =>
          rows.push({
            workout_id: workout.id,
            exercise_id: re.exercise_id,
            set_number: s.set_number,
            reps_target: s.reps,
            rest_seconds: re.rest_seconds,
            completed: false,
          })
        )
      }
    )

    // Warm-up automático según los músculos del día (1 serie c/u, primero).
    const muscleIds = [
      ...new Set(
        (exs || [])
          .map((re: any) => {
            const ex = Array.isArray(re.exercise) ? re.exercise[0] : re.exercise
            return ex?.muscle_id as string | undefined
          })
          .filter(Boolean)
      ),
    ]
    const exerciseIds = new Set((exs || []).map((re: { exercise_id: string }) => re.exercise_id))
    const warmupRows: typeof rows = []
    if (muscleIds.length) {
      const { data: warmups } = await supabase
        .from('exercises')
        .select('id, reps_min')
        .eq('is_warmup', true)
        .eq('active', true)
        .in('muscle_id', muscleIds)
      ;(warmups || []).forEach((w: { id: string; reps_min: number | null }) => {
        if (exerciseIds.has(w.id)) return
        warmupRows.push({
          workout_id: workout.id,
          exercise_id: w.id,
          set_number: 1,
          reps_target: w.reps_min,
          rest_seconds: null,
          completed: false,
        })
      })
    }

    const allRows = [...warmupRows, ...rows]
    if (allRows.length) await supabase.from('sets').insert(allRows)
    router.push(`/train/${workout.id}`)
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: selected.length > 0 ? 20 : 12 }}>
      {/* Header */}
      <Box sx={{ px: 3, pt: 4, pb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Entrenamiento
        </Typography>
        {routineName && (
          <Typography variant="body2" color="text.secondary">
            Rutina activa: <b>{routineName}</b>
          </Typography>
        )}
      </Box>

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {date && (
          <Alert severity="info">
            Registrando un entrenamiento del <b>{formatDateLabel(date)}</b>
          </Alert>
        )}

        {loading && <Typography color="text.secondary">Cargando...</Typography>}

        {!loading && !routineName && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pt: 6, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No tenés una rutina activa. Activá una para entrenar con tu plan.
            </Typography>
            <Button variant="contained" href="/routine">
              Ir a mis rutinas
            </Button>
          </Box>
        )}

        {!loading && routineName && (
          <>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}
            >
              {date ? `¿Qué hiciste el ${formatDateLabel(date)}?` : '¿Qué hacés hoy?'}
            </Typography>

            {days.map((day) => {
              const count = day.routine_exercises?.length ?? 0
              const emojis = dayMuscleEmojis(day)
              return (
                <Card key={day.id}>
                  <CardActionArea
                    disabled={starting !== null || count === 0}
                    onClick={() => startDay(day.id)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700, flex: 1 }}>
                          {day.name}
                        </Typography>
                        {emojis.length > 0 && (
                          <Typography sx={{ fontSize: '1.15rem', letterSpacing: 1 }}>
                            {emojis.join(' ')}
                          </Typography>
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {count} ejercicios{starting === day.id ? (date ? ' · agregando...' : ' · empezando...') : ''}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              )
            })}

            {/* Armá tu propio entrenamiento eligiendo ejercicios de la rutina */}
            {items.length > 0 && (
              <>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, mt: 2 }}
                >
                  O armá el tuyo
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  {items.map((it) => {
                    const isSelected = selected.includes(it.exercise_id)
                    return (
                      <Card key={it.exercise_id} sx={isSelected ? gradientBorderSx(18) : { borderRadius: '18px' }}>
                        <CardActionArea onClick={() => toggleItem(it.exercise_id)} sx={{ height: '100%' }}>
                          <Box sx={{ aspectRatio: '1 / 1', p: 1.5, display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography sx={{ fontSize: '1.6rem' }}>
                                {muscleEmoji(it.muscleSlug) || '🏋️'}
                              </Typography>
                              {isSelected && <CheckCircleIcon sx={{ color: 'primary.main' }} />}
                            </Box>
                            <Box sx={{ flex: 1 }} />
                            <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                              {it.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {muscleLabel(it.muscleSlug ?? undefined, it.muscleName ?? '')}
                              {it.sets.length ? ` · ${it.sets.length} series` : ''}
                            </Typography>
                          </Box>
                        </CardActionArea>
                      </Card>
                    )
                  })}
                </Box>
              </>
            )}
          </>
        )}

        <Button
          variant="outlined"
          color="inherit"
          href={date ? `/train/free?date=${date}` : '/train/free'}
          sx={{ mt: routineName ? 1 : 2 }}
        >
          Entrenamiento libre
        </Button>
      </Box>

      {selected.length > 0 && (
        <Box sx={{ position: 'fixed', bottom: '96px', left: '50%', transform: 'translateX(-50%)', width: 'min(568px, calc(100% - 32px))', zIndex: 11 }}>
          <Button variant="contained" size="large" fullWidth onClick={startCustom} disabled={startingCustom}>
            {startingCustom
              ? 'Guardando...'
              : `${date ? 'Agregar entrenamiento' : 'Iniciar entrenamiento'} (${selected.length})`}
          </Button>
        </Box>
      )}
    </Box>
  )
}

export default function TrainPage() {
  return (
    <Suspense fallback={null}>
      <TrainInner />
    </Suspense>
  )
}
