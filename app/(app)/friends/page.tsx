'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import SearchIcon from '@mui/icons-material/Search'
import GroupIcon from '@mui/icons-material/Group'
import AddIcon from '@mui/icons-material/Add'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Result = { id: string; name: string; handle: string | null }
type GroupRow = { id: string; name: string }

export default function FriendsPage() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [creating, setCreating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('groups')
      .select('id, name')
      .order('created_at')
      .then(({ data }) => setGroups((data as GroupRow[]) || []))
  }, [])

  const createGroup = async () => {
    if (!groupName.trim()) return
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: group } = await supabase
      .from('groups')
      .insert({ name: groupName.trim(), owner_id: user?.id })
      .select()
      .single()
    if (group) {
      await supabase.from('group_members').insert({ group_id: group.id, user_id: user?.id, role: 'admin' })
      router.push(`/groups/${group.id}`)
    }
    setCreating(false)
  }

  const search = async () => {
    const handle = q.trim().toLowerCase().replace(/^@/, '')
    if (!handle) return
    setLoading(true)
    setSearched(true)

    // Usuarios cuyo handle matchea.
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, handle')
      .ilike('handle', `${handle}%`)
      .limit(10)

    const ids = (profiles || []).map((p: { id: string }) => p.id)
    const handleById: Record<string, string | null> = {}
    ;(profiles || []).forEach((p: { id: string; handle: string | null }) => {
      handleById[p.id] = p.handle
    })

    let rows: Result[] = []
    if (ids.length) {
      const { data: routines } = await supabase
        .from('routines')
        .select('id, name, owner_id')
        .in('owner_id', ids)
        .eq('visibility', 'public')
        .order('created_at')
      rows = (routines || []).map((r: { id: string; name: string; owner_id: string }) => ({
        id: r.id,
        name: r.name,
        handle: handleById[r.owner_id] ?? null,
      }))
    }

    setResults(rows)
    setLoading(false)
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 12 }}>
      <Box sx={{ px: 3, pt: 4, pb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Comunidad
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Buscá usuarios por su @ y sumate a grupos
        </Typography>
      </Box>

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

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          fullWidth
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="usuario"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary' }} />
                  <span style={{ color: '#888', marginLeft: 4 }}>@</span>
                </InputAdornment>
              ),
            },
          }}
        />

        {loading && <Typography color="text.secondary">Buscando...</Typography>}

        {!loading && searched && results.length === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pt: 6, textAlign: 'center' }}>
            <GroupIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Typography color="text.secondary">
              No encontramos rutinas públicas para ese usuario.
            </Typography>
          </Box>
        )}

        {!loading &&
          results.map((r) => (
            <Card key={r.id}>
              <CardActionArea onClick={() => router.push(`/r/${r.id}`)}>
                <CardContent>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {r.name}
                  </Typography>
                  {r.handle && (
                    <Typography variant="body2" color="text.secondary">
                      por @{r.handle}
                    </Typography>
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
      </Box>

      {/* Crear grupo */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Nuevo grupo</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Nombre del grupo"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            sx={{ mt: 1 }}
            onKeyDown={(e) => e.key === 'Enter' && createGroup()}
          />
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
    </Box>
  )
}
