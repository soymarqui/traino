'use client'

import { useEffect, useState } from 'react'
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
import Alert from '@mui/material/Alert'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import { createClient } from '@/lib/supabase/client'
import { Equipment, Exercise, Routine, RoutineDay } from '@/types/database'

const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: 'barra', label: 'Con barra' },
  { value: 'mancuernas', label: 'Con mancuernas' },
  { value: 'maquina', label: 'Con máquina' },
  { value: 'polea', label: 'Con polea' },
  { value: 'peso_corporal', label: 'Peso corporal' },
]

type SetMode = 'reps' | 'time' | 'failure'
type SetDraft = { mode: SetMode; value: string; weight: string }

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
  const [routines, setRoutines] = useState<Routine[]>([])
  const [routineId, setRoutineId] = useState('')
  const [days, setDays] = useState<RoutineDay[]>([])
  const [dayId, setDayId] = useState('')
  const [saving, setSaving] = useState(false)
  const [equipment, setEquipment] = useState<Equipment | ''>('')
  const [unilateral, setUnilateral] = useState(false)
  const [rest, setRest] = useState(String(exercise.rest_seconds ?? 90))
  const [sets, setSets] = useState<SetDraft[]>(
    Array.from({ length: exercise.suggested_sets || 3 }, () => emptySet(exercise))
  )

  useEffect(() => {
    if (!open) return
    supabase
      .from('routines')
      .select('*')
      .order('created_at')
      .then(({ data }) => {
        const list = (data as Routine[]) || []
        setRoutines(list)
        setRoutineId((prev) => prev || list[0]?.id || '')
      })
  }, [open])

  // Días de la rutina elegida.
  useEffect(() => {
    if (!routineId) {
      setDays([])
      setDayId('')
      return
    }
    supabase
      .from('routine_days')
      .select('*')
      .eq('routine_id', routineId)
      .order('position')
      .then(({ data }) => {
        const list = (data as RoutineDay[]) || []
        setDays(list)
        setDayId(list[0]?.id || '')
      })
  }, [routineId])

  const updateSet = (i: number, patch: Partial<SetDraft>) =>
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  const addSet = () => setSets((prev) => [...prev, emptySet(exercise)])
  const removeSet = (i: number) =>
    setSets((prev) => prev.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    if (!routineId || !dayId) return
    setSaving(true)

    const { count } = await supabase
      .from('routine_exercises')
      .select('id', { count: 'exact', head: true })
      .eq('routine_day_id', dayId)

    const { data: re, error } = await supabase
      .from('routine_exercises')
      .insert({
        routine_id: routineId,
        routine_day_id: dayId,
        exercise_id: exercise.id,
        rest_seconds: rest ? parseInt(rest) : null,
        equipment: equipment || null,
        unilateral,
        position: count ?? 0,
      })
      .select()
      .single()

    if (error || !re) {
      setSaving(false)
      return
    }

    const rows = sets.map((s, i) => ({
      routine_exercise_id: re.id,
      set_number: i + 1,
      reps: s.mode === 'reps' && s.value ? parseInt(s.value) : null,
      duration_seconds: s.mode === 'time' && s.value ? parseInt(s.value) : null,
      to_failure: s.mode === 'failure',
      weight: s.weight ? parseFloat(s.weight) : null,
    }))
    await supabase.from('routine_exercise_sets').insert(rows)

    setSaving(false)
    onAdded()
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>
        Agregar a rutina
        <Typography variant="body2" color="text.secondary">
          {exercise.name}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        {routines.length === 0 ? (
          <Alert severity="info">
            No tenés rutinas todavía. Creá una en la sección Rutina y volvé.
          </Alert>
        ) : (
          <TextField
            label="Rutina"
            select
            value={routineId}
            onChange={(e) => setRoutineId(e.target.value)}
            fullWidth
          >
            {routines.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.name}
              </MenuItem>
            ))}
          </TextField>
        )}

        {days.length > 0 && (
          <TextField
            label="Día"
            select
            value={dayId}
            onChange={(e) => setDayId(e.target.value)}
            fullWidth
          >
            {days.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name}
              </MenuItem>
            ))}
          </TextField>
        )}

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
            <Switch checked={unilateral} onChange={(e) => setUnilateral(e.target.checked)} />
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

                <IconButton size="small" onClick={() => removeSet(i)} disabled={sets.length === 1}>
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
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !routineId || !dayId}
        >
          {saving ? 'Guardando...' : 'Agregar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
