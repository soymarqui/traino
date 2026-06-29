'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Snackbar from '@mui/material/Snackbar'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import AddIcon from '@mui/icons-material/Add'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { createClient } from '@/lib/supabase/client'
import PostComments from '@/components/PostComments'
import { useRouter, useParams } from 'next/navigation'

type Profile = { id: string; handle: string | null; display_name: string | null; avatar_url: string | null }
type Member = { user_id: string; role: string }
type Post = { id: string; user_id: string; summary: string | null; photo_url: string | null; created_at: string }
type EventRow = { id: string; title: string; description: string | null; count: number; mine: boolean }
type ChallengeRow = {
  id: string
  name: string
  objective: string | null
  duration_days: number | null
  status: string
  count: number
  mine: boolean
}

export default function GroupPage() {
  const params = useParams()
  const groupId = params.id as string
  const [group, setGroup] = useState<{ name: string; owner_id: string; visibility?: string } | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [posts, setPosts] = useState<Post[]>([])
  const [likes, setLikes] = useState<Record<string, { count: number; mine: boolean }>>({})
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [events, setEvents] = useState<EventRow[]>([])
  const [challenges, setChallenges] = useState<ChallengeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [renameOpen, setRenameOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [inviteHandle, setInviteHandle] = useState('')
  const [evTitle, setEvTitle] = useState('')
  const [evDesc, setEvDesc] = useState('')
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

    const { data: g } = await supabase.from('groups').select('name, owner_id, visibility').eq('id', groupId).maybeSingle()
    setGroup(g as { name: string; owner_id: string; visibility?: string } | null)

    const { data: mem } = await supabase.from('group_members').select('user_id, role').eq('group_id', groupId)
    const members = (mem as Member[]) || []
    setMembers(members)
    setIsAdmin(members.some((m) => m.user_id === user?.id && m.role === 'admin'))

    const { data: ps } = await supabase
      .from('group_posts')
      .select('id, user_id, summary, photo_url, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
    const postList = (ps as Post[]) || []
    setPosts(postList)

    // Likes 💪 de los posts.
    const postIds = postList.map((p) => p.id)
    if (postIds.length) {
      const { data: pl } = await supabase.from('post_likes').select('post_id, user_id').in('post_id', postIds)
      const map: Record<string, { count: number; mine: boolean }> = {}
      postIds.forEach((id) => (map[id] = { count: 0, mine: false }))
      ;(pl || []).forEach((l: { post_id: string; user_id: string }) => {
        if (!map[l.post_id]) map[l.post_id] = { count: 0, mine: false }
        map[l.post_id].count++
        if (l.user_id === user?.id) map[l.post_id].mine = true
      })
      setLikes(map)

      const { data: pc } = await supabase.from('post_comments').select('post_id').in('post_id', postIds)
      const cmap: Record<string, number> = {}
      postIds.forEach((id) => (cmap[id] = 0))
      ;(pc || []).forEach((c: { post_id: string }) => (cmap[c.post_id] = (cmap[c.post_id] ?? 0) + 1))
      setCommentCounts(cmap)
    }

    // Perfiles de todos los usuarios involucrados.
    const userIds = [...new Set([...members.map((m) => m.user_id), ...((ps as Post[]) || []).map((p) => p.user_id)])]
    if (userIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, handle, display_name, avatar_url')
        .in('id', userIds)
      const map: Record<string, Profile> = {}
      ;(profs || []).forEach((p: Profile) => (map[p.id] = p))
      setProfiles(map)
    }

    // Eventos + participación.
    const { data: evs } = await supabase
      .from('group_events')
      .select('id, title, description')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
    const evList = (evs as { id: string; title: string; description: string | null }[]) || []
    if (evList.length) {
      const { data: parts } = await supabase
        .from('group_event_participants')
        .select('event_id, user_id')
        .in('event_id', evList.map((e) => e.id))
      const partList = (parts as { event_id: string; user_id: string }[]) || []
      setEvents(
        evList.map((e) => ({
          ...e,
          count: partList.filter((p) => p.event_id === e.id).length,
          mine: partList.some((p) => p.event_id === e.id && p.user_id === user?.id),
        }))
      )
    } else {
      setEvents([])
    }

    // Desafíos asignados a este grupo.
    const { data: chs } = await supabase
      .from('challenges')
      .select('id, name, objective, duration_days, status')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
    const chList = (chs as { id: string; name: string; objective: string | null; duration_days: number | null; status: string }[]) || []
    if (chList.length) {
      const { data: cparts } = await supabase
        .from('challenge_participants')
        .select('challenge_id, user_id, status')
        .in('challenge_id', chList.map((c) => c.id))
      const cpl = (cparts as { challenge_id: string; user_id: string; status: string }[]) || []
      setChallenges(
        chList.map((c) => ({
          ...c,
          count: cpl.filter((p) => p.challenge_id === c.id && p.status === 'accepted').length,
          mine: cpl.some((p) => p.challenge_id === c.id && p.user_id === user?.id && p.status === 'accepted'),
        }))
      )
    } else {
      setChallenges([])
    }
    setLoading(false)
  }

  const setChallengeStatus = async (id: string, status: 'active' | 'rejected') => {
    setChallenges((prev) =>
      status === 'rejected'
        ? prev.filter((c) => c.id !== id)
        : prev.map((c) => (c.id === id ? { ...c, status } : c))
    )
    await supabase.from('challenges').update({ status }).eq('id', id)
  }

  const toggleChallenge = async (ch: ChallengeRow) => {
    if (!userId) return
    setChallenges((prev) =>
      prev.map((c) => (c.id === ch.id ? { ...c, mine: !c.mine, count: c.count + (c.mine ? -1 : 1) } : c))
    )
    if (ch.mine) {
      await supabase.from('challenge_participants').delete().eq('challenge_id', ch.id).eq('user_id', userId)
    } else {
      await supabase
        .from('challenge_participants')
        .upsert({ challenge_id: ch.id, user_id: userId, status: 'accepted' }, { onConflict: 'challenge_id,user_id' })
    }
  }

  const rename = async () => {
    if (!newName.trim()) return
    setGroup((g) => (g ? { ...g, name: newName.trim() } : g))
    setRenameOpen(false)
    await supabase.from('groups').update({ name: newName.trim() }).eq('id', groupId)
  }

  const deleteGroup = async () => {
    await supabase.from('groups').delete().eq('id', groupId)
    router.push('/friends')
  }

  const setVisibility = async (value: 'public' | 'private') => {
    setGroup((g) => (g ? { ...g, visibility: value } : g))
    await supabase.from('groups').update({ visibility: value }).eq('id', groupId)
  }

  const invite = async () => {
    const handle = inviteHandle.trim().toLowerCase().replace(/^@/, '')
    if (!handle) return
    const { data: prof } = await supabase.from('profiles').select('id').eq('handle', handle).maybeSingle()
    if (!prof) {
      setSnack('No existe ese usuario')
      return
    }
    const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: prof.id, role: 'member' })
    setInviteOpen(false)
    setInviteHandle('')
    setSnack(error ? 'No se pudo invitar (¿ya está?)' : 'Usuario agregado')
    if (!error) load()
  }

  const leave = async () => {
    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId ?? '')
    router.push('/friends')
  }

  const createEvent = async () => {
    if (!evTitle.trim()) return
    await supabase.from('group_events').insert({ group_id: groupId, title: evTitle.trim(), description: evDesc.trim() || null })
    setEventOpen(false)
    setEvTitle('')
    setEvDesc('')
    load()
  }

  const toggleParticipate = async (ev: EventRow) => {
    if (!userId) return
    setEvents((prev) =>
      prev.map((e) => (e.id === ev.id ? { ...e, mine: !e.mine, count: e.count + (e.mine ? -1 : 1) } : e))
    )
    if (ev.mine) {
      await supabase.from('group_event_participants').delete().eq('event_id', ev.id).eq('user_id', userId)
    } else {
      await supabase.from('group_event_participants').insert({ event_id: ev.id, user_id: userId })
    }
  }

  const toggleLike = async (postId: string) => {
    if (!userId) return
    const cur = likes[postId] ?? { count: 0, mine: false }
    setLikes((prev) => ({
      ...prev,
      [postId]: { count: cur.count + (cur.mine ? -1 : 1), mine: !cur.mine },
    }))
    if (cur.mine) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId)
    } else {
      await supabase.from('post_likes').upsert({ post_id: postId, user_id: userId }, { onConflict: 'post_id,user_id' })
    }
  }

  const nameOf = (uid: string) => {
    const p = profiles[uid]
    return p?.handle ? `@${p.handle}` : p?.display_name || 'usuario'
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 12 }}>
      {/* Header */}
      <Box sx={{ px: 3, pt: 4, pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => router.push('/friends')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>
          {group?.name ?? 'Grupo'}
        </Typography>
        {isAdmin && (
          <IconButton onClick={() => { setNewName(group?.name ?? ''); setRenameOpen(true) }}>
            <EditIcon />
          </IconButton>
        )}
      </Box>

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {loading && <Typography color="text.secondary">Cargando...</Typography>}

        {!loading && group && (
          <>
            {/* Visibilidad (solo admin) */}
            {isAdmin && (
              <TextField
                select
                fullWidth
                size="small"
                label="Visibilidad"
                value={group.visibility ?? 'private'}
                onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
                helperText={
                  (group.visibility ?? 'private') === 'public'
                    ? 'Pública: aparece en el buscador, cualquiera puede unirse.'
                    : 'Privada: solo por invitación.'
                }
              >
                <MenuItem value="private">🔒 Privada</MenuItem>
                <MenuItem value="public">🌐 Pública</MenuItem>
              </TextField>
            )}

            {/* Eventos */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Eventos y desafíos
                </Typography>
                {isAdmin && (
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setEventOpen(true)}>
                    Nuevo
                  </Button>
                )}
              </Box>
              {events.length === 0 && (
                <Typography variant="body2" color="text.secondary">Sin eventos activos.</Typography>
              )}
              {events.map((ev) => (
                <Card key={ev.id}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>{ev.title}</Typography>
                      {ev.description && (
                        <Typography variant="body2" color="text.secondary">{ev.description}</Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">{ev.count} participando</Typography>
                    </Box>
                    <Button
                      size="small"
                      variant={ev.mine ? 'contained' : 'outlined'}
                      color={ev.mine ? 'primary' : 'inherit'}
                      onClick={() => toggleParticipate(ev)}
                    >
                      {ev.mine ? 'Participás' : 'Participar'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </Box>

            {/* Desafíos */}
            {challenges.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Desafíos
                </Typography>
                {challenges.map((c) => (
                  <Card key={c.id}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EmojiEventsIcon sx={{ color: 'primary.main' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {c.name}
                          {c.status === 'pending' && <Chip label="Pendiente" size="small" sx={{ ml: 1, height: 18 }} />}
                        </Typography>
                        {(c.objective || c.duration_days) && (
                          <Typography variant="body2" color="text.secondary">
                            {[c.objective, c.duration_days ? `${c.duration_days} días` : null].filter(Boolean).join(' · ')}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">{c.count} participando</Typography>
                      </Box>
                      {c.status === 'pending' && isAdmin ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Button size="small" variant="contained" onClick={() => setChallengeStatus(c.id, 'active')}>
                            Aprobar
                          </Button>
                          <Button size="small" color="error" onClick={() => setChallengeStatus(c.id, 'rejected')}>
                            Rechazar
                          </Button>
                        </Box>
                      ) : c.status === 'active' ? (
                        <Button
                          size="small"
                          variant={c.mine ? 'contained' : 'outlined'}
                          color={c.mine ? 'primary' : 'inherit'}
                          onClick={() => toggleChallenge(c)}
                        >
                          {c.mine ? 'Participás' : 'Sumarme'}
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}

            {/* Feed */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                Feed
              </Typography>
              {posts.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Todavía nadie compartió un entrenamiento.
                </Typography>
              )}
              {posts.map((p) => (
                <Card key={p.id}>
                  {p.photo_url && (
                    <Box component="img" src={p.photo_url} alt="" sx={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
                  )}
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Avatar src={profiles[p.user_id]?.avatar_url || undefined} sx={{ width: 24, height: 24, fontSize: '0.8rem' }}>
                        {nameOf(p.user_id)[1]?.toUpperCase()}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{nameOf(p.user_id)}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">{p.summary || 'Compartió un entrenamiento'}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, ml: -0.5 }}>
                      <IconButton size="small" onClick={() => toggleLike(p.id)} aria-label="Me gusta">
                        <span style={{ fontSize: '1.1rem', opacity: likes[p.id]?.mine ? 1 : 0.4, filter: likes[p.id]?.mine ? 'none' : 'grayscale(1)' }}>
                          💪
                        </span>
                      </IconButton>
                      <Typography variant="body2" color={likes[p.id]?.mine ? 'primary.main' : 'text.secondary'} sx={{ fontWeight: 600 }}>
                        {likes[p.id]?.count ?? 0}
                      </Typography>
                      <PostComments
                        postId={p.id}
                        userId={userId}
                        count={commentCounts[p.id] ?? 0}
                        onCount={(n) => setCommentCounts((prev) => ({ ...prev, [p.id]: n }))}
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>

            {/* Miembros */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Miembros ({members.length})
                </Typography>
                {isAdmin && (
                  <Button size="small" startIcon={<PersonAddIcon />} onClick={() => setInviteOpen(true)}>
                    Invitar
                  </Button>
                )}
              </Box>
              {members.map((m) => (
                <Box key={m.user_id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar src={profiles[m.user_id]?.avatar_url || undefined} sx={{ width: 32, height: 32, fontSize: '0.9rem' }}>
                    {nameOf(m.user_id)[1]?.toUpperCase()}
                  </Avatar>
                  <Typography variant="body2" sx={{ flex: 1 }}>{nameOf(m.user_id)}</Typography>
                  {m.role === 'admin' && <Chip label="Admin" size="small" color="primary" />}
                </Box>
              ))}
            </Box>

            {isAdmin ? (
              <Button color="error" onClick={deleteGroup} sx={{ mt: 2 }}>
                Eliminar grupo
              </Button>
            ) : (
              <Button color="inherit" onClick={leave} sx={{ mt: 2 }}>
                Salir del grupo
              </Button>
            )}
          </>
        )}
      </Box>

      {/* Renombrar */}
      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Renombrar grupo</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth value={newName} onChange={(e) => setNewName(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setRenameOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={rename}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Invitar */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Invitar al grupo</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Usuario (@handle)"
            value={inviteHandle}
            onChange={(e) => setInviteHandle(e.target.value)}
            sx={{ mt: 1 }}
            onKeyDown={(e) => e.key === 'Enter' && invite()}
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setInviteOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={invite}>Invitar</Button>
        </DialogActions>
      </Dialog>

      {/* Nuevo evento */}
      <Dialog open={eventOpen} onClose={() => setEventOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Nuevo evento / desafío</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label="Título"
            value={evTitle}
            onChange={(e) => setEvTitle(e.target.value)}
            placeholder="Ej: 3 entrenamientos de piernas esta semana"
            sx={{ mt: 1 }}
          />
          <TextField
            fullWidth
            label="Descripción (opcional)"
            value={evDesc}
            onChange={(e) => setEvDesc(e.target.value)}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setEventOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={createEvent} disabled={!evTitle.trim()}>Crear</Button>
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
