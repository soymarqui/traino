'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { createClient } from '@/lib/supabase/client'
import { Muscle } from '@/types/database'
import { useRouter } from 'next/navigation'

export default function NewExercisePage() {
  const [muscles, setMuscles] = useState<Muscle[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    muscle_id: '',
    suggested_sets: 4,
    reps_min: 8,
    reps_max: 12,
    rest_seconds: 90,
    equipment: '',
    difficulty: '',
    notes: '',
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.from('muscles').select('*').order('name').then(({ data }) => {
      setMuscles(data || [])
    })
  }, [])

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!form.name || !form.muscle_id) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('exercises').insert({
      name: form.name,
      muscle_id: form.muscle_id,
      suggested_sets: form.suggested_sets,
      reps_min: form.reps_min,
      reps_max: form.reps_max,
      rest_seconds: form.rest_seconds,
      equipment: form.equipment || null,
      difficulty: form.difficulty || null,
      notes: form.notes || null,
      user_id: user?.id,
      active: true,
    })

    if (!error) {
      router.push('/exercises')
    }
    setLoading(false)
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 10 }}>
      {/* Header */}
      <Box sx={{ px: 3, pt: 4, pb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => router.back()}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Nuevo ejercicio
        </Typography>
      </Box>

      {/* Formulario */}
      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <TextField
          label="Nombre del ejercicio"
          value={form.name}
          onChange={(e) => handleChange('name', e.target.value)}
          fullWidth
        />

        <TextField
          label="Músculo principal"
          value={form.muscle_id}
          onChange={(e) => handleChange('muscle_id', e.target.value)}
          fullWidth
          select
        >
          {muscles.map((m) => (
            <MenuItem key={m.id} value={m.id}>
              {m.name}
            </MenuItem>
          ))}
        </TextField>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Series"
            type="number"
            value={form.suggested_sets}
            onChange={(e) => handleChange('suggested_sets', parseInt(e.target.value))}
            fullWidth
          />
          <TextField
            label="Reps mín"
            type="number"
            value={form.reps_min}
            onChange={(e) => handleChange('reps_min', parseInt(e.target.value))}
            fullWidth
          />
          <TextField
            label="Reps máx"
            type="number"
            value={form.reps_max}
            onChange={(e) => handleChange('reps_max', parseInt(e.target.value))}
            fullWidth
          />
        </Box>

        <TextField
          label="Descanso (segundos)"
          type="number"
          value={form.rest_seconds}
          onChange={(e) => handleChange('rest_seconds', parseInt(e.target.value))}
          fullWidth
        />

        <TextField
          label="Equipamiento"
          value={form.equipment}
          onChange={(e) => handleChange('equipment', e.target.value)}
          fullWidth
          placeholder="Ej: Barra, Mancuernas, Máquina..."
        />

        <TextField
          label="Dificultad"
          value={form.difficulty}
          onChange={(e) => handleChange('difficulty', e.target.value)}
          fullWidth
          select
        >
          <MenuItem value="">Sin especificar</MenuItem>
          <MenuItem value="beginner">Principiante</MenuItem>
          <MenuItem value="intermediate">Intermedio</MenuItem>
          <MenuItem value="advanced">Avanzado</MenuItem>
        </TextField>

        <TextField
          label="Notas"
          value={form.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          fullWidth
          multiline
          rows={3}
          placeholder="Indicaciones técnicas, tips..."
        />

        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={handleSave}
          disabled={loading || !form.name || !form.muscle_id}
        >
          {loading ? 'Guardando...' : 'Guardar ejercicio'}
        </Button>
      </Box>
    </Box>
  )
}