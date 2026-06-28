'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import { createClient } from '@/lib/supabase/client'
import { Equipment, Routine, RoutineExercise, RoutineExerciseSet } from '@/types/database'
import { useRouter, useParams } from 'next/navigation'

const EQUIPMENT_LABELS: Record<Equipment, string> = {
  maquina: 'Máquina',
  mancuernas: 'Mancuernas',
  barra: 'Barra',
  polea: 'Polea',
  peso_corporal: 'Peso corporal',
}

function setsSummary(sets: RoutineExerciseSet[]): string {
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

export default function RoutineDetailPage() {
  const params = useParams()
  const routineId = params.id as string
  const [routine, setRoutine] = useState<Routine | null>(null)
  const [items, setItems] = useState<RoutineExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [renameOpen, setRenameOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: r } = await supabase
      .from('routines')
      .select('*')
      .eq('id', routineId)
      .single()
    const { data: ex } = await supabase
      .from('routine_exercises')
      .select('*, exercise:exercises(id, name, muscle:muscles(name)), sets:routine_exercise_sets(*)')
      .eq('routine_id', routineId)
      .order('position')

    setRoutine(r as Routine)
    setItems((ex as RoutineExercise[]) || [])
    setLoading(false)
  }

  const togglePublic = async (value: boolean) => {
    if (!routine) return
    setRoutine({ ...routine, is_public: value })
    await supabase.from('routines').update({ is_public: value }).eq('id', routineId)
  }

  const removeItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    await supabase.from('routine_exercises').delete().eq('id', id)
  }

  const saveName = async () => {
    if (!newName.trim() || !routine) return
    setRoutine({ ...routine, name: newName.trim() })
    setRenameOpen(false)
    await supabase.from('routines').update({ name: newName.trim() }).eq('id', routineId)
  }

  const deleteRoutine = async () => {
    await supabase.from('routines').delete().eq('id', routineId)
    router.push('/routine')
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 12 }}>
      {/* Header */}
      <Box sx={{ px: 3, pt: 4, pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => router.push('/routine')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>
          {routine?.name ?? 'Rutina'}
        </Typography>
        <IconButton
          onClick={() => {
            setNewName(routine?.name ?? '')
            setRenameOpen(true)
          }}
        >
          <EditIcon />
        </IconButton>
      </Box>

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {loading && <Typography color="text.secondary">Cargando...</Typography>}

        {!loading && routine && (
          <>
            <FormControlLabel
              control={
                <Switch
                  checked={routine.is_public}
                  onChange={(e) => togglePublic(e.target.checked)}
                />
              }
              label={routine.is_public ? 'Pública' : 'Privada'}
            />

            {items.length === 0 && (
              <Typography color="text.secondary" sx={{ py: 2 }}>
                Esta rutina no tiene ejercicios. Agregá desde la biblioteca.
              </Typography>
            )}

            {items.map((item) => (
              <Card key={item.id}>
                <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {item.exercise?.name ?? 'Ejercicio'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.sets?.length ?? 0} series · {setsSummary(item.sets ?? [])}
                      {item.rest_seconds ? ` · ${item.rest_seconds}s` : ''}
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

            <Button variant="outlined" startIcon={<AddIcon />} href="/exercises" sx={{ mt: 1 }}>
              Agregar ejercicios
            </Button>

            <Button color="error" onClick={deleteRoutine} sx={{ mt: 2 }}>
              Eliminar rutina
            </Button>
          </>
        )}
      </Box>

      {/* Renombrar */}
      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Renombrar rutina</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setRenameOpen(false)}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={saveName}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
