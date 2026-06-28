'use client'

import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { createClient } from '@/lib/supabase/client'
import { equipmentLabel } from '@/lib/equipment'
import { Exercise, Muscle } from '@/types/database'
import { useRouter } from 'next/navigation'

export default function TrainPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [muscles, setMuscles] = useState<Muscle[]>([])
  const [lastDone, setLastDone] = useState<Record<string, number>>({})
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const [{ data: ex }, { data: ms }, { data: workouts }, { data: sets }] =
        await Promise.all([
          supabase
            .from('exercises')
            .select('*, muscle:muscles(id, name, slug)')
            .eq('active', true)
            .order('name'),
          supabase.from('muscles').select('*').order('name'),
          supabase.from('workouts').select('id, started_at'),
          supabase.from('sets').select('exercise_id, workout_id'),
        ])

      // Última vez que se hizo cada ejercicio (para sugerir lo menos reciente).
      const wDate: Record<string, number> = {}
      ;(workouts || []).forEach((w: { id: string; started_at: string }) => {
        wDate[w.id] = new Date(w.started_at).getTime()
      })
      const last: Record<string, number> = {}
      ;(sets || []).forEach((s: { exercise_id: string; workout_id: string }) => {
        const t = wDate[s.workout_id] ?? 0
        if (t > (last[s.exercise_id] ?? 0)) last[s.exercise_id] = t
      })

      setExercises((ex as Exercise[]) || [])
      setMuscles(ms || [])
      setLastDone(last)
      setLoading(false)
    }
    load()
  }, [])

  // Filtrado por músculo + orden por "menos reciente" (nunca hecho primero).
  const ordered = useMemo(() => {
    const list = selectedMuscle
      ? exercises.filter((e) => e.muscle_id === selectedMuscle)
      : exercises
    return [...list].sort(
      (a, b) => (lastDone[a.id] ?? 0) - (lastDone[b.id] ?? 0)
    )
  }, [exercises, selectedMuscle, lastDone])

  const suggestedId = ordered[0]?.id

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  const handleStart = async () => {
    if (selected.length === 0) return
    setStarting(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: workout, error } = await supabase
      .from('workouts')
      .insert({ user_id: user?.id })
      .select()
      .single()

    if (error || !workout) {
      setStarting(false)
      return
    }

    const chosen = exercises.filter((e) => selected.includes(e.id))
    const setsToInsert = chosen.flatMap((ex) =>
      Array.from({ length: ex.suggested_sets || 3 }, (_, i) => ({
        workout_id: workout.id,
        exercise_id: ex.id,
        set_number: i + 1,
        reps_target: ex.reps_min,
        completed: false,
      }))
    )
    await supabase.from('sets').insert(setsToInsert)

    router.push(`/train/${workout.id}`)
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 16 }}>
      {/* Header */}
      <Box sx={{ px: 3, pt: 4, pb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Nuevo entrenamiento
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Deslizá y tocá los ejercicios que querés hacer
        </Typography>
      </Box>

      {/* Filtro por músculo */}
      <Box
        sx={{
          px: 3,
          py: 2,
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
            label={m.name}
            onClick={() => setSelectedMuscle(m.id)}
            color={selectedMuscle === m.id ? 'primary' : 'default'}
            sx={{ flexShrink: 0 }}
          />
        ))}
      </Box>

      {/* Carrusel de ejercicios */}
      {loading && (
        <Typography color="text.secondary" sx={{ px: 3 }}>
          Cargando...
        </Typography>
      )}

      {!loading && ordered.length === 0 && (
        <Typography color="text.secondary" sx={{ px: 3 }}>
          No hay ejercicios para ese filtro.
        </Typography>
      )}

      {!loading && ordered.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            px: 3,
            pb: 1,
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {ordered.map((ex) => {
            const isSelected = selected.includes(ex.id)
            const isSuggested = ex.id === suggestedId
            return (
              <Card
                key={ex.id}
                onClick={() => toggle(ex.id)}
                sx={{
                  flex: '0 0 78%',
                  scrollSnapAlign: 'center',
                  position: 'relative',
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <CardContent
                  sx={{
                    minHeight: 180,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    {isSuggested && (
                      <Chip
                        label="Sugerido"
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 700 }}
                      />
                    )}
                    <Box sx={{ flex: 1 }} />
                    {isSelected && (
                      <CheckCircleIcon sx={{ color: 'primary.main' }} />
                    )}
                  </Box>

                  <Typography variant="h6" sx={{ fontWeight: 700, mt: 1 }}>
                    {ex.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {ex.muscle?.name}
                  </Typography>

                  <Box sx={{ flex: 1 }} />

                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {(ex.equipment ?? []).map((eq) => (
                      <Chip
                        key={eq}
                        label={equipmentLabel(eq)}
                        size="small"
                        sx={{ opacity: 0.7 }}
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )
          })}
        </Box>
      )}

      {/* Botón flotante, por encima del menú inferior */}
      {selected.length > 0 && (
        <Box
          sx={{
            position: 'fixed',
            bottom: '76px',
            left: '16px',
            right: '16px',
            zIndex: 11,
          }}
        >
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleStart}
            disabled={starting}
          >
            {starting
              ? 'Empezando...'
              : `Empezar entrenamiento (${selected.length})`}
          </Button>
        </Box>
      )}
    </Box>
  )
}
