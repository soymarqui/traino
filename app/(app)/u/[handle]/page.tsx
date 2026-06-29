'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import GroupAddIcon from '@mui/icons-material/GroupAdd'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import InstagramIcon from '@mui/icons-material/Instagram'
import VerifiedIcon from '@mui/icons-material/Verified'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'

const IDENTITY_LABELS: Record<string, string> = { gymbro: 'GymBro', gymsis: 'GymSis', gympal: 'GymPal' }

type Profile = {
  id: string
  handle: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  identity: string | null
  instagram: string | null
  instagram_visibility: 'public' | 'contacts' | 'hidden'
  is_certified: boolean
}

export default function UserProfilePage() {
  const params = useParams()
  const handle = (params.handle as string).replace(/^@/, '')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [routines, setRoutines] = useState<{ id: string; name: string }[]>([])
  const [challenges, setChallenges] = useState<{ id: string; name: string; objective: string | null; duration_days: number | null }[]>([])
  const [adminGroups, setAdminGroups] = useState<{ id: string; name: string }[]>([])
  const [memberOf, setMemberOf] = useState<string[]>([])
  const [igVisible, setIgVisible] = useState(false)
  const [meId, setMeId] = useState<string | null>(null)
  const [friendship, setFriendship] = useState<{ id: string; requester_id: string; status: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const [snack, setSnack] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setMeId(user?.id ?? null)
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, handle, display_name, avatar_url, bio, identity, instagram, instagram_visibility, is_certified')
      .eq('handle', handle)
      .maybeSingle()
    setProfile(prof as Profile | null)

    // Estado de amistad entre el usuario actual y este perfil.
    if (user && prof && (prof as Profile).id !== user.id) {
      const pid = (prof as Profile).id
      const { data: fr } = await supabase
        .from('friendships')
        .select('id, requester_id, addressee_id, status')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${pid}),and(requester_id.eq.${pid},addressee_id.eq.${user.id})`)
        .maybeSingle()
      setFriendship(fr ? { id: fr.id, requester_id: fr.requester_id, status: fr.status } : null)
    }

    if (prof) {
      const { data: rts } = await supabase
        .from('routines')
        .select('id, name')
        .eq('owner_id', (prof as Profile).id)
        .eq('visibility', 'public')
        .order('created_at')
      setRoutines((rts as { id: string; name: string }[]) || [])

      const { data: chs } = await supabase
        .from('challenges')
        .select('id, name, objective, duration_days')
        .eq('creator_id', (prof as Profile).id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      setChallenges((chs as { id: string; name: string; objective: string | null; duration_days: number | null }[]) || [])
    }

    if (user) {
      const { data: mem } = await supabase
        .from('group_members')
        .select('group_id, role, group:groups(id, name)')
        .eq('user_id', user.id)
        .eq('role', 'admin')
      const groups = (mem || [])
        .map((m: any) => (Array.isArray(m.group) ? m.group[0] : m.group))
        .filter(Boolean)
      setAdminGroups(groups)

      if (prof) {
        const theirIds = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', (prof as Profile).id)
        const theirGroupIds = (theirIds.data || []).map((m: { group_id: string }) => m.group_id)
        setMemberOf(theirGroupIds)

        // ¿Puede ver el Instagram? public siempre; contacts si comparten comunidad; propio perfil siempre.
        const vis = (prof as Profile).instagram_visibility ?? 'public'
        if ((prof as Profile).id === user.id || vis === 'public') {
          setIgVisible(true)
        } else if (vis === 'contacts') {
          const mineIds = (mem || []).map((m: { group_id: string }) => m.group_id)
          // mem solo trae grupos donde soy admin; traigo todos mis grupos para el cruce.
          const { data: allMine } = await supabase.from('group_members').select('group_id').eq('user_id', user.id)
          const myGroupIds = new Set([...mineIds, ...((allMine || []).map((m: { group_id: string }) => m.group_id))])
          setIgVisible(theirGroupIds.some((g) => myGroupIds.has(g)))
        }
      }
    }
    setLoading(false)
  }

  const sendFriendRequest = async () => {
    if (!meId || !profile) return
    const { data } = await supabase
      .from('friendships')
      .insert({ requester_id: meId, addressee_id: profile.id, status: 'pending' })
      .select('id, requester_id, status')
      .single()
    if (data) setFriendship(data as { id: string; requester_id: string; status: string })
    setSnack('Solicitud enviada')
  }

  const acceptFriend = async () => {
    if (!friendship) return
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendship.id)
    setFriendship({ ...friendship, status: 'accepted' })
    setSnack('¡Ahora son amigos!')
  }

  const removeFriend = async () => {
    if (!friendship) return
    await supabase.from('friendships').delete().eq('id', friendship.id)
    setFriendship(null)
  }

  const addToGroup = async (groupId: string) => {
    if (!profile) return
    setAnchor(null)
    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, user_id: profile.id, role: 'member' })
    if (!error) {
      setMemberOf((prev) => [...prev, groupId])
      setSnack('Agregado a la comunidad')
    } else {
      setSnack('No se pudo (¿ya está?)')
    }
  }

  const name = profile?.display_name || (profile?.handle ? `@${profile.handle}` : 'Usuario')

  return (
    <Box sx={{ minHeight: '100vh', pb: 12 }}>
      <Box sx={{ px: 3, pt: 4, pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => router.back()}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Perfil
        </Typography>
      </Box>

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {loading && <Typography color="text.secondary">Cargando...</Typography>}

        {!loading && !profile && (
          <Typography color="text.secondary">No se encontró ese usuario.</Typography>
        )}

        {!loading && profile && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar src={profile.avatar_url || undefined} sx={{ width: 64, height: 64, fontSize: '1.5rem' }}>
                {name[0]?.toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {name}
                  </Typography>
                  {profile.is_certified && <VerifiedIcon sx={{ color: 'primary.main', fontSize: 20 }} titleAccess="Perfil certificado" />}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {profile.handle && (
                    <Typography variant="body2" color="text.secondary">
                      @{profile.handle}
                    </Typography>
                  )}
                  {profile.identity && (
                    <Chip label={IDENTITY_LABELS[profile.identity] ?? profile.identity} size="small" color="primary" sx={{ height: 20 }} />
                  )}
                </Box>
              </Box>
              {adminGroups.length > 0 && (
                <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label="Agregar a comunidad">
                  <GroupAddIcon />
                </IconButton>
              )}
            </Box>

            {/* Acción de amistad (no en el propio perfil) */}
            {meId && profile.id !== meId && (
              <>
                {!friendship && (
                  <Button variant="contained" startIcon={<PersonAddIcon />} onClick={sendFriendRequest}>
                    Agregar amigo
                  </Button>
                )}
                {friendship?.status === 'pending' && friendship.requester_id === meId && (
                  <Button variant="outlined" color="inherit" disabled>
                    Solicitud enviada
                  </Button>
                )}
                {friendship?.status === 'pending' && friendship.requester_id !== meId && (
                  <Button variant="contained" startIcon={<PersonAddIcon />} onClick={acceptFriend}>
                    Aceptar solicitud
                  </Button>
                )}
                {friendship?.status === 'accepted' && (
                  <Button variant="outlined" color="inherit" startIcon={<HowToRegIcon />} onClick={removeFriend}>
                    Amigos · quitar
                  </Button>
                )}
              </>
            )}

            {profile.bio && (
              <Typography variant="body2" color="text.secondary">
                {profile.bio}
              </Typography>
            )}

            {profile.instagram && igVisible && (
              <Box
                component="a"
                href={`https://instagram.com/${profile.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, color: 'text.primary', textDecoration: 'none', width: 'fit-content' }}
              >
                <InstagramIcon sx={{ color: '#E1306C' }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>@{profile.instagram}</Typography>
              </Box>
            )}

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Rutinas públicas
              </Typography>
              {routines.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No tiene rutinas públicas.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {routines.map((r) => (
                    <Card key={r.id}>
                      <CardActionArea onClick={() => router.push(`/r/${r.id}`)}>
                        <CardContent sx={{ py: 1.5 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {r.name}
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>

            {challenges.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Desafíos
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {challenges.map((c) => (
                    <Card key={c.id}>
                      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5 }}>
                        <EmojiEventsIcon sx={{ color: 'primary.main' }} />
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {c.name}
                          </Typography>
                          {(c.objective || c.duration_days) && (
                            <Typography variant="body2" color="text.secondary">
                              {[c.objective, c.duration_days ? `${c.duration_days} días` : null].filter(Boolean).join(' · ')}
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            )}
          </>
        )}
      </Box>

      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {adminGroups.map((g) => (
          <MenuItem key={g.id} onClick={() => addToGroup(g.id)} disabled={memberOf.includes(g.id)}>
            {memberOf.includes(g.id) ? `${g.name} (ya está)` : `Agregar a ${g.name}`}
          </MenuItem>
        ))}
      </Menu>

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
