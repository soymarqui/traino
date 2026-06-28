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
import { Muscle } from '@/types/database'
import { useRouter } from 'next/navigation'

const DEFAULT_GROUPS = [
  { name: 'Full Body', muscles: ['pecho', 'espalda', 'hombros', 'cuadriceps', 'gluteos'] },
  { name: 'Push', muscles: ['pecho', 'hombros', 'triceps'] },
  { name: 'Pull', muscles: ['espalda', 'biceps'] },
  { name: 'Legs', muscles: ['cuadriceps', 'isquios', 'gluteos', 'pantorrillas'] },
  { name: 'Pecho + Tríceps', muscles: ['pecho', 'triceps'] },
  { name: 'Espalda + Bíceps', muscles: ['espalda', 'biceps'] },
  { name: 'Hombros', muscles: ['hombros'] },
]

export default function TrainPage() {
  const [muscles, setMuscles] = useState<Muscle[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.from('muscles').select('*').order('name').then(({ data }) => {
      setMuscles(data || [])
    })
  }, [])

  const toggleMuscle = (slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
  }

  const selectGroup = (groupMuscles: string[]) => {
    setSelected(groupMuscles)
  }

  const handleStart = async () => {
    if (selected.length === 0) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    // Obtener IDs de músculos seleccionados
    const selectedMuscleIds = muscles
      .filter((m) => selected.includes(m.slug))
      .map((m) => m.id)

    // Buscar ejercicios de esos músculos
    const { data: exercises } = await supabase
      .from('exercises')
      .select('*')
      .in('muscle_id', selectedMuscleIds)
      .eq('active', true)

    if (!exercises || exercises.length === 0) {
      alert('No hay ejercicios para los músculos seleccionados. Agregá ejercicios primero.')
      setLoading(false)
      return
    }

    // Mezclar y tomar hasta 8
    const shuffled = exercises.sort(() => Math.random() - 0.5).slice(0, 8)

    // Crear workout
    const { data: workout, error } = await supabase
      .from('workouts')
      .insert({ user_id: user?.id })
      .select()
      .single()

    if (error || !workout) {
      setLoading(false)
      return
    }

    // Crear sets para cada ejercicio
    const setsToInsert = shuffled.flatMap((exercise) =>
      Array.from({ length: exercise.suggested_sets }, (_, i) => ({
        workout_id: workout.id,
        exercise_id: exercise.id,
        set_number: i + 1,
        reps_target: exercise.reps_min,
        completed: false,
      }))
    )

    await supabase.from('sets').insert(setsToInsert)

    router.push(`/train/${workout.id}`)
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 10 }}>
      {/* Header */}
      <Box sx={{ px: 3, pt: 4, pb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => router.back()}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Nuevo entrenamiento
        </Typography>
      </Box>

      {/* Grupos rápidos */}
      <Box sx={{ px: 3, mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
          Grupos rápidos
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {DEFAULT_GROUPS.map((group) => (
            <Card
              key={group.name}
              onClick={() => selectGroup(group.muscles)}
              sx={{
                cursor: 'pointer',
                border: group.muscles.every(m => selected.includes(m)) && selected.length === group.muscles.length
                  ? '1px solid'
                  : '1px solid #222',
                borderColor: group.muscles.every(m => selected.includes(m)) && selected.length === group.muscles.length
                  ? 'primary.main'
                  : '#222',
                transition: 'all 0.15s ease',
              }}
            >
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {group.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {group.muscles.join(', ')}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {/* Selección individual */}
      <Box sx={{ px: 3, mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
          O elegí músculos
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {muscles.map((m) => (
            <Chip
              key={m.id}
              label={m.name}
              onClick={() => toggleMuscle(m.slug)}
              color={selected.includes(m.slug) ? 'primary' : 'default'}
            />
          ))}
        </Box>
      </Box>

      {/* Botón iniciar */}
      {selected.length > 0 && (
        <Box sx={{ px: 3 }}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleStart}
            disabled={loading}
          >
            {loading ? 'Generando...' : `Iniciar entrenamiento`}
          </Button>
        </Box>
      )}
    </Box>
  )
}