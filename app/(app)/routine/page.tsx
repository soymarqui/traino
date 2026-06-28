'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Snackbar from '@mui/material/Snackbar'
import AddIcon from '@mui/icons-material/Add'
import ChecklistIcon from '@mui/icons-material/Checklist'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import SwipeableRow from './SwipeableRow'

type RoutineRow = {
  id: string
  name: string
  is_public: boolean
  routine_exercises: { count: number }[]
}

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<RoutineRow[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [snack, setSnack] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)

    const [{ data: routinesData }, { data: profile }] = await Promise.all([
      supabase
        .from('routines')
        .select('id, name, is_public, routine_exercises(count)')
        .order('created_at'),
      user
        ? supabase.from('profiles').select('active_routine_id').eq('id', user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    setRoutines((routinesData as RoutineRow[]) || [])
    setActiveId((profile as { active_routine_id: string | null } | null)?.active_routine_id ?? null)
    setLoading(false)
  }

  const createRoutine = async () => {
    if (!name.trim()) return
    setCreating(true)
    const { data, error } = await supabase
      .from('routines')
      .insert({ owner_id: userId, name: name.trim() })
      .select()
      .single()
    setCreating(false)
    setCreateOpen(false)
    setName('')
    if (!error && data) router.push(`/routine/${data.id}`)
  }

  const activate = async (id: string) => {
    setActiveId(id)
    await supabase.from('profiles').update({ active_routine_id: id }).eq('id', userId ?? '')
    setSnack('Rutina activada')
  }

  const duplicate = async (r: RoutineRow) => {
    const { data: exs } = await supabase
      .from('routine_exercises')
      .select('*, sets:routine_exercise_sets(*)')
      .eq('routine_id', r.id)

    const { data: newR } = await supabase
      .from('routines')
      .insert({ owner_id: userId, name: `${r.name} (copia)` })
      .select()
      .single()
    if (!newR) return

    for (const ex of exs || []) {
      const { data: newEx } = await supabase
        .from('routine_exercises')
        .insert({
          routine_id: newR.id,
          exercise_id: ex.exercise_id,
          rest_seconds: ex.rest_seconds,
          equipment: ex.equipment,
          unilateral: ex.unilateral,
          notes: ex.notes,
          position: ex.position,
        })
        .select()
        .single()
      if (newEx && ex.sets?.length) {
        await supabase.from('routine_exercise_sets').insert(
          ex.sets.map((s: { set_number: number; reps: number | null; reps_max: number | null; duration_seconds: number | null; to_failure: boolean; weight: number | null }) => ({
            routine_exercise_id: newEx.id,
            set_number: s.set_number,
            reps: s.reps,
            reps_max: s.reps_max,
            duration_seconds: s.duration_seconds,
            to_failure: s.to_failure,
            weight: s.weight,
          }))
        )
      }
    }
    setSnack('Rutina duplicada')
    load()
  }

  // Activa primero, después el resto.
  const ordered = [...routines].sort((a, b) => {
    if (a.id === activeId) return -1
    if (b.id === activeId) return 1
    return 0
  })

  return (
    <Box sx={{ minHeight: '100vh', pb: 12 }}>
      {/* Header */}
      <Box
        sx={{ px: 3, pt: 4, pb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Mis rutinas
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => setCreateOpen(true)}>
          Nueva
        </Button>
      </Box>

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {loading && <Typography color="text.secondary">Cargando...</Typography>}

        {!loading && routines.length === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pt: 8, textAlign: 'center' }}>
            <ChecklistIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Typography color="text.secondary">Todavía no tenés rutinas. Creá la primera.</Typography>
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              Nueva rutina
            </Button>
          </Box>
        )}

        {!loading &&
          ordered.map((r) => {
            const isActive = r.id === activeId
            return (
              <SwipeableRow
                key={r.id}
                onPress={() => router.push(`/routine/${r.id}`)}
                leading={
                  isActive ? undefined : { label: 'Activar', bg: '#C6F135', color: '#0A0A0A', onClick: () => activate(r.id) }
                }
                trailing={[
                  { label: 'Compartir', bg: '#3a3a3a', onClick: () => setSnack('Compartir: próximamente (con Amigos)') },
                  { label: 'Editar', bg: '#3b82f6', onClick: () => router.push(`/routine/${r.id}`) },
                  { label: 'Duplicar', bg: '#555', onClick: () => duplicate(r) },
                ]}
              >
                <Card sx={{ border: '2px solid', borderColor: isActive ? 'primary.main' : 'divider' }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {r.name}
                        </Typography>
                        {isActive && <Chip label="Activa" size="small" color="primary" />}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {r.routine_exercises?.[0]?.count ?? 0} ejercicios ·{' '}
                        {r.is_public ? 'Pública' : 'Privada'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </SwipeableRow>
            )
          })}

        {!loading && routines.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
            Deslizá una rutina: → para activarla, ← para compartir / editar / duplicar
          </Typography>
        )}
      </Box>

      {/* Crear rutina */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Nueva rutina</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Bajar de peso, Fuerza..."
            sx={{ mt: 1 }}
            onKeyDown={(e) => e.key === 'Enter' && createRoutine()}
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setCreateOpen(false)}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={createRoutine} disabled={creating || !name.trim()}>
            {creating ? 'Creando...' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack}
        autoHideDuration={2500}
        onClose={() => setSnack('')}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 8 }}
      />
    </Box>
  )
}
