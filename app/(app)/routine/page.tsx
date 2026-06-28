'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import { createClient } from '@/lib/supabase/client'
import { Equipment, UserExercise, UserExerciseSet } from '@/types/database'

const EQUIPMENT_LABELS: Record<Equipment, string> = {
  maquina: 'Máquina',
  mancuernas: 'Mancuernas',
  barra: 'Barra',
  polea: 'Polea',
  peso_corporal: 'Peso corporal',
}

// Resume las series en texto: "10·8·8·6", "30s·30s", "al fallo".
function setsSummary(sets: UserExerciseSet[]): string {
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

export default function RoutinePage() {
  const [items, setItems] = useState<UserExercise[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchRoutine()
  }, [])

  const fetchRoutine = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('user_exercises')
      .select('*, exercise:exercises(id, name, muscle:muscles(name)), sets:user_exercise_sets(*)')
      .order('position')

    setItems((data as UserExercise[]) || [])
    setLoading(false)
  }

  const removeItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    await supabase.from('user_exercises').delete().eq('id', id)
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 12 }}>
      {/* Header */}
      <Box sx={{ px: 3, pt: 4, pb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Mi rutina
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Ejercicios que elegiste para entrenar
        </Typography>
      </Box>

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {loading && <Typography color="text.secondary">Cargando...</Typography>}

        {!loading && items.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              pt: 8,
            }}
          >
            <FitnessCenterIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
              Tu rutina está vacía. Entrá a un ejercicio y tocá
              &ldquo;Agregar a entrenamiento&rdquo;.
            </Typography>
            <Button variant="contained" href="/exercises">
              Ver ejercicios
            </Button>
          </Box>
        )}

        {!loading &&
          items.map((item) => (
            <Card key={item.id}>
              <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {item.exercise?.name ?? 'Ejercicio'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.sets?.length ?? 0} series · {setsSummary(item.sets ?? [])}
                    {item.rest_seconds ? ` · ${item.rest_seconds}s descanso` : ''}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                    {item.equipment && (
                      <Chip label={EQUIPMENT_LABELS[item.equipment]} size="small" />
                    )}
                    {item.unilateral && (
                      <Chip label="Unilateral" size="small" sx={{ opacity: 0.8 }} />
                    )}
                  </Box>
                </Box>
                <IconButton size="small" onClick={() => removeItem(item.id)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </CardContent>
            </Card>
          ))}
      </Box>
    </Box>
  )
}
