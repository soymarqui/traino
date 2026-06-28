'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { createClient } from '@/lib/supabase/client'
import { Muscle } from '@/types/database'

export default function RequestForm() {
  const [muscles, setMuscles] = useState<Muscle[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    muscle_id: '',
    notes: '',
  })
  const supabase = createClient()

  useEffect(() => {
    supabase.from('muscles').select('*').order('name').then(({ data }) => {
      setMuscles(data || [])
    })
  }, [])

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!form.name || !form.muscle_id) return
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('Tenés que iniciar sesión para solicitar un ejercicio.')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('exercise_requests').insert({
      user_id: user.id,
      name: form.name,
      muscle_id: form.muscle_id,
      notes: form.notes || null,
    })

    if (insertError) {
      setError('No se pudo enviar la solicitud. Intentá de nuevo.')
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <Box
        sx={{
          px: 3,
          pt: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          textAlign: 'center',
        }}
      >
        <CheckCircleIcon sx={{ fontSize: 56, color: 'primary.main' }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          ¡Solicitud enviada!
        </Typography>
        <Typography color="text.secondary">
          Vamos a revisar tu pedido. Si se aprueba, el ejercicio aparecerá en la
          biblioteca para todos.
        </Typography>
        <Button variant="contained" href="/exercises" sx={{ mt: 2 }}>
          Volver a ejercicios
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="body2" color="text.secondary">
        ¿Falta un ejercicio en la biblioteca? Pedilo y lo revisamos para agregarlo.
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

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

      <TextField
        label="Notas"
        value={form.notes}
        onChange={(e) => handleChange('notes', e.target.value)}
        fullWidth
        multiline
        rows={3}
        placeholder="Contanos por qué lo querés, cómo se hace, equipamiento..."
      />

      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={handleSubmit}
        disabled={loading || !form.name || !form.muscle_id}
      >
        {loading ? 'Enviando...' : 'Enviar solicitud'}
      </Button>
    </Box>
  )
}
