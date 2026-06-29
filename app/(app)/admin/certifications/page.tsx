'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import InboxIcon from '@mui/icons-material/Inbox'
import { createClient } from '@/lib/supabase/client'
import { isAdmin } from '@/lib/admin'
import { useRouter } from 'next/navigation'

type ReqRow = {
  id: string
  user_id: string
  document_url: string | null
  note: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  handle?: string | null
  display_name?: string | null
}

const STATUS_LABELS = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' } as const
const STATUS_COLORS = { pending: 'warning', approved: 'success', rejected: 'default' } as const

export default function CertificationsAdminPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [requests, setRequests] = useState<ReqRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!isAdmin(user?.email)) {
      setAllowed(false)
      return
    }
    setAllowed(true)
    fetchRequests()
  }

  const fetchRequests = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('certification_requests')
      .select('*')
      .order('created_at', { ascending: false })
    const rows = (data as ReqRow[]) || []
    const uids = [...new Set(rows.map((r) => r.user_id))]
    if (uids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, handle, display_name').in('id', uids)
      const map: Record<string, { handle: string | null; display_name: string | null }> = {}
      ;(profs || []).forEach((p: any) => (map[p.id] = { handle: p.handle, display_name: p.display_name }))
      setRequests(rows.map((r) => ({ ...r, handle: map[r.user_id]?.handle, display_name: map[r.user_id]?.display_name })))
    } else {
      setRequests(rows)
    }
    setLoading(false)
  }

  const viewDoc = async (path: string) => {
    const { data } = await supabase.storage.from('certifications').createSignedUrl(path, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const decide = async (req: ReqRow, status: 'approved' | 'rejected') => {
    setBusyId(req.id)
    await supabase
      .from('certification_requests')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', req.id)
    if (status === 'approved') {
      await supabase.from('profiles').update({ is_certified: true }).eq('id', req.user_id)
    }
    await fetchRequests()
    setBusyId(null)
  }

  if (allowed === false) {
    return (
      <Box sx={{ minHeight: '100vh', pb: 10 }}>
        <Box sx={{ px: 3, pt: 4, pb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => router.back()}><ArrowBackIcon /></IconButton>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Certificaciones</Typography>
        </Box>
        <Box sx={{ px: 3, pt: 8, textAlign: 'center' }}>
          <Typography color="text.secondary">No tenés permisos para ver esta página.</Typography>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 10 }}>
      <Box sx={{ px: 3, pt: 4, pb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => router.back()}><ArrowBackIcon /></IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Certificaciones</Typography>
      </Box>

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {(allowed === null || loading) && <Typography color="text.secondary">Cargando...</Typography>}

        {allowed && !loading && requests.length === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pt: 8 }}>
            <InboxIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Typography color="text.secondary">No hay solicitudes todavía.</Typography>
          </Box>
        )}

        {allowed && !loading && requests.map((req) => (
          <Card key={req.id}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 600, flex: 1 }}>
                  {req.handle ? `@${req.handle}` : req.display_name || 'usuario'}
                </Typography>
                <Chip label={STATUS_LABELS[req.status]} size="small" color={STATUS_COLORS[req.status]} />
              </Box>

              {req.note && (
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{req.note}</Typography>
              )}

              {req.document_url && (
                <Button size="small" variant="outlined" color="inherit" onClick={() => viewDoc(req.document_url!)} sx={{ alignSelf: 'flex-start' }}>
                  Ver documento
                </Button>
              )}

              {req.status === 'pending' && (
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Button variant="contained" size="small" disabled={busyId === req.id} onClick={() => decide(req, 'approved')}>
                    Aprobar
                  </Button>
                  <Button variant="outlined" size="small" color="inherit" disabled={busyId === req.id} onClick={() => decide(req, 'rejected')}>
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
