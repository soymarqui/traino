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
import StarIcon from '@mui/icons-material/Star'
import ShareIcon from '@mui/icons-material/Share'
import EditIcon from '@mui/icons-material/Edit'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import LinkOffIcon from '@mui/icons-material/LinkOff'
import LockIcon from '@mui/icons-material/Lock'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import PublicIcon from '@mui/icons-material/Public'
import { createClient } from '@/lib/supabase/client'
import { duplicateRoutine } from '@/lib/routines'
import { gradientBorderSx } from '@/lib/theme'
import { useRouter } from 'next/navigation'
import SwipeableRow from '@/components/SwipeableRow'

type Visibility = 'private' | 'unlisted' | 'public'

function VisibilityIcon({ v }: { v: Visibility }) {
  const sx = { fontSize: 16, color: 'text.secondary' }
  if (v === 'public') return <PublicIcon sx={sx} />
  if (v === 'unlisted') return <VisibilityOffIcon sx={sx} />
  return <LockIcon sx={sx} />
}

type RoutineRow = {
  id: string
  name: string
  visibility: Visibility
  owner_id: string
  routine_exercises: { count: number }[]
  handle?: string | null
}

export default function RoutinesPage() {
  const [owned, setOwned] = useState<RoutineRow[]>([])
  const [subscribed, setSubscribed] = useState<RoutineRow[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
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

    const [{ data: ownedData }, { data: profile }, { data: subs }] = await Promise.all([
      supabase.from('routines').select('id, name, visibility, owner_id, routine_exercises(count)').order('created_at'),
      user ? supabase.from('profiles').select('active_routine_id').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null }),
      user ? supabase.from('routine_subscriptions').select('routine_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
    ])

    setOwned((ownedData as RoutineRow[]) || [])
    setActiveId((profile as { active_routine_id: string | null } | null)?.active_routine_id ?? null)

    // Rutinas suscritas (de otros, públicas) + handle del autor.
    const subIds = (subs as { routine_id: string }[] | null)?.map((s) => s.routine_id) ?? []
    if (subIds.length) {
      const { data: subRoutines } = await supabase
        .from('routines')
        .select('id, name, visibility, owner_id, routine_exercises(count)')
        .in('id', subIds)
      const ownerIds = [...new Set((subRoutines || []).map((r: { owner_id: string }) => r.owner_id))]
      const { data: profs } = await supabase.from('profiles').select('id, handle').in('id', ownerIds)
      const handleById: Record<string, string | null> = {}
      ;(profs || []).forEach((p: { id: string; handle: string | null }) => (handleById[p.id] = p.handle))
      setSubscribed(
        (subRoutines as RoutineRow[] || []).map((r) => ({ ...r, handle: handleById[r.owner_id] ?? null }))
      )
    } else {
      setSubscribed([])
    }
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
    if (!error && data) {
      await supabase.from('routine_days').insert({ routine_id: data.id, name: 'Día 1', position: 0 })
    }
    setCreating(false)
    setCreateOpen(false)
    setName('')
    if (!error && data) router.push(`/routine/${data.id}`)
  }

  const activate = async (id: string) => {
    if (!userId) return
    setActiveId(id)
    await supabase.from('profiles').upsert({ id: userId, active_routine_id: id })
    setSnack('Rutina activada')
  }

  const share = async (r: RoutineRow) => {
    if (r.visibility === 'private') {
      await supabase.from('routines').update({ visibility: 'unlisted' }).eq('id', r.id)
      setOwned((prev) => prev.map((x) => (x.id === r.id ? { ...x, visibility: 'unlisted' } : x)))
    }
    setShareUrl(`${window.location.origin}/r/${r.id}`)
  }

  const duplicate = async (id: string) => {
    if (!userId) return
    await duplicateRoutine(supabase, id, userId)
    setSnack('Rutina duplicada')
    load()
  }

  const unsubscribe = async (id: string) => {
    setSubscribed((prev) => prev.filter((r) => r.id !== id))
    await supabase.from('routine_subscriptions').delete().eq('user_id', userId ?? '').eq('routine_id', id)
    setSnack('Suscripción quitada')
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setSnack('Link copiado')
    } catch {
      setSnack('Copiá el link manualmente')
    }
  }

  const orderedOwned = [...owned].sort((a, b) => {
    if (a.id === activeId) return -1
    if (b.id === activeId) return 1
    return 0
  })

  const renderRow = (r: RoutineRow, isSub: boolean) => {
    const isActive = r.id === activeId
    return (
      <SwipeableRow
        key={r.id}
        onPress={() => router.push(isSub ? `/r/${r.id}` : `/routine/${r.id}`)}
        leading={
          isActive
            ? undefined
            : {
                label: 'Activar',
                bg: '#C6F135',
                color: '#0A0A0A',
                icon: <StarIcon fontSize="small" />,
                onClick: () => activate(r.id),
              }
        }
        trailing={
          isSub
            ? [
                { label: 'Duplicar', bg: '#555', icon: <ContentCopyIcon fontSize="small" />, onClick: () => duplicate(r.id) },
                { label: 'Quitar', bg: '#b00020', icon: <LinkOffIcon fontSize="small" />, onClick: () => unsubscribe(r.id) },
              ]
            : [
                { label: 'Compartir', bg: '#3a3a3a', icon: <ShareIcon fontSize="small" />, onClick: () => share(r) },
                { label: 'Editar', bg: '#3b82f6', icon: <EditIcon fontSize="small" />, onClick: () => router.push(`/routine/${r.id}`) },
                { label: 'Duplicar', bg: '#555', icon: <ContentCopyIcon fontSize="small" />, onClick: () => duplicate(r.id) },
              ]
        }
      >
        <Card sx={isActive ? gradientBorderSx(18) : undefined}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {r.name}
                </Typography>
                {!isSub && <VisibilityIcon v={r.visibility} />}
                {isActive && <Chip label="Activa" size="small" color="primary" />}
              </Box>
              <Typography variant="body2" color="text.secondary">
                {r.routine_exercises?.[0]?.count ?? 0} ejercicios
                {isSub && r.handle ? ` · por @${r.handle}` : ''}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </SwipeableRow>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 12 }}>
      <Box sx={{ px: 3, pt: 4, pb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Mis rutinas
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => setCreateOpen(true)}>
          Nueva
        </Button>
      </Box>

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {loading && <Typography color="text.secondary">Cargando...</Typography>}

        {!loading && owned.length === 0 && subscribed.length === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pt: 8, textAlign: 'center' }}>
            <ChecklistIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Typography color="text.secondary">Todavía no tenés rutinas. Creá la primera.</Typography>
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              Nueva rutina
            </Button>
          </Box>
        )}

        {!loading && orderedOwned.map((r) => renderRow(r, false))}

        {!loading && subscribed.length > 0 && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, mt: 2 }}>
              Suscritas
            </Typography>
            {subscribed.map((r) => renderRow(r, true))}
          </>
        )}

        {!loading && (owned.length > 0 || subscribed.length > 0) && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
            Deslizá: → activar, ← más acciones
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

      {/* Compartir rutina */}
      <Dialog open={!!shareUrl} onClose={() => setShareUrl('')} fullWidth maxWidth="xs">
        <DialogTitle>Compartir rutina</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Queda accesible por link (no listada). Mandá este link para que se suscriban:
          </Typography>
          <TextField fullWidth value={shareUrl} slotProps={{ input: { readOnly: true } }} />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setShareUrl('')}>
            Cerrar
          </Button>
          <Button variant="contained" onClick={copyLink}>
            Copiar link
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
