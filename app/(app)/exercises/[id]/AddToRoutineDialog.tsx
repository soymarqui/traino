'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import { createClient } from '@/lib/supabase/client'
import { Equipment, Exercise } from '@/types/database'

const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: 'barra', label: 'Con barra' },
  { value: 'mancuernas', label: 'Con mancuernas' },
  { value: 'maquina', label: 'Con máquina' },
  { value: 'polea', label: 'Con polea' },
  { value: 'peso_corporal', label: 'Peso corporal' },
]

type SetMode = 'reps' | 'time' | 'failure'

type SetDraft = {
  mode: SetMode
  value: string // reps o segundos según mode
  weight: string
}

function emptySet(exercise: Exercise): SetDraft {
  return { mode: 'reps', value: String(exercise.reps_min ?? 10), weight: '' }
}

export default function AddToRoutineDialog({
  exercise,
  open,
  onClose,
  onAdded,
}: {
  exercise: Exercise
  open: boolean
  onClose: () => void
  onAdded: () => void
}) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [equipment, setEquipment] = useState<Equipment | ''>('')
  const [unilateral, setUnilateral] = useState(false)
  const [rest, setRest] = useState(String(exercise.rest_seconds ?? 90))
  const [sets, setSets] = useState<SetDraft[]>(
    Array.from({ length: exercise.suggested_sets || 3 }, () => emptySet(exercise))
  )

  const updateSet = (i: number, patch: Partial<SetDraft>) => {
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  }

  const addSet = () => setSets((prev) => [...prev, emptySet(exercise)])
  const removeSet = (i: number) =>
    setSets((prev) => prev.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    // Posición = al final de la rutina actual.
    const { count } = await supabase
      .from('user_exercises')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const { data: ue, error } = await supabase
      .from('user_exercises')
      .insert({
        user_id: user.id,
        exercise_id: exercise.id,
        rest_seconds: rest ? parseInt(rest) : null,
        equipment: equipment || null,
        unilateral,
        position: count ?? 0,
      })
      .select()
      .single()

    if (error || !ue) {
      setSaving(false)
      return
    }

    const rows = sets.map((s, i) => ({
      user_exercise_id: ue.id,
      set_number: i + 1,
      reps: s.mode === 'reps' && s.value ? parseInt(s.value) : null,
      duration_seconds: s.mode === 'time' && s.value ? parseInt(s.value) : null,
      to_failure: s.mode === 'failure',
      weight: s.weight ? parseFloat(s.weight) : null,
    }))

    await supabase.from('user_exercise_sets').insert(rows)

    setSaving(false)
    onAdded()
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>
        Agregar a entrenamiento
        <Typography variant="body2" color="text.secondary">
          {exercise.name}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        <TextField
          label="Equipo"
          select
          value={equipment}
          onChange={(e) => setEquipment(e.target.value as Equipment | '')}
          fullWidth
        >
          <MenuItem value="">Sin especificar</MenuItem>
          {EQUIPMENT_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>

        <FormControlLabel
          control={
            <Switch
              checked={unilateral}
              onChange={(e) => setUnilateral(e.target.checked)}
            />
          }
          label="Unilateral (por brazo/pierna)"
        />

        <TextField
          label="Descanso entre series (segundos)"
          type="number"
          value={rest}
          onChange={(e) => setRest(e.target.value)}
          fullWidth
        />

        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}
          >
            Series
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {sets.map((s, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ width: 20, fontWeight: 600 }}
                >
                  {i + 1}
                </Typography>

                <TextField
                  select
                  size="small"
                  value={s.mode}
                  onChange={(e) => updateSet(i, { mode: e.target.value as SetMode })}
                  sx={{ minWidth: 110 }}
                >
                  <MenuItem value="reps">Reps</MenuItem>
                  <MenuItem value="time">Tiempo (s)</MenuItem>
                  <MenuItem value="failure">Al fallo</MenuItem>
                </TextField>

                {s.mode !== 'failure' && (
                  <TextField
                    size="small"
                    type="number"
                    value={s.value}
                    onChange={(e) => updateSet(i, { value: e.target.value })}
                    placeholder={s.mode === 'reps' ? 'reps' : 'seg'}
                    sx={{ flex: 1 }}
                  />
                )}

                <TextField
                  size="small"
                  type="number"
                  value={s.weight}
                  onChange={(e) => updateSet(i, { weight: e.target.value })}
                  placeholder="kg"
                  sx={{ width: 80 }}
                />

                <IconButton
                  size="small"
                  onClick={() => removeSet(i)}
                  disabled={sets.length === 1}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>

          <Button startIcon={<AddIcon />} size="small" onClick={addSet} sx={{ mt: 1 }}>
            Agregar serie
          </Button>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Agregar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
