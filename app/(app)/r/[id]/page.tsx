'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { createClient } from '@/lib/supabase/client'
import { Equipment, Routine, RoutineDay, RoutineExercise, RoutineExerciseSet } from '@/types/database'
import { useRouter, useParams } from 'next/navigation'

const EQUIPMENT_LABELS: Record<Equipment, string> = {
  maquina: 'Máquina',
  mancuernas: 'Mancuernas',
  barra: 'Barra',
  polea: 'Polea',
  peso_corporal: 'Peso corporal',
}

function setsSummary(sets: RoutineExerciseSet[]): string {
  return sets
    .slice()
    .sort((a, b) => a.set_number - b.set_number)
    .map((s) => {
      if (s.to_failure) return 'fallo'
      if (s.duration_seconds != null) return `${s.duration_seconds}s`
      if (s.reps != null) return s.reps_max ? `${s.reps}-${s.reps_max}` : String(s.reps)
      return '—'
    })
    .join(' · ')
}

export default function PublicRoutinePage() {
  const params = useParams()
  const routineId = params.id as string
  const [routine, setRoutine] = useState<Routine | null>(null)
  const [owner, setOwner] = useState<{ handle: string | null; display_name: string | null; identity: string | null } | null>(null)
  const [days, setDays] = useState<RoutineDay[]>([])
  const [items, setItems] = useState<RoutineExercise[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)

    const { data: r } = await supabase.from('routines').select('*').eq('id', routineId).maybeSingle()
    if (!r) {
      setLoading(false)
      return
    }
    setRoutine(r as Routine)

    const [{ data: prof }, { data: d }, { data: ex }, { data: sub }] = await Promise.all([
      supabase.from('profiles').select('handle, display_name, identity').eq('id', (r as Routine).owner_id).maybeSingle(),
      supabase.from('routine_days').select('*').eq('routine_id', routineId).order('position'),
      supabase
        .from('routine_exercises')
        .select('*, exercise:exercises(id, name, muscle:muscles(name)), sets:routine_exercise_sets(*)')
        .eq('routine_id', routineId)
        .order('position'),
      user
        ? supabase.from('routine_subscriptions').select('id').eq('user_id', user.id).eq('routine_id', routineId).maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    setOwner(prof as { handle: string | null; display_name: string | null; identity: string | null } | null)
    setDays((d as RoutineDay[]) || [])
    setItems((ex as RoutineExercise[]) || [])
    setSubscribed(!!sub)
    setLoading(false)
  }

  const isOwner = userId && routine && routine.owner_id === userId

  const toggleSubscribe = async () => {
    if (!userId) return
    setBusy(true)
    if (subscribed) {
      setSubscribed(false)
      await supabase.from('routine_subscriptions').delete().eq('user_id', userId).eq('routine_id', routineId)
    } else {
      setSubscribed(true)
      await supabase.from('routine_subscriptions').insert({ user_id: userId, routine_id: routineId })
    }
    setBusy(false)
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 12 }}>
      <Box sx={{ px: 3, pt: 4, pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => router.back()}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Rutina
        </Typography>
      </Box>

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {loading && <Typography color="text.secondary">Cargando...</Typography>}

        {!loading && !routine && (
          <Typography color="text.secondary">Esta rutina no existe o no es pública.</Typography>
        )}

        {!loading && routine && (
          <>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {routine.name}
              </Typography>
              {owner?.handle && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    por @{owner.handle}
                  </Typography>
                  {owner.identity && (
                    <Chip
                      label={{ gymbro: 'GymBro', gymsis: 'GymSis', gympal: 'GymPal' }[owner.identity] ?? owner.identity}
                      size="small"
                      color="primary"
                      sx={{ height: 20 }}
                    />
                  )}
                </Box>
              )}
            </Box>

            {!isOwner && (
              <Button variant="contained" onClick={toggleSubscribe} disabled={busy}>
                {subscribed ? 'Suscrito ✓ (tocá para quitar)' : 'Suscribirme'}
              </Button>
            )}
            {isOwner && (
              <Typography variant="body2" color="text.secondary">
                Es tu rutina.
              </Typography>
            )}

            {days.map((day) => {
              const dayItems = items.filter((i) => i.routine_day_id === day.id)
              return (
                <Box key={day.id} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {day.name}
                  </Typography>
                  {dayItems.map((item) => (
                    <Card key={item.id}>
                      <CardContent sx={{ py: 1.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {item.exercise?.name ?? 'Ejercicio'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.sets?.length ?? 0} series · {setsSummary(item.sets ?? [])}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                          {item.equipment && (
                            <Chip label={EQUIPMENT_LABELS[item.equipment]} size="small" />
                          )}
                          {item.unilateral && (
                            <Chip label="Unilateral" size="small" sx={{ opacity: 0.8 }} />
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )
            })}
          </>
        )}
      </Box>
    </Box>
  )
}
