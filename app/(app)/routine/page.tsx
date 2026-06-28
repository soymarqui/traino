'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import AddIcon from '@mui/icons-material/Add'
import ChecklistIcon from '@mui/icons-material/Checklist'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type RoutineRow = {
  id: string
  name: string
  is_public: boolean
  routine_exercises: { count: number }[]
}

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<RoutineRow[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchRoutines()
  }, [])

  const fetchRoutines = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('routines')
      .select('id, name, is_public, routine_exercises(count)')
      .order('created_at')
    setRoutines((data as RoutineRow[]) || [])
    setLoading(false)
  }

  const createRoutine = async () => {
    if (!name.trim()) return
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('routines')
      .insert({ owner_id: user?.id, name: name.trim() })
      .select()
      .single()
    setCreating(false)
    setCreateOpen(false)
    setName('')
    if (!error && data) router.push(`/routine/${data.id}`)
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 12 }}>
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
          Mis rutinas
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size="small"
          onClick={() => setCreateOpen(true)}
        >
          Nueva
        </Button>
      </Box>

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {loading && <Typography color="text.secondary">Cargando...</Typography>}

        {!loading && routines.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              pt: 8,
              textAlign: 'center',
            }}
          >
            <ChecklistIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Typography color="text.secondary">
              Todavía no tenés rutinas. Creá la primera.
            </Typography>
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              Nueva rutina
            </Button>
          </Box>
        )}

        {!loading &&
          routines.map((r) => (
            <Card key={r.id}>
              <CardActionArea onClick={() => router.push(`/routine/${r.id}`)}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {r.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {r.routine_exercises?.[0]?.count ?? 0} ejercicios
                    </Typography>
                  </Box>
                  <Chip
                    label={r.is_public ? 'Pública' : 'Privada'}
                    size="small"
                    color={r.is_public ? 'primary' : 'default'}
                    sx={{ opacity: r.is_public ? 1 : 0.7 }}
                  />
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
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
            placeholder="Ej: Push, Pull, Piernas..."
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
    </Box>
  )
}
