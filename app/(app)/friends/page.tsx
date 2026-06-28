'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import SearchIcon from '@mui/icons-material/Search'
import GroupIcon from '@mui/icons-material/Group'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Result = { id: string; name: string; handle: string | null }

export default function FriendsPage() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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
          Amigos
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Buscá un usuario por su @ y mirá sus rutinas públicas
        </Typography>
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
    </Box>
  )
}
