'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import GroupIcon from '@mui/icons-material/Group'
import { createClient } from '@/lib/supabase/client'
import { fetchNotifications, type Notif } from '@/lib/notifications'
import { useRouter } from 'next/navigation'

export default function NotificationsPage() {
  const [items, setItems] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      const list = await fetchNotifications(supabase, user.id)
      setItems(list)
      setLoading(false)
      // Marcar como vistas (para limpiar el indicador de la campana).
      await supabase.auth.updateUser({ data: { notifs_seen_at: new Date().toISOString() } })
    }
    load()
  }, [])

  const reload = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setItems(await fetchNotifications(supabase, user.id))
  }

  const acceptRequest = async (requestId: string, id: string) => {
    setBusy(id)
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', requestId)
    await reload()
    setBusy(null)
  }

  const rejectRequest = async (requestId: string, id: string) => {
    setBusy(id)
    await supabase.from('friendships').delete().eq('id', requestId)
    setItems((prev) => prev.filter((n) => n.id !== id))
    setBusy(null)
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 12 }}>
      <Box sx={{ px: 3, pt: 4, pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => router.back()}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Notificaciones
        </Typography>
      </Box>

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {loading && <Typography color="text.secondary">Cargando...</Typography>}

        {!loading && items.length === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pt: 8, textAlign: 'center' }}>
            <NotificationsNoneIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Typography color="text.secondary">No tenés notificaciones.</Typography>
          </Box>
        )}

        {!loading &&
          items.map((n) => (
            <Card key={n.id}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '12px !important' }}>
                {n.kind === 'group' ? (
                  <Avatar sx={{ width: 40, height: 40, bgcolor: 'action.selected' }}><GroupIcon /></Avatar>
                ) : n.kind === 'routine' ? (
                  <Avatar src={n.actorAvatar || undefined} sx={{ width: 40, height: 40 }}>
                    <FitnessCenterIcon />
                  </Avatar>
                ) : (
                  <Avatar src={n.actorAvatar || undefined} sx={{ width: 40, height: 40 }}>
                    {n.actorName[1]?.toUpperCase()}
                  </Avatar>
                )}

                <Box
                  sx={{ flex: 1, cursor: n.href ? 'pointer' : 'default' }}
                  onClick={() => n.href && router.push(n.href)}
                >
                  <Typography variant="body2">
                    {n.actorName && <b>{n.actorName}</b>} {n.text}
                  </Typography>
                </Box>

                {n.kind === 'request' && n.requestId && (
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Button size="small" variant="contained" disabled={busy === n.id} onClick={() => acceptRequest(n.requestId!, n.id)}>
                      Aceptar
                    </Button>
                    <Button size="small" color="inherit" disabled={busy === n.id} onClick={() => rejectRequest(n.requestId!, n.id)}>
                      Rechazar
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
      </Box>
    </Box>
  )
}
