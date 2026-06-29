'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Checkbox from '@mui/material/Checkbox'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { createClient } from '@/lib/supabase/client'
import { muscleLabel } from '@/lib/muscles'
import { Exercise, Muscle } from '@/types/database'
import { useRouter, useParams } from 'next/navigation'

export default function AddExercisesPage() {
  const params = useParams()
  const routineId = params.id as string
  const dayId = params.day as string
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [muscles, setMuscles] = useState<Muscle[]>([])
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)
  const [inDay, setInDay] = useState<Record<string, string>>({}) // exercise_id -> routine_exercise id (estado inicial)
  const [selected, setSelected] = useState<string[]>([]) // selección de trabajo (checkmarks)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const [{ data: ex }, { data: ms }, { data: re }] = await Promise.all([
      supabase.from('exercises').select('*, muscle:muscles(id, name, slug)').eq('active', true).order('name'),
      supabase.from('muscles').select('*').order('name'),
      supabase.from('routine_exercises').select('id, exercise_id').eq('routine_day_id', dayId),
    ])
    setExercises((ex as Exercise[]) || [])
    setMuscles(ms || [])
    const map: Record<string, string> = {}
    ;(re || []).forEach((r: { id: string; exercise_id: string }) => (map[r.exercise_id] = r.id))
    setInDay(map)
    setSelected(Object.keys(map))
    setLoading(false)
  }

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  // Aplica la selección: agrega los nuevos, quita los destildados, y va a la rutina.
  const confirm = async () => {
    setSaving(true)
    const toAdd = exercises.filter((e) => selected.includes(e.id) && !inDay[e.id])
    const toRemove = Object.entries(inDay).filter(([exId]) => !selected.includes(exId))

    for (const [, reId] of toRemove) {
      await supabase.from('routine_exercises').delete().eq('id', reId)
    }
    let { count } = await supabase
      .from('routine_exercises')
      .select('id', { count: 'exact', head: true })
      .eq('routine_day_id', dayId)
    let pos = count ?? 0
    for (const ex of toAdd) {
      const { data: re } = await supabase
        .from('routine_exercises')
        .insert({
          routine_id: routineId,
          routine_day_id: dayId,
          exercise_id: ex.id,
          rest_seconds: ex.rest_seconds,
          position: pos++,
        })
        .select()
        .single()
      if (re) {
        await supabase.from('routine_exercise_sets').insert(
          Array.from({ length: ex.suggested_sets || 3 }, (_, i) => ({
            routine_exercise_id: re.id,
            set_number: i + 1,
            reps: ex.reps_min,
          }))
        )
      }
    }
    router.push(`/routine/${routineId}`)
  }

  const filtered = selectedMuscle ? exercises.filter((e) => e.muscle_id === selectedMuscle) : exercises
  const dirty =
    selected.length !== Object.keys(inDay).length ||
    selected.some((id) => !inDay[id])

  return (
    <Box sx={{ minHeight: '100vh', pb: 12 }}>
      <Box sx={{ px: 3, pt: 4, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => router.push(`/routine/${routineId}`)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Agregar ejercicios
        </Typography>
      </Box>

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
              <Card key={ex.id} sx={{ borderColor: checked ? 'primary.main' : 'divider' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1, py: '8px !important' }}>
                  <Checkbox checked={checked} onChange={() => toggle(ex.id)} sx={{ p: 0.5 }} />
                  <Box sx={{ flex: 1, cursor: 'pointer' }} onClick={() => router.push(`/exercises/${ex.id}`)}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {ex.name}
                    </Typography>
                    {ex.muscle?.name && (
                      <Chip label={muscleLabel(ex.muscle.slug, ex.muscle.name)} size="small" sx={{ mt: 0.5 }} />
                    )}
                  </Box>
                  <IconButton size="small" onClick={() => router.push(`/exercises/${ex.id}`)}>
                    <ChevronRightIcon />
                  </IconButton>
                </CardContent>
              </Card>
            )
          })}
      </Box>

      <Box sx={{ position: 'fixed', bottom: '96px', left: '16px', right: '16px', zIndex: 11 }}>
        <Button variant="contained" size="large" fullWidth onClick={confirm} disabled={saving || !dirty}>
          {saving ? 'Guardando...' : `Agregar a rutina (${selected.length})`}
        </Button>
      </Box>
    </Box>
  )
}
