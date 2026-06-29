'use client'

import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import Snackbar from '@mui/material/Snackbar'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SearchIcon from '@mui/icons-material/Search'
import GroupIcon from '@mui/icons-material/Group'
import PersonIcon from '@mui/icons-material/Person'
import ChecklistIcon from '@mui/icons-material/Checklist'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import VerifiedIcon from '@mui/icons-material/Verified'
import { createClient } from '@/lib/supabase/client'
import { gradientBorderSx } from '@/lib/theme'
import { useRouter } from 'next/navigation'

type Result = { id: string; name: string; handle: string | null; description?: string | null; cover_url?: string | null; certified?: boolean }
type UserResult = { id: string; handle: string | null; display_name: string | null; avatar_url: string | null; is_certified?: boolean }
type GroupResult = { id: string; name: string; visibility: string; member: boolean }
type ChallengeResult = { id: string; name: string; objective: string | null; group_id: string | null }

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [myGroupIds, setMyGroupIds] = useState<string[]>([])
  const [friendBy, setFriendBy] = useState<Record<string, 'friends' | 'sent' | 'received'>>({})
  const [userResults, setUserResults] = useState<UserResult[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [groupResults, setGroupResults] = useState<GroupResult[]>([])
  const [challengeResults, setChallengeResults] = useState<ChallengeResult[]>([])
  const [snack, setSnack] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)
      if (user) {
        const { data: mem } = await supabase.from('group_members').select('group_id').eq('user_id', user.id)
        setMyGroupIds((mem || []).map((m: { group_id: string }) => m.group_id))

        // Estado de amistad con cada usuario (para mostrar en los resultados).
        const { data: fr } = await supabase
          .from('friendships')
          .select('requester_id, addressee_id, status')
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        const map: Record<string, 'friends' | 'sent' | 'received'> = {}
        ;(fr || []).forEach((f: { requester_id: string; addressee_id: string; status: string }) => {
          const other = f.requester_id === user.id ? f.addressee_id : f.requester_id
          map[other] = f.status === 'accepted' ? 'friends' : f.requester_id === user.id ? 'sent' : 'received'
        })
        setFriendBy(map)
      }
    }
    load()
    inputRef.current?.focus()
  }, [])

  const joinGroup = async (groupId: string) => {
    if (!userId) return
    const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: userId, role: 'member' })
    if (!error) {
      setGroupResults((prev) => prev.map((g) => (g.id === groupId ? { ...g, member: true } : g)))
      setMyGroupIds((prev) => [...prev, groupId])
      setSnack('¡Te uniste a la comunidad!')
    } else {
      setSnack('No se pudo unir (¿ya sos miembro?)')
    }
  }

  const search = async () => {
    const term = q.trim().replace(/^@/, '')
    if (!term) return
    setLoading(true)
    setSearched(true)
    const like = `%${term}%`

    // 1) Usuarios públicos.
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, handle, display_name, avatar_url, is_certified')
      .or(`handle.ilike.${like},display_name.ilike.${like}`)
      .eq('is_public', true)
      .limit(15)
    const profs = (profiles as UserResult[]) || []
    setUserResults(profs)
    const handleById: Record<string, string | null> = {}
    const certifiedById: Record<string, boolean> = {}
    profs.forEach((p) => {
      handleById[p.id] = p.handle
      certifiedById[p.id] = !!p.is_certified
    })

    // 2) Rutinas públicas (por nombre o de los usuarios encontrados).
    const ownerIds = profs.map((p) => p.id)
    const routineFilters = [`name.ilike.${like}`]
    if (ownerIds.length) routineFilters.push(`owner_id.in.(${ownerIds.join(',')})`)
    const { data: routines } = await supabase
      .from('routines')
      .select('id, name, owner_id, description, cover_url')
      .eq('visibility', 'public')
      .or(routineFilters.join(','))
      .limit(15)
    const missingOwners = [...new Set((routines || []).map((r: any) => r.owner_id).filter((id: string) => !(id in handleById)))]
    if (missingOwners.length) {
      const { data: owners } = await supabase.from('profiles').select('id, handle, is_certified').in('id', missingOwners)
      ;(owners || []).forEach((o: { id: string; handle: string | null; is_certified: boolean }) => {
        handleById[o.id] = o.handle
        certifiedById[o.id] = !!o.is_certified
      })
    }
    setResults(
      ((routines as { id: string; name: string; owner_id: string; description: string | null; cover_url: string | null }[]) || [])
        .map((r) => ({
          id: r.id,
          name: r.name,
          handle: handleById[r.owner_id] ?? null,
          description: r.description,
          cover_url: r.cover_url,
          certified: certifiedById[r.owner_id] ?? false,
        }))
        .sort((a, b) => Number(b.certified) - Number(a.certified))
    )

    // 3) Comunidades públicas.
    const myIds = new Set(myGroupIds)
    const { data: pubGroups } = await supabase
      .from('groups')
      .select('id, name, visibility')
      .eq('visibility', 'public')
      .ilike('name', like)
      .limit(15)
    setGroupResults(
      ((pubGroups as { id: string; name: string; visibility: string }[]) || []).map((g) => ({
        ...g,
        member: myIds.has(g.id),
      }))
    )

    // 4) Desafíos activos.
    const { data: chs } = await supabase
      .from('challenges')
      .select('id, name, objective, group_id')
      .eq('status', 'active')
      .ilike('name', like)
      .limit(15)
    setChallengeResults((chs as ChallengeResult[]) || [])

    setLoading(false)
  }

  const nothing =
    searched && userResults.length === 0 && results.length === 0 && groupResults.length === 0 && challengeResults.length === 0

  return (
    <Box sx={{ minHeight: '100vh', pb: 12 }}>
      <Box sx={{ px: 2, pt: 3, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => router.back()} aria-label="Atrás">
          <ArrowBackIcon />
        </IconButton>
        <TextField
          inputRef={inputRef}
          fullWidth
          size="small"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="Buscar usuarios, rutinas, comunidades..."
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        {loading && <Typography color="text.secondary">Buscando...</Typography>}

        {!loading && !searched && (
          <Typography color="text.secondary" sx={{ pt: 4, textAlign: 'center' }}>
            Buscá personas, rutinas, comunidades y desafíos.
          </Typography>
        )}

        {!loading && nothing && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pt: 6, textAlign: 'center' }}>
            <SearchIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Typography color="text.secondary">No encontramos nada para esa búsqueda.</Typography>
          </Box>
        )}

        {/* Usuarios */}
        {!loading && userResults.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
              Usuarios
            </Typography>
            {userResults.map((u) => (
              <Card key={u.id} sx={{ borderLeft: '3px solid', borderColor: 'info.main' }}>
                <CardActionArea disabled={!u.handle} onClick={() => u.handle && router.push(`/u/${u.handle}`)}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '12px !important' }}>
                    <Avatar src={u.avatar_url || undefined} sx={{ width: 36, height: 36 }}>
                      {(u.display_name || u.handle || '?')[0]?.toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {u.display_name || (u.handle ? `@${u.handle}` : 'Usuario')}
                        </Typography>
                        {u.is_certified && <VerifiedIcon sx={{ color: 'primary.main', fontSize: 16 }} />}
                      </Box>
                      {u.handle && <Typography variant="caption" color="text.secondary">@{u.handle}</Typography>}
                    </Box>
                    {friendBy[u.id] === 'friends' && <Chip label="Amigos" size="small" color="primary" />}
                    {friendBy[u.id] === 'sent' && <Chip label="Pendiente" size="small" />}
                    {friendBy[u.id] === 'received' && <Chip label="Te solicitó" size="small" color="primary" variant="outlined" />}
                    {!friendBy[u.id] && <PersonIcon sx={{ color: 'text.secondary' }} />}
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </>
        )}

        {/* Comunidades */}
        {!loading && groupResults.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, mt: 1 }}>
              Comunidades
            </Typography>
            {groupResults.map((g) => (
              <Card key={g.id} sx={{ borderLeft: '3px solid', borderColor: 'primary.main' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '12px !important' }}>
                  <GroupIcon sx={{ color: 'primary.main' }} />
                  <Box sx={{ flex: 1, cursor: 'pointer' }} onClick={() => router.push(`/groups/${g.id}`)}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{g.name}</Typography>
                    <Typography variant="caption" color="text.secondary">Comunidad pública</Typography>
                  </Box>
                  {g.member ? (
                    <Chip label="Miembro" size="small" color="primary" />
                  ) : (
                    <Button size="small" variant="outlined" onClick={() => joinGroup(g.id)}>Unirme</Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </>
        )}

        {/* Rutinas */}
        {!loading && results.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, mt: 1 }}>
              Rutinas
            </Typography>
            {results.map((r) => (
              <Card key={r.id} sx={r.certified ? gradientBorderSx(18) : { borderLeft: '3px solid', borderColor: 'success.main' }}>
                <CardActionArea onClick={() => router.push(`/r/${r.id}`)}>
                  {r.cover_url && (
                    <Box component="img" src={r.cover_url} alt="" sx={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                  )}
                  <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: '12px !important' }}>
                    <ChecklistIcon sx={{ color: 'success.main', mt: 0.3 }} />
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>{r.name}</Typography>
                        {r.certified && <Chip icon={<VerifiedIcon />} label="Certificada" size="small" color="primary" sx={{ height: 20 }} />}
                      </Box>
                      {r.handle && <Typography variant="caption" color="text.secondary">por @{r.handle}</Typography>}
                      {r.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                        >
                          {r.description}
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </>
        )}

        {/* Desafíos */}
        {!loading && challengeResults.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, mt: 1 }}>
              Desafíos
            </Typography>
            {challengeResults.map((c) => (
              <Card key={c.id} sx={{ borderLeft: '3px solid', borderColor: 'warning.main' }}>
                <CardActionArea disabled={!c.group_id} onClick={() => c.group_id && router.push(`/groups/${c.group_id}`)}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '12px !important' }}>
                    <EmojiEventsIcon sx={{ color: 'warning.main' }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>{c.name}</Typography>
                      {c.objective && <Typography variant="caption" color="text.secondary">{c.objective}</Typography>}
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </>
        )}
      </Box>

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
