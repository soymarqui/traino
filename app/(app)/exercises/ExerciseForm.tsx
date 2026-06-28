'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import { createClient } from '@/lib/supabase/client'
import { EQUIPMENT_OPTIONS } from '@/lib/equipment'
import { Muscle } from '@/types/database'
import { useRouter } from 'next/navigation'

export type ExerciseFormValues = {
  name: string
  muscle_id: string
  equipment: string[]
  unit: 'reps' | 'time'
  video_url: string
  notes: string
  is_warmup: boolean
}

const EMPTY: ExerciseFormValues = {
  name: '',
  muscle_id: '',
  equipment: [],
  unit: 'reps',
  video_url: '',
  notes: '',
  is_warmup: false,
}

export default function ExerciseForm({
  mode,
  exerciseId,
  requestId,
  initial,
}: {
  mode: 'create' | 'edit'
  exerciseId?: string
  // Si viene de una solicitud, se marca aprobada al guardar.
  requestId?: string
  initial?: Partial<ExerciseFormValues>
}) {
  const [muscles, setMuscles] = useState<Muscle[]>([])
  const [form, setForm] = useState<ExerciseFormValues>({ ...EMPTY, ...initial })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.from('muscles').select('*').order('name').then(({ data }) => {
      setMuscles(data || [])
    })
  }, [])

  const set = <K extends keyof ExerciseFormValues>(
    field: K,
    value: ExerciseFormValues[K]
  ) => setForm((prev) => ({ ...prev, [field]: value }))

  const toggleEquipment = (value: string) => {
    setForm((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(value)
        ? prev.equipment.filter((e) => e !== value)
        : [...prev.equipment, value],
    }))
  }

  const handleSave = async () => {
    if (!form.name || !form.muscle_id) return
    setSaving(true)
    setError(null)

    const payload = {
      name: form.name,
      muscle_id: form.muscle_id,
      equipment: form.equipment.length ? form.equipment : null,
      unit: form.unit,
      video_url: form.video_url || null,
      notes: form.notes || null,
      is_warmup: form.is_warmup,
    }

    let savedId = exerciseId

    if (mode === 'edit' && exerciseId) {
      const { error: updErr } = await supabase
        .from('exercises')
        .update(payload)
        .eq('id', exerciseId)
      if (updErr) {
        setError('No se pudo guardar el ejercicio.')
        setSaving(false)
        return
      }
    } else {
      const { data, error: insErr } = await supabase
        .from('exercises')
        .insert({
          ...payload,
          active: true,
          // Defaults del catálogo (la config fina la pone el usuario en su rutina).
          secondary_muscles: [],
          suggested_sets: 3,
          reps_min: 8,
          reps_max: 12,
          rest_seconds: 90,
        })
        .select('id')
        .single()
      if (insErr || !data) {
        setError('No se pudo crear el ejercicio.')
        setSaving(false)
        return
      }
      savedId = data.id
    }

    // Si veníamos de una solicitud, marcarla aprobada.
    if (requestId) {
      await supabase
        .from('exercise_requests')
        .update({ status: 'approved' })
        .eq('id', requestId)
    }

    setSaving(false)
    router.push(savedId ? `/exercises/${savedId}` : '/exercises')
  }

  return (
    <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {error && <Alert severity="error">{error}</Alert>}

      <TextField
        label="Nombre del ejercicio"
        value={form.name}
        onChange={(e) => set('name', e.target.value)}
        fullWidth
      />

      <TextField
        label="Músculo principal"
        value={form.muscle_id}
        onChange={(e) => set('muscle_id', e.target.value)}
        fullWidth
        select
      >
        {muscles.map((m) => (
          <MenuItem key={m.id} value={m.id}>
            {m.name}
          </MenuItem>
        ))}
      </TextField>

      <Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}
        >
          Equipamiento necesario
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {EQUIPMENT_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              onClick={() => toggleEquipment(o.value)}
              color={form.equipment.includes(o.value) ? 'primary' : 'default'}
            />
          ))}
        </Box>
      </Box>

      <TextField
        label="Unidad"
        value={form.unit}
        onChange={(e) => set('unit', e.target.value as 'reps' | 'time')}
        fullWidth
        select
        helperText="Cómo se mide el ejercicio"
      >
        <MenuItem value="reps">Repeticiones</MenuItem>
        <MenuItem value="time">Tiempo</MenuItem>
      </TextField>

      <FormControlLabel
        control={
          <Switch checked={form.is_warmup} onChange={(e) => set('is_warmup', e.target.checked)} />
        }
        label="🔥 Ejercicio de warm-up"
      />

      <TextField
        label="Link del video (YouTube)"
        value={form.video_url}
        onChange={(e) => set('video_url', e.target.value)}
        fullWidth
        placeholder="https://www.youtube.com/watch?v=..."
      />

      <TextField
        label="Notas"
        value={form.notes}
        onChange={(e) => set('notes', e.target.value)}
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
        disabled={saving || !form.name || !form.muscle_id}
      >
        {saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Crear ejercicio'}
      </Button>
    </Box>
  )
}
