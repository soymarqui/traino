'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import AddIcon from '@mui/icons-material/Add'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import { createClient } from '@/lib/supabase/client'
import { isAdmin } from '@/lib/admin'
import { Exercise, Muscle } from '@/types/database'

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [muscles, setMuscles] = useState<Muscle[]>([])
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [admin, setAdmin] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchData()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAdmin(isAdmin(user?.email))
    })
  }, [])

  const fetchData = async () => {
    setLoading(true)

    const { data: musclesData } = await supabase
      .from('muscles')
      .select('*')
      .order('name')

    const { data: exercisesData } = await supabase
      .from('exercises')
      .select('*, muscle:muscles(id, name, slug)')
      .eq('active', true)
      .order('name')

    setMuscles(musclesData || [])
    setExercises(exercisesData || [])
    setLoading(false)
  }

  const filtered = selectedMuscle
    ? exercises.filter((e) => e.muscle_id === selectedMuscle)
    : exercises

  return (
    <Box sx={{ minHeight: '100vh', pb: 10 }}>
      {/* Header */}
      <Box
        sx={{
          px: 3,
          pt: 4,
          pb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Ejercicios
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {admin && (
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              href="/exercises/requests"
            >
              Solicitudes
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="small"
            href="/exercises/new"
          >
            {admin ? 'Agregar' : 'Solicitar'}
          </Button>
        </Box>
      </Box>

      {/* Filtro por músculo */}
      <Box
        sx={{
          px: 3,
          pb: 2,
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

      {/* Lista de ejercicios */}
      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {loading && (
          <Typography color="text.secondary">Cargando...</Typography>
        )}

        {!loading && filtered.length === 0 && (
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
            <Typography color="text.secondary">
              No hay ejercicios todavía.
            </Typography>
            <Button variant="contained" href="/exercises/new">
              Solicitar ejercicio
            </Button>
          </Box>
        )}

        {filtered.map((exercise) => (
          <Card key={exercise.id}>
            <CardActionArea href={`/exercises/${exercise.id}`}>
              <CardContent
                sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {exercise.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {exercise.muscle?.name} · {exercise.suggested_sets} series · {exercise.reps_min}–{exercise.reps_max} reps
                  </Typography>
                </Box>
                <Chip
                  label={exercise.difficulty || 'N/A'}
                  size="small"
                  sx={{ opacity: 0.7 }}
                />
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Box>
  )
}