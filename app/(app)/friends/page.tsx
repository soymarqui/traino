'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import SpeedDial from '@mui/material/SpeedDial'
import SpeedDialIcon from '@mui/material/SpeedDialIcon'
import SpeedDialAction from '@mui/material/SpeedDialAction'
import Snackbar from '@mui/material/Snackbar'
import GroupIcon from '@mui/icons-material/Group'
import AddIcon from '@mui/icons-material/Add'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { createClient } from '@/lib/supabase/client'
import CheckinCard from '@/components/CheckinCard'
import { useRouter } from 'next/navigation'

type GroupRow = { id: string; name: string; role: string }
type FeedPost = {
  id: string
  group_id: string | null
  user_id: string
  summary: string | null
  photo_url: string | null
  created_at: string
  workout_id: string | null
  workoutDate?: string | null
  routineName?: string | null
  routineId?: string | null
}
type ChallengeRow = {
  id: string
  name: string
  objective: string | null
  duration_days: number | null
  group_id: string | null
  status: string
  count: number
  mine: boolean
}

export default function FriendsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [feed, setFeed] = useState<FeedPost[]>([])
  const [likes, setLikes] = useState<Record<string, { count: number; mine: boolean }>>({})
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [challenges, setChallenges] = useState<ChallengeRow[]>([])
  const [groupNames, setGroupNames] = useState<Record<string, string>>({})
  const [handles, setHandles] = useState<Record<string, string | null>>({})
  const [authors, setAuthors] = useState<Record<string, { handle: string | null; display_name: string | null; avatar_url: string | null }>>({})
  const [order, setOrder] = useState<'reciente' | 'relevante'>('reciente')
  const [snack, setSnack] = useState('')

  // Crear grupo
  const [createOpen, setCreateOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupVisibility, setGroupVisibility] = useState<'public' | 'private'>('private')
  const [creating, setCreating] = useState(false)

  // Check-in
  const [checkinOpen, setCheckinOpen] = useState(false)
  const [ciGroup, setCiGroup] = useState('')
  const [ciComment, setCiComment] = useState('')
  const [ciFile, setCiFile] = useState<File | null>(null)
  const [ciShowRoutine, setCiShowRoutine] = useState(false)
  const [ciRoutine, setCiRoutine] = useState<{ id: string; name: string } | null>(null)
  const [ciSaving, setCiSaving] = useState(false)

  // Crear challenge
  const [chOpen, setChOpen] = useState(false)
  const [chName, setChName] = useState('')
  const [chDesc, setChDesc] = useState('')
  const [chDuration, setChDuration] = useState('')
  const [chObjective, setChObjective] = useState('')
  const [chGroup, setChGroup] = useState('')
  const [chInvite, setChInvite] = useState('')
  const [chSaving, setChSaving] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)

    // Mis grupos (con rol).
    const { data: mem } = await supabase
      .from('group_members')
      .select('role, group:groups(id, name)')
      .eq('user_id', user?.id ?? '')
    const groupList: GroupRow[] = (mem || [])
      .map((m: any) => {
        const g = Array.isArray(m.group) ? m.group[0] : m.group
        return g ? { id: g.id, name: g.name, role: m.role } : null
      })
      .filter(Boolean) as GroupRow[]
    setGroups(groupList)
    const names: Record<string, string> = {}
    groupList.forEach((g) => (names[g.id] = g.name))
    setGroupNames(names)
    const myGroupIds = groupList.map((g) => g.id)

    // Feed de posts.
    const { data: posts } = await supabase
      .from('group_posts')
      .select('id, group_id, user_id, summary, photo_url, created_at, workout_id, workout:workouts(started_at, routine:routines(id, name))')
      .order('created_at', { ascending: false })
      .limit(80)
    const feedPosts = ((posts as any[]) || []).map((p) => {
      const w = Array.isArray(p.workout) ? p.workout[0] : p.workout
      const r = w && (Array.isArray(w.routine) ? w.routine[0] : w.routine)
      return { ...p, workoutDate: w?.started_at ?? null, routineName: r?.name ?? null, routineId: r?.id ?? null } as FeedPost
    })
    setFeed(feedPosts)

    const uids = [...new Set(feedPosts.map((p) => p.user_id))]
    if (uids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, handle, display_name, avatar_url').in('id', uids)
      const h: Record<string, string | null> = {}
      const a: Record<string, { handle: string | null; display_name: string | null; avatar_url: string | null }> = {}
      ;(profs || []).forEach((p: { id: string; handle: string | null; display_name: string | null; avatar_url: string | null }) => {
        h[p.id] = p.handle
        a[p.id] = { handle: p.handle, display_name: p.display_name, avatar_url: p.avatar_url }
      })
      setHandles(h)
      setAuthors(a)
    }

    // Likes 💪 de los posts del feed.
    const postIds = feedPosts.map((p) => p.id)
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

    // Mi rutina activa (para "mostrar rutina" en el check-in).
    const { data: prof } = await supabase
      .from('profiles')
      .select('active_routine_id')
      .eq('id', user?.id ?? '')
      .maybeSingle()
    const activeRoutineId = (prof as { active_routine_id: string | null } | null)?.active_routine_id
    if (activeRoutineId) {
      const { data: actR } = await supabase
        .from('routines')
        .select('id, name')
        .eq('id', activeRoutineId)
        .maybeSingle()
      setCiRoutine((actR as { id: string; name: string } | null) ?? null)
    }

    // Desafíos relevantes: de mis grupos (activos), creados por mí, o donde participo.
    await loadChallenges(user?.id ?? '', myGroupIds)
  }

  const loadChallenges = async (uid: string, myGroupIds: string[]) => {
    const map: Record<string, any> = {}
    if (myGroupIds.length) {
      const { data } = await supabase
        .from('challenges')
        .select('id, name, objective, duration_days, group_id, status')
        .in('group_id', myGroupIds)
        .eq('status', 'active')
      ;(data || []).forEach((c: any) => (map[c.id] = c))
    }
    if (uid) {
      const { data: mineC } = await supabase
        .from('challenges')
        .select('id, name, objective, duration_days, group_id, status')
        .eq('creator_id', uid)
      ;(mineC || []).forEach((c: any) => (map[c.id] = c))

      const { data: parts } = await supabase
        .from('challenge_participants')
        .select('challenge_id')
        .eq('user_id', uid)
      const pids = (parts || []).map((p: { challenge_id: string }) => p.challenge_id).filter((id) => !map[id])
      if (pids.length) {
        const { data: invC } = await supabase
          .from('challenges')
          .select('id, name, objective, duration_days, group_id, status')
          .in('id', pids)
        ;(invC || []).forEach((c: any) => (map[c.id] = c))
      }
    }

    const list = Object.values(map)
    if (!list.length) {
      setChallenges([])
      return
    }
    const ids = list.map((c: any) => c.id)
    const { data: allParts } = await supabase
      .from('challenge_participants')
      .select('challenge_id, user_id, status')
      .in('challenge_id', ids)
    const pl = (allParts as { challenge_id: string; user_id: string; status: string }[]) || []
    setChallenges(
      list.map((c: any) => ({
        ...c,
        count: pl.filter((p) => p.challenge_id === c.id && p.status === 'accepted').length,
        mine: pl.some((p) => p.challenge_id === c.id && p.user_id === uid && p.status === 'accepted'),
      }))
    )
  }

  // Dedup: un mismo entrenamiento (workout) puede publicarse al feed personal y a
  // grupos; lo mostramos una sola vez por (usuario, workout).
  const dedupedFeed = (() => {
    const seen = new Set<string>()
    return feed.filter((p) => {
      if (!p.workout_id) return true
      const key = `${p.user_id}:${p.workout_id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  })()

  const orderedFeed =
    order === 'relevante'
      ? [...dedupedFeed].sort((a, b) => {
          const pa = a.photo_url ? 1 : 0
          const pb = b.photo_url ? 1 : 0
          if (pa !== pb) return pb - pa
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
      : dedupedFeed

  const createGroup = async () => {
    if (!groupName.trim()) return
    setCreating(true)
    const { data: group } = await supabase
      .from('groups')
      .insert({ name: groupName.trim(), owner_id: userId, visibility: groupVisibility })
      .select()
      .single()
    if (group) {
      await supabase.from('group_members').insert({ group_id: group.id, user_id: userId, role: 'admin' })
      router.push(`/groups/${group.id}`)
    }
    setCreating(false)
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

  const saveCheckin = async () => {
    if (!userId) return
    setCiSaving(true)
    let photo_url: string | null = null
    if (ciFile) {
      const ext = (ciFile.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${userId}/checkin-${ciGroup || 'amigos'}-${ciComment.length}-${ciFile.size}.${ext}`
      const { error } = await supabase.storage.from('workout-photos').upload(path, ciFile, { upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('workout-photos').getPublicUrl(path)
        photo_url = `${data.publicUrl}?t=${ciFile.size}`
      }
    }
    let summary = ciComment.trim() || null
    if (ciShowRoutine && ciRoutine) {
      summary = `${summary ? summary + ' · ' : ''}📋 ${ciRoutine.name}`
    }
    const { error } = await supabase
      .from('group_posts')
      .insert({ group_id: ciGroup || null, user_id: userId, summary, photo_url })
    setCiSaving(false)
    if (error) {
      setSnack('No se pudo publicar el check-in')
      return
    }
    setCheckinOpen(false)
    setCiComment('')
    setCiFile(null)
    setCiShowRoutine(false)
    setSnack('¡Check-in publicado!')
    load()
  }

  const createChallenge = async () => {
    if (!chName.trim() || !userId) return
    setChSaving(true)
    const groupId = chGroup || null
    const isAdminOfGroup = groupId ? groups.some((g) => g.id === groupId && g.role === 'admin') : false
    // Si se asigna a una comunidad y no sos admin, queda pendiente de aprobación.
    const status = groupId && !isAdminOfGroup ? 'pending' : 'active'

    const { data: ch, error } = await supabase
      .from('challenges')
      .insert({
        creator_id: userId,
        name: chName.trim(),
        description: chDesc.trim() || null,
        duration_days: chDuration ? parseInt(chDuration, 10) : null,
        objective: chObjective.trim() || null,
        group_id: groupId,
        status,
      })
      .select()
      .single()

    if (error || !ch) {
      setChSaving(false)
      setSnack('No se pudo crear el desafío')
      return
    }

    // El creador participa automáticamente.
    await supabase.from('challenge_participants').insert({ challenge_id: ch.id, user_id: userId, status: 'accepted' })

    // Invitar a un individuo por @handle (opcional).
    const inviteHandle = chInvite.trim().toLowerCase().replace(/^@/, '')
    if (inviteHandle) {
      const { data: prof } = await supabase.from('profiles').select('id').eq('handle', inviteHandle).maybeSingle()
      if (prof) {
        await supabase.from('challenge_participants').insert({ challenge_id: ch.id, user_id: prof.id, status: 'invited' })
      }
    }

    setChSaving(false)
    setChOpen(false)
    setChName('')
    setChDesc('')
    setChDuration('')
    setChObjective('')
    setChGroup('')
    setChInvite('')
    setSnack(status === 'pending' ? 'Desafío enviado para aprobación del admin' : '¡Desafío creado!')
    load()
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

  return (
    <Box sx={{ minHeight: '100vh', pt: 2, pb: 12 }}>

      {/* Mis grupos */}
      <Box sx={{ px: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            Mis grupos
          </Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Crear grupo
          </Button>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {groups.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Todavía no estás en ningún grupo.
            </Typography>
          )}
          {groups.map((g) => (
            <Card key={g.id}>
              <CardActionArea onClick={() => router.push(`/groups/${g.id}`)}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5 }}>
                  <GroupIcon sx={{ color: 'primary.main' }} />
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {g.name}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </Box>

      {/* Desafíos */}
      {challenges.length > 0 && (
        <Box sx={{ px: 3, pb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>
            Desafíos
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {challenges.map((c) => (
              <Card key={c.id}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5 }}>
                  <EmojiEventsIcon sx={{ color: 'primary.main' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {c.name}
                      {c.status === 'pending' && (
                        <Chip label="Pendiente" size="small" sx={{ ml: 1, height: 18 }} />
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {[
                        c.objective,
                        c.duration_days ? `${c.duration_days} días` : null,
                        c.group_id ? groupNames[c.group_id] : 'Personal',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.count} participando
                    </Typography>
                  </Box>
                  {c.status === 'active' && (
                    <Button
                      size="small"
                      variant={c.mine ? 'contained' : 'outlined'}
                      color={c.mine ? 'primary' : 'inherit'}
                      onClick={() => toggleChallenge(c)}
                    >
                      {c.mine ? 'Participás' : 'Sumarme'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* Feed de comunidades */}
      {feed.length > 0 && (
        <Box sx={{ px: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
              Feed
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Chip
                label="Reciente"
                size="small"
                color={order === 'reciente' ? 'primary' : 'default'}
                onClick={() => setOrder('reciente')}
              />
              <Chip
                label="Relevante"
                size="small"
                color={order === 'relevante' ? 'primary' : 'default'}
                onClick={() => setOrder('relevante')}
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {orderedFeed.map((p) => (
              <CheckinCard
                key={p.id}
                post={p}
                authorHandle={authors[p.user_id]?.handle ?? handles[p.user_id] ?? null}
                authorName={authors[p.user_id]?.display_name ?? null}
                authorAvatar={authors[p.user_id]?.avatar_url ?? null}
                userId={userId}
                likeCount={likes[p.id]?.count ?? 0}
                liked={!!likes[p.id]?.mine}
                onToggleLike={() => toggleLike(p.id)}
                commentCount={commentCounts[p.id] ?? 0}
                onCommentCount={(n) => setCommentCounts((prev) => ({ ...prev, [p.id]: n }))}
                onOpenProfile={() => {
                  const h = authors[p.user_id]?.handle ?? handles[p.user_id]
                  if (h) router.push(`/u/${h}`)
                }}
                onOpenRoutine={() => p.routineId && router.push(`/r/${p.routineId}`)}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* FAB con acciones rápidas */}
      <SpeedDial
        ariaLabel="Acciones"
        icon={<SpeedDialIcon />}
        sx={{ position: 'fixed', bottom: 96, right: 'max(16px, calc(50% - 284px))', zIndex: 12 }}
      >
        <SpeedDialAction
          icon={<PhotoCameraIcon />}
          title="Nuevo check-in"
          open
          onClick={() => {
            setCiGroup('')
            setCheckinOpen(true)
          }}
        />
        <SpeedDialAction
          icon={<GroupIcon />}
          title="Crear grupo"
          open
          onClick={() => setCreateOpen(true)}
        />
        <SpeedDialAction
          icon={<EmojiEventsIcon />}
          title="Crear desafío"
          open
          onClick={() => setChOpen(true)}
        />
      </SpeedDial>

      {/* Crear grupo */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Nuevo grupo</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label="Nombre del grupo"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            sx={{ mt: 1 }}
            onKeyDown={(e) => e.key === 'Enter' && createGroup()}
          />
          <TextField
            select
            fullWidth
            label="Visibilidad"
            value={groupVisibility}
            onChange={(e) => setGroupVisibility(e.target.value as 'public' | 'private')}
            helperText={
              groupVisibility === 'public'
                ? 'Aparece en el buscador, cualquiera puede unirse.'
                : 'Solo accesible por invitación, no aparece en búsquedas.'
            }
          >
            <MenuItem value="private">🔒 Privada</MenuItem>
            <MenuItem value="public">🌐 Pública</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setCreateOpen(false)}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={createGroup} disabled={creating || !groupName.trim()}>
            {creating ? 'Creando...' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Nuevo check-in */}
      <Dialog open={checkinOpen} onClose={() => setCheckinOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Nuevo check-in</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            select
            fullWidth
            label="¿Dónde lo publicás?"
            value={ciGroup}
            onChange={(e) => setCiGroup(e.target.value)}
            helperText={ciGroup ? 'Lo ven los miembros de la comunidad y tus amigos.' : 'Lo ven tus amigos en su feed de Comunidades.'}
            sx={{ mt: 1 }}
          >
            <MenuItem value="">🌐 Solo mis amigos (sin grupo)</MenuItem>
            {groups.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Comentario"
            value={ciComment}
            onChange={(e) => setCiComment(e.target.value)}
            multiline
            rows={2}
            placeholder="¿Cómo te fue hoy?"
          />
          <Button variant="outlined" color="inherit" component="label" startIcon={<PhotoCameraIcon />}>
            {ciFile ? ciFile.name : 'Agregar foto'}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => setCiFile(e.target.files?.[0] ?? null)}
            />
          </Button>
          {ciRoutine && (
            <FormControlLabel
              control={<Switch checked={ciShowRoutine} onChange={(e) => setCiShowRoutine(e.target.checked)} />}
              label={`Mostrar mi rutina (${ciRoutine.name})`}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setCheckinOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={saveCheckin}
            disabled={ciSaving || (!ciComment.trim() && !ciFile)}
          >
            {ciSaving ? 'Publicando...' : 'Publicar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Crear desafío */}
      <Dialog open={chOpen} onClose={() => setChOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Crear desafío</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label="Nombre"
            value={chName}
            onChange={(e) => setChName(e.target.value)}
            sx={{ mt: 1 }}
            placeholder="Ej: Reto 30 días de sentadillas"
          />
          <TextField
            fullWidth
            label="Descripción (opcional)"
            value={chDesc}
            onChange={(e) => setChDesc(e.target.value)}
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="Objetivo (opcional)"
            value={chObjective}
            onChange={(e) => setChObjective(e.target.value)}
            placeholder="Ej: 100 sentadillas por día"
          />
          <TextField
            fullWidth
            label="Duración en días (opcional)"
            type="number"
            value={chDuration}
            onChange={(e) => setChDuration(e.target.value)}
          />
          <TextField
            select
            fullWidth
            label="Asignar a comunidad (opcional)"
            value={chGroup}
            onChange={(e) => setChGroup(e.target.value)}
            helperText={
              chGroup && !groups.some((g) => g.id === chGroup && g.role === 'admin')
                ? 'No sos admin: quedará pendiente de aprobación.'
                : ' '
            }
          >
            <MenuItem value="">Personal (sin comunidad)</MenuItem>
            {groups.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Invitar a alguien (@handle, opcional)"
            value={chInvite}
            onChange={(e) => setChInvite(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setChOpen(false)}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={createChallenge} disabled={chSaving || !chName.trim()}>
            {chSaving ? 'Creando...' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack}
        autoHideDuration={2800}
        onClose={() => setSnack('')}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 8 }}
      />
    </Box>
  )
}
