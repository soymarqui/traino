'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Snackbar from '@mui/material/Snackbar'
import GroupIcon from '@mui/icons-material/Group'
import CloseIcon from '@mui/icons-material/Close'
import { createClient } from '@/lib/supabase/client'
import UserAvatar from '@/components/UserAvatar'
import { useRouter } from 'next/navigation'

type Profile = { id: string; handle: string | null; display_name: string | null; avatar_url: string | null }
type Row = { id: string; requester_id: string; addressee_id: string; status: string }

export default function AmigosPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [loading, setLoading] = useState(true)
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
    if (!user) {
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    const list = (data as Row[]) || []
    setRows(list)

    const ids = [...new Set(list.flatMap((r) => [r.requester_id, r.addressee_id]).filter((id) => id !== user.id))]
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, handle, display_name, avatar_url').in('id', ids)
      const map: Record<string, Profile> = {}
      ;(profs || []).forEach((p: Profile) => (map[p.id] = p))
      setProfiles(map)
    }
    setLoading(false)
  }

  const accept = async (id: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'accepted' } : r)))
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', id)
    setSnack('¡Ahora son amigos!')
  }

  const remove = async (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id))
    await supabase.from('friendships').delete().eq('id', id)
  }

  const otherId = (r: Row) => (r.requester_id === userId ? r.addressee_id : r.requester_id)
  const nameOf = (id: string) => {
    const p = profiles[id]
    return p?.handle ? `@${p.handle}` : p?.display_name || 'usuario'
  }

  const incoming = rows.filter((r) => r.status === 'pending' && r.addressee_id === userId)
  const outgoing = rows.filter((r) => r.status === 'pending' && r.requester_id === userId)
  const friends = rows.filter((r) => r.status === 'accepted')

  const goProfile = (id: string) => {
    const h = profiles[id]?.handle
    if (h) router.push(`/u/${h}`)
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 12 }}>
      <Box sx={{ px: 3, pt: 4, pb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Amigos
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Tus GymBros, GymSis y GymPals.
        </Typography>
      </Box>

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {loading && <Typography color="text.secondary">Cargando...</Typography>}

        {/* Solicitudes recibidas */}
        {!loading && incoming.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
              Solicitudes
            </Typography>
            {incoming.map((r) => {
              const oid = otherId(r)
              return (
                <Card key={r.id}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '12px !important' }}>
                    <UserAvatar src={profiles[oid]?.avatar_url} name={nameOf(oid)} size={40} onClick={() => goProfile(oid)} />
                    <Typography variant="body1" sx={{ fontWeight: 600, flex: 1 }}>{nameOf(oid)}</Typography>
                    <Button size="small" variant="contained" onClick={() => accept(r.id)}>Aceptar</Button>
                    <Button size="small" color="inherit" onClick={() => remove(r.id)}>Rechazar</Button>
                  </CardContent>
                </Card>
              )
            })}
          </Box>
        )}

        {/* Lista de amigos */}
        {!loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
              Tus amigos ({friends.length})
            </Typography>
            {friends.length === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pt: 4, textAlign: 'center' }}>
                <GroupIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                <Typography color="text.secondary">
                  Todavía no agregaste amigos. Buscá usuarios con 🔍 y mandales una solicitud.
                </Typography>
              </Box>
            )}
            {friends.map((r) => {
              const oid = otherId(r)
              return (
                <Card key={r.id}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '12px !important' }}>
                    <UserAvatar src={profiles[oid]?.avatar_url} name={nameOf(oid)} size={40} onClick={() => goProfile(oid)} />
                    <Typography variant="body1" sx={{ fontWeight: 600, flex: 1, cursor: 'pointer' }} onClick={() => goProfile(oid)}>
                      {nameOf(oid)}
                    </Typography>
                    <IconButton size="small" onClick={() => remove(r.id)} aria-label="Eliminar amigo">
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </CardContent>
                </Card>
              )
            })}
          </Box>
        )}

        {/* Solicitudes enviadas */}
        {!loading && outgoing.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
              Pendientes
            </Typography>
            {outgoing.map((r) => {
              const oid = otherId(r)
              return (
                <Card key={r.id}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '12px !important' }}>
                    <UserAvatar src={profiles[oid]?.avatar_url} name={nameOf(oid)} size={40} />
                    <Typography variant="body1" sx={{ fontWeight: 600, flex: 1 }}>{nameOf(oid)}</Typography>
                    <Chip label="Enviada" size="small" />
                    <IconButton size="small" onClick={() => remove(r.id)} aria-label="Cancelar solicitud">
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </CardContent>
                </Card>
              )
            })}
          </Box>
        )}
      </Box>

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
