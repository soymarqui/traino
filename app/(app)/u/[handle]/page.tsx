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
  age: number | null
  gender: string | null
  cover_url: string | null
  details_visibility: 'public' | 'friends' | 'hidden'
}

const GENDER_LABELS: Record<string, string> = { masculino: 'Masculino', femenino: 'Femenino', no_binarie: 'No binarie' }

export default function UserProfilePage() {
  const params = useParams()
  const handle = (params.handle as string).replace(/^@/, '')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [routines, setRoutines] = useState<{ id: string; name: string; cover_url: string | null }[]>([])
  const [challenges, setChallenges] = useState<{ id: string; name: string; objective: string | null; duration_days: number | null }[]>([])
  const [adminGroups, setAdminGroups] = useState<{ id: string; name: string }[]>([])
  const [memberOf, setMemberOf] = useState<string[]>([])
  const [igVisible, setIgVisible] = useState(false)
  const [detailsVisible, setDetailsVisible] = useState(false)
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
      .select('id, handle, display_name, avatar_url, bio, identity, instagram, instagram_visibility, is_certified, age, gender, cover_url, details_visibility')
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
        .select('id, name, cover_url')
        .eq('owner_id', (prof as Profile).id)
        .eq('visibility', 'public')
        .order('created_at')
      setRoutines((rts as { id: string; name: string; cover_url: string | null }[]) || [])

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
        setMemberOf((theirIds.data || []).map((m: { group_id: string }) => m.group_id))

        const own = (prof as Profile).id === user.id
        let isFriend = false
        if (!own) {
          const { data: af } = await supabase.rpc('are_friends', { a: user.id, b: (prof as Profile).id })
          isFriend = !!af
        }

        // Instagram: public siempre; contacts = amigos; oculto nunca (propio siempre).
        const igVis = (prof as Profile).instagram_visibility ?? 'public'
        setIgVisible(own || igVis === 'public' || (igVis === 'contacts' && isFriend))

        // Datos (edad/género): public siempre; friends = amigos; oculto nunca (propio siempre).
        const dVis = (prof as Profile).details_visibility ?? 'public'
        setDetailsVisible(own || dVis === 'public' || (dVis === 'friends' && isFriend))
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

  const detailChips: { label: string }[] = []
  if (profile && detailsVisible && profile.age) detailChips.push({ label: `${profile.age} años` })
  if (profile && detailsVisible && profile.gender) detailChips.push({ label: GENDER_LABELS[profile.gender] ?? profile.gender })

  return (
    <Box sx={{ minHeight: '100vh', pb: 12 }}>
      <IconButton
        onClick={() => router.back()}
        aria-label="Atrás"
        sx={{
          position: 'fixed', top: 12, left: 12, zIndex: 3,
          bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', backdropFilter: 'blur(4px)',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
        }}
      >
        <ArrowBackIcon />
      </IconButton>
      {!loading && profile && adminGroups.length > 0 && (
        <IconButton
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label="Agregar a comunidad"
          sx={{
            position: 'fixed', top: 12, right: 12, zIndex: 3,
            bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', backdropFilter: 'blur(4px)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
          }}
        >
          <GroupAddIcon />
        </IconButton>
      )}

      {loading && <Typography color="text.secondary" sx={{ px: 3, pt: 4 }}>Cargando...</Typography>}
      {!loading && !profile && (
        <Typography color="text.secondary" sx={{ px: 3, pt: 4 }}>No se encontró ese usuario.</Typography>
      )}

      {!loading && profile && (
        <>
          {/* Portada */}
          <Box
            sx={{
              height: 170, width: '100%',
              background: profile.cover_url ? undefined : 'linear-gradient(135deg, #1a1a1a, #0A0A0A)',
            }}
          >
            {profile.cover_url && (
              <Box component="img" src={profile.cover_url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            )}
          </Box>

          {/* Cabecera centrada */}
          <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 1 }}>
            <Avatar
              src={profile.avatar_url || undefined}
              sx={{ width: 96, height: 96, fontSize: '2.2rem', mt: '-48px', border: '4px solid', borderColor: 'background.default', bgcolor: 'primary.main', color: '#0A0A0A', fontWeight: 700 }}
            >
              {name[0]?.toUpperCase()}
            </Avatar>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{name}</Typography>
              {profile.is_certified && <VerifiedIcon sx={{ color: 'primary.main', fontSize: 22 }} titleAccess="Perfil certificado" />}
            </Box>
            {profile.handle && (
              <Typography variant="body2" color="text.secondary">@{profile.handle}</Typography>
            )}
            {profile.identity && (
              <Chip label={IDENTITY_LABELS[profile.identity] ?? profile.identity} size="small" color="primary" />
            )}

            {/* Datos visibles */}
            {(detailChips.length > 0 || (profile.instagram && igVisible)) && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1, mt: 0.5 }}>
                {detailChips.map((c) => (
                  <Chip key={c.label} label={c.label} size="small" variant="outlined" />
                ))}
                {profile.instagram && igVisible && (
                  <Chip
                    icon={<InstagramIcon sx={{ color: '#E1306C !important' }} />}
                    label={`@${profile.instagram}`}
                    size="small"
                    variant="outlined"
                    component="a"
                    clickable
                    href={`https://instagram.com/${profile.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                )}
              </Box>
            )}

            {profile.bio && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 460 }}>
                {profile.bio}
              </Typography>
            )}

            {/* Acción de amistad */}
            {meId && profile.id !== meId && (
              <Box sx={{ mt: 1, width: '100%', maxWidth: 320 }}>
                {!friendship && (
                  <Button fullWidth variant="contained" startIcon={<PersonAddIcon />} onClick={sendFriendRequest}>
                    Agregar amigo
                  </Button>
                )}
                {friendship?.status === 'pending' && friendship.requester_id === meId && (
                  <Button fullWidth variant="outlined" color="inherit" disabled>Solicitud enviada</Button>
                )}
                {friendship?.status === 'pending' && friendship.requester_id !== meId && (
                  <Button fullWidth variant="contained" startIcon={<PersonAddIcon />} onClick={acceptFriend}>
                    Aceptar solicitud
                  </Button>
                )}
                {friendship?.status === 'accepted' && (
                  <Button fullWidth variant="outlined" color="inherit" startIcon={<HowToRegIcon />} onClick={removeFriend}>
                    Amigos · quitar
                  </Button>
                )}
              </Box>
            )}
          </Box>

          {/* Secciones */}
          <Box sx={{ px: 3, mt: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Rutinas públicas
              </Typography>
              {routines.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No tiene rutinas públicas.
                </Typography>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  {routines.map((r) => (
                    <Card key={r.id} sx={{ borderRadius: '18px' }}>
                      <CardActionArea onClick={() => router.push(`/r/${r.id}`)} sx={{ height: '100%' }}>
                        <Box
                          sx={{
                            position: 'relative', aspectRatio: '1 / 1',
                            background: r.cover_url ? undefined : 'linear-gradient(135deg, #1f1f1f, #0A0A0A)',
                          }}
                        >
                          {r.cover_url && (
                            <Box component="img" src={r.cover_url} alt="" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                          )}
                          {/* Gradiente para legibilidad del título */}
                          <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0) 55%)' }} />
                          <Typography
                            variant="body1"
                            sx={{ position: 'absolute', left: 12, right: 12, bottom: 10, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}
                          >
                            {r.name}
                          </Typography>
                        </Box>
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
          </Box>
        </>
      )}

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
