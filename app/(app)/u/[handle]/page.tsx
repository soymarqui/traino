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
}

export default function UserProfilePage() {
  const params = useParams()
  const handle = (params.handle as string).replace(/^@/, '')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [routines, setRoutines] = useState<{ id: string; name: string }[]>([])
  const [adminGroups, setAdminGroups] = useState<{ id: string; name: string }[]>([])
  const [memberOf, setMemberOf] = useState<string[]>([])
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
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, handle, display_name, avatar_url, bio, identity')
      .eq('handle', handle)
      .maybeSingle()
    setProfile(prof as Profile | null)

    if (prof) {
      const { data: rts } = await supabase
        .from('routines')
        .select('id, name')
        .eq('owner_id', (prof as Profile).id)
        .eq('visibility', 'public')
        .order('created_at')
      setRoutines((rts as { id: string; name: string }[]) || [])
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
        const { data: theirs } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', (prof as Profile).id)
        setMemberOf((theirs || []).map((m: { group_id: string }) => m.group_id))
      }
    }
    setLoading(false)
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
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {name}
                </Typography>
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

            {profile.bio && (
              <Typography variant="body2" color="text.secondary">
                {profile.bio}
              </Typography>
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
