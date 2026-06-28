'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type DayRow = {
  id: string
  name: string
  position: number
  routine_exercises: { count: number }[]
}

export default function TrainPage() {
  const [routineName, setRoutineName] = useState<string | null>(null)
  const [days, setDays] = useState<DayRow[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<string | null>(null)
  const router = useRouter()
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

    const [{ data: routine }, { data: daysData }] = await Promise.all([
      supabase.from('routines').select('name').eq('id', activeId).maybeSingle(),
      supabase
        .from('routine_days')
        .select('id, name, position, routine_exercises(count)')
        .eq('routine_id', activeId)
        .order('position'),
    ])

    setRoutineName((routine as { name: string } | null)?.name ?? null)
    setDays((daysData as DayRow[]) || [])
    setLoading(false)
  }

  const startDay = async (dayId: string) => {
    setStarting(dayId)
    const { data: { user } } = await supabase.auth.getUser()

    const { data: exs } = await supabase
      .from('routine_exercises')
      .select('exercise_id, position, sets:routine_exercise_sets(*)')
      .eq('routine_day_id', dayId)
      .order('position')

    const { data: workout, error } = await supabase
      .from('workouts')
      .insert({ user_id: user?.id })
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
      completed: boolean
    }[] = []
    ;(exs || []).forEach((re: { exercise_id: string; sets: { set_number: number; reps: number | null }[] }) => {
      const sets = (re.sets || []).slice().sort((a, b) => a.set_number - b.set_number)
      const list = sets.length ? sets : [{ set_number: 1, reps: null }]
      list.forEach((s) =>
        rows.push({
          workout_id: workout.id,
          exercise_id: re.exercise_id,
          set_number: s.set_number,
          reps_target: s.reps,
          completed: false,
        })
      )
    })

    if (rows.length) await supabase.from('sets').insert(rows)
    router.push(`/train/${workout.id}`)
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 12 }}>
      {/* Header */}
      <Box sx={{ px: 3, pt: 4, pb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Entrenar
        </Typography>
        {routineName && (
          <Typography variant="body2" color="text.secondary">
            Rutina activa: <b>{routineName}</b>
          </Typography>
        )}
      </Box>

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
              ¿Qué hacés hoy?
            </Typography>

            {days.map((day) => {
              const count = day.routine_exercises?.[0]?.count ?? 0
              return (
                <Card key={day.id}>
                  <CardActionArea
                    disabled={starting !== null || count === 0}
                    onClick={() => startDay(day.id)}
                  >
                    <CardContent>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>
                        {day.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {count} ejercicios{starting === day.id ? ' · empezando...' : ''}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              )
            })}
          </>
        )}

        <Button variant="outlined" color="inherit" href="/train/free" sx={{ mt: 2 }}>
          Entrenamiento libre
        </Button>
      </Box>
    </Box>
  )
}
