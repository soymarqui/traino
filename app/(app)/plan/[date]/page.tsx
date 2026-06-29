'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Checkbox from '@mui/material/Checkbox'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { createClient } from '@/lib/supabase/client'
import { muscleLabel } from '@/lib/muscles'
import { Exercise, Muscle } from '@/types/database'
import { useRouter, useParams } from 'next/navigation'

function formatDateLabel(d: string): string {
  return new Date(`${d}T12:00:00`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default function PlanDayPage() {
  const params = useParams()
  const date = params.date as string
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [muscles, setMuscles] = useState<Muscle[]>([])
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)

    const [{ data: ex }, { data: ms }] = await Promise.all([
      supabase.from('exercises').select('*, muscle:muscles(id, name, slug)').eq('active', true).order('name'),
      supabase.from('muscles').select('*').order('name'),
    ])
    setExercises((ex as Exercise[]) || [])
    setMuscles(ms || [])

    if (user) {
      const { data: plan } = await supabase
        .from('planned_workouts')
        .select('id, planned_workout_exercises(exercise_id)')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle()
      if (plan) {
        setSelected(
          ((plan as { planned_workout_exercises: { exercise_id: string }[] }).planned_workout_exercises || []).map(
            (p) => p.exercise_id
          )
        )
      }
    }
    setLoading(false)
  }

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const filtered = selectedMuscle ? exercises.filter((e) => e.muscle_id === selectedMuscle) : exercises

  const save = async () => {
    if (!userId) return
    setSaving(true)

    if (selected.length === 0) {
      // Sin ejercicios = quitar el plan.
      await supabase.from('planned_workouts').delete().eq('user_id', userId).eq('date', date)
      router.push('/history')
      return
    }

    const { data: plan } = await supabase
      .from('planned_workouts')
      .upsert({ user_id: userId, date }, { onConflict: 'user_id,date' })
      .select()
      .single()
    if (!plan) {
      setSaving(false)
      return
    }

    await supabase.from('planned_workout_exercises').delete().eq('planned_workout_id', plan.id)
    await supabase.from('planned_workout_exercises').insert(
      selected.map((exId, i) => ({ planned_workout_id: plan.id, exercise_id: exId, position: i }))
    )

    router.push('/history')
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 16 }}>
      {/* Header */}
      <Box sx={{ px: 3, pt: 4, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => router.back()}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Planificar
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
            {formatDateLabel(date)}
          </Typography>
        </Box>
      </Box>

      {/* Filtro por músculo */}
      <Box sx={{ px: 3, py: 2, display: 'flex', gap: 1, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
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

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {loading && <Typography color="text.secondary">Cargando...</Typography>}

        {!loading &&
          filtered.map((ex) => {
            const checked = selected.includes(ex.id)
            return (
              <Card key={ex.id}>
                <CardContent
                  onClick={() => toggle(ex.id)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, py: '8px !important', cursor: 'pointer' }}
                >
                  <Checkbox checked={checked} sx={{ p: 0.5 }} />
                  <Typography variant="body1" sx={{ fontWeight: 600, flex: 1 }}>
                    {ex.name}
                  </Typography>
                  {ex.muscle?.name && (
                    <Chip label={muscleLabel(ex.muscle.slug, ex.muscle.name)} size="small" />
                  )}
                </CardContent>
              </Card>
            )
          })}
      </Box>

      <Box sx={{ position: 'fixed', bottom: '96px', left: '16px', right: '16px', zIndex: 11 }}>
        <Button variant="contained" size="large" fullWidth onClick={save} disabled={saving}>
          {saving
            ? 'Guardando...'
            : selected.length === 0
            ? 'Quitar planificación'
            : `Guardar plan (${selected.length})`}
        </Button>
      </Box>
    </Box>
  )
}
