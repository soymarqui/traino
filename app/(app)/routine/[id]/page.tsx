'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/Delete'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import { createClient } from '@/lib/supabase/client'
import CoverPicker from '@/components/CoverPicker'
import { Equipment, Routine, RoutineDay, RoutineExercise, RoutineExerciseSet } from '@/types/database'
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
  const [days, setDays] = useState<RoutineDay[]>([])
  const [items, setItems] = useState<RoutineExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [saveOpen, setSaveOpen] = useState(false)
  const [incompleteNames, setIncompleteNames] = useState<string[]>([])
  const [renameOpen, setRenameOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [deleteDayId, setDeleteDayId] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [coverPickerOpen, setCoverPickerOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: r }, { data: d }, { data: ex }] = await Promise.all([
      supabase.from('routines').select('*').eq('id', routineId).single(),
      supabase.from('routine_days').select('*').eq('routine_id', routineId).order('position'),
      supabase
        .from('routine_exercises')
        .select('*, exercise:exercises(id, name, muscle:muscles(name)), sets:routine_exercise_sets(*)')
        .eq('routine_id', routineId)
        .order('position'),
    ])
    // Las rutinas ajenas son de solo lectura: redirigir a la vista pública.
    if (r && (r as Routine).owner_id && user && (r as Routine).owner_id !== user.id) {
      router.replace(`/r/${routineId}`)
      return
    }
    setRoutine(r as Routine)
    setDescription((r as Routine)?.description ?? '')
    setDays((d as RoutineDay[]) || [])
    setItems((ex as RoutineExercise[]) || [])
    setLoading(false)
  }

  const saveDescription = async () => {
    if (!routine) return
    const value = description.trim() || null
    if (value === (routine.description ?? null)) return
    setRoutine({ ...routine, description: value })
    await supabase.from('routines').update({ description: value }).eq('id', routineId)
  }

  const setCover = async (url: string) => {
    await supabase.from('routines').update({ cover_url: url }).eq('id', routineId)
    setRoutine((prev) => (prev ? { ...prev, cover_url: url } : prev))
  }

  const pickCover = async (url: string) => {
    setCoverPickerOpen(false)
    await setCover(url)
  }

  const uploadCover = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUploadingCover(true)
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${user.id}/${routineId}.${ext}`
    const { error } = await supabase.storage.from('routine-covers').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('routine-covers').getPublicUrl(path)
      await setCover(`${data.publicUrl}?t=${Date.now()}`)
    }
    setUploadingCover(false)
    setCoverPickerOpen(false)
  }

  const setVisibility = async (value: 'private' | 'unlisted' | 'public') => {
    if (!routine) return
    setRoutine({ ...routine, visibility: value })
    await supabase.from('routines').update({ visibility: value }).eq('id', routineId)
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

  const saveRoutine = () => {
    // Validar: cada ejercicio con descanso y al menos una serie con valor (reps/tiempo/al fallo).
    const incomplete = items
      .filter((it) => {
        const noRest = it.rest_seconds == null
        const sets = it.sets ?? []
        const noValue =
          sets.length === 0 ||
          sets.every((s) => s.reps == null && s.duration_seconds == null && !s.to_failure)
        return noRest || noValue
      })
      .map((it) => it.exercise?.name ?? 'Ejercicio')
    if (incomplete.length) {
      setIncompleteNames(incomplete)
      setSaveOpen(true)
    } else {
      router.push('/routine')
    }
  }

  const addDay = async () => {
    const { data } = await supabase
      .from('routine_days')
      .insert({ routine_id: routineId, name: `Día ${days.length + 1}`, position: days.length })
      .select()
      .single()
    if (data) setDays((prev) => [...prev, data as RoutineDay])
  }

  const renameDay = async (id: string, name: string) => {
    setDays((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)))
  }

  const persistDay = async (id: string, name: string) => {
    await supabase.from('routine_days').update({ name }).eq('id', id)
  }

  const confirmDeleteDay = async () => {
    if (!deleteDayId) return
    setDays((prev) => prev.filter((d) => d.id !== deleteDayId))
    setItems((prev) => prev.filter((i) => i.routine_day_id !== deleteDayId))
    await supabase.from('routine_days').delete().eq('id', deleteDayId)
    setDeleteDayId(null)
  }

  const removeItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    await supabase.from('routine_exercises').delete().eq('id', id)
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

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {loading && <Typography color="text.secondary">Cargando...</Typography>}

        {!loading && routine && (
          <>
            <TextField
              label="Visibilidad"
              select
              value={routine.visibility}
              onChange={(e) => setVisibility(e.target.value as 'private' | 'unlisted' | 'public')}
              fullWidth
              helperText={
                routine.visibility === 'private'
                  ? 'Solo la ves vos.'
                  : routine.visibility === 'unlisted'
                  ? 'Accesible con el link, no aparece en tu perfil.'
                  : 'Visible en tu perfil (para la comunidad).'
              }
            >
              <MenuItem value="private">🔒 Privada</MenuItem>
              <MenuItem value="unlisted">🙈 No listada</MenuItem>
              <MenuItem value="public">🌐 Pública</MenuItem>
            </TextField>

            {/* Portada */}
            <Box
              onClick={() => setCoverPickerOpen(true)}
              sx={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16 / 9',
                borderRadius: 3,
                overflow: 'hidden',
                cursor: 'pointer',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {routine.cover_url ? (
                <Box component="img" src={routine.cover_url} alt="Portada" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                  <AddPhotoAlternateIcon sx={{ fontSize: 32 }} />
                  <Typography variant="caption" sx={{ display: 'block' }}>Agregar portada</Typography>
                </Box>
              )}
              {uploadingCover && (
                <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#fff' }}>Subiendo...</Typography>
                </Box>
              )}
            </Box>

            {/* Descripción */}
            <TextField
              label="Descripción"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDescription}
              fullWidth
              multiline
              rows={3}
              placeholder="¿De qué trata? ¿A quién está dirigida? ¿Qué objetivos tiene?"
            />

            {days.map((day) => {
              const dayItems = items.filter((i) => i.routine_day_id === day.id)
              return (
                <Box key={day.id} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      variant="standard"
                      value={day.name}
                      onChange={(e) => renameDay(day.id, e.target.value)}
                      onBlur={(e) => persistDay(day.id, e.target.value.trim() || day.name)}
                      sx={{ flex: 1, '& input': { fontWeight: 700, fontSize: '1.05rem' } }}
                    />
                    <IconButton size="small" onClick={() => setDeleteDayId(day.id)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  {dayItems.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Sin ejercicios. Agregá desde la biblioteca.
                    </Typography>
                  )}

                  {dayItems.map((item) => (
                    <Card key={item.id}>
                      <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 1.5 }}>
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

                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => router.push(`/routine/${routineId}/add/${day.id}`)}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Agregar ejercicios
                  </Button>
                </Box>
              )
            })}

            <Button variant="outlined" color="inherit" startIcon={<AddIcon />} onClick={addDay}>
              Agregar día
            </Button>

            <Button variant="contained" size="large" onClick={saveRoutine} sx={{ mt: 1 }}>
              Guardar rutina
            </Button>

            <Button color="error" onClick={deleteRoutine} sx={{ mt: 1 }}>
              Eliminar rutina
            </Button>
          </>
        )}
      </Box>

      {/* Validación al guardar */}
      <Dialog open={saveOpen} onClose={() => setSaveOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Ejercicios incompletos</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Estos ejercicios no tienen reps o descanso seteados:
          </Typography>
          {incompleteNames.map((n, i) => (
            <Typography key={i} variant="body2" sx={{ fontWeight: 600 }}>
              · {n}
            </Typography>
          ))}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setSaveOpen(false)}>
            Completar
          </Button>
          <Button color="error" onClick={() => router.push('/routine')}>
            Guardar igualmente
          </Button>
        </DialogActions>
      </Dialog>

      <CoverPicker
        open={coverPickerOpen}
        onClose={() => setCoverPickerOpen(false)}
        onPick={pickCover}
        onUpload={uploadCover}
        uploading={uploadingCover}
      />

      {/* Renombrar rutina */}
      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Renombrar rutina</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth value={newName} onChange={(e) => setNewName(e.target.value)} sx={{ mt: 1 }} />
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

      {/* Confirmar borrar día */}
      <Dialog open={!!deleteDayId} onClose={() => setDeleteDayId(null)} fullWidth maxWidth="xs">
        <DialogTitle>Eliminar día</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Se eliminan también los ejercicios de ese día. ¿Seguro?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDeleteDayId(null)}>
            Cancelar
          </Button>
          <Button color="error" onClick={confirmDeleteDay}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
