'use client'

import { Suspense, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { createClient } from '@/lib/supabase/client'
import { muscleLabel, muscleEmoji } from '@/lib/muscles'
import { gradientBorderSx } from '@/lib/theme'
import { useRouter, useSearchParams } from 'next/navigation'

type Item = {
  exercise_id: string
  name: string
  muscleSlug: string | null
  muscleName: string | null
  restSeconds: number | null
  sets: { set_number: number; reps: number | null }[]
}

function CustomTrainInner() {
  const [routineName, setRoutineName] = useState<string | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const date = searchParams.get('date')
  const supabase = createClient()

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

    const [{ data: routine }, { data: res }] = await Promise.all([
      supabase.from('routines').select('name').eq('id', activeId).maybeSingle(),
      supabase
        .from('routine_exercises')
        .select('exercise_id, rest_seconds, exercise:exercises(id, name, muscle:muscles(slug, name)), sets:routine_exercise_sets(set_number, reps)')
        .eq('routine_id', activeId)
        .order('position'),
    ])
    setRoutineName((routine as { name: string } | null)?.name ?? null)

    // Dedup por ejercicio (puede repetirse en varios días).
    const map = new Map<string, Item>()
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

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const handleStart = async () => {
    if (selected.length === 0) return
    setStarting(true)
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
      setStarting(false)
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

  return (
    <Box sx={{ minHeight: '100vh', pb: 16 }}>
      <Box sx={{ px: 3, pt: 4, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => router.push('/train')}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Entrenamiento custom
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Elegí qué ejercicios hacés hoy{routineName ? ` · ${routineName}` : ''}
          </Typography>
        </Box>
      </Box>

      {loading && <Typography color="text.secondary" sx={{ px: 3 }}>Cargando...</Typography>}

      {!loading && items.length === 0 && (
        <Box sx={{ px: 3, pt: 6, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
          <Typography color="text.secondary">
            Tu rutina activa no tiene ejercicios (o no tenés una activa).
          </Typography>
          <Button variant="contained" onClick={() => router.push('/routine')}>
            Ir a mis rutinas
          </Button>
        </Box>
      )}

      {!loading && items.length > 0 && (
        <Box sx={{ px: 3, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          {items.map((it) => {
            const isSelected = selected.includes(it.exercise_id)
            return (
              <Card
                key={it.exercise_id}
                sx={isSelected ? gradientBorderSx(18) : { borderRadius: '18px' }}
              >
                <CardActionArea onClick={() => toggle(it.exercise_id)} sx={{ height: '100%' }}>
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
      )}

      {selected.length > 0 && (
        <Box sx={{ position: 'fixed', bottom: '96px', left: '50%', transform: 'translateX(-50%)', width: 'min(568px, calc(100% - 32px))', zIndex: 11 }}>
          <Button variant="contained" size="large" fullWidth onClick={handleStart} disabled={starting}>
            {starting ? 'Iniciando...' : `Iniciar entrenamiento (${selected.length})`}
          </Button>
        </Box>
      )}
    </Box>
  )
}

export default function CustomTrainPage() {
  return (
    <Suspense fallback={null}>
      <CustomTrainInner />
    </Suspense>
  )
}
