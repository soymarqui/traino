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

type RequestRow = {
  id: string
  name: string
  muscle_id: string
  notes: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  muscle?: { name: string } | null
}

const STATUS_LABELS: Record<RequestRow['status'], string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
}

const STATUS_COLORS: Record<RequestRow['status'], 'warning' | 'success' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'default',
}

export default function ExerciseRequestsPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [requests, setRequests] = useState<RequestRow[]>([])
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
      .from('exercise_requests')
      .select('*, muscle:muscles(name)')
      .order('created_at', { ascending: false })

    setRequests((data as RequestRow[]) || [])
    setLoading(false)
  }

  const handleReject = async (req: RequestRow) => {
    setBusyId(req.id)
    await supabase
      .from('exercise_requests')
      .update({ status: 'rejected' })
      .eq('id', req.id)
    await fetchRequests()
    setBusyId(null)
  }

  // Gate de admin
  if (allowed === false) {
    return (
      <Box sx={{ minHeight: '100vh', pb: 10 }}>
        <Box sx={{ px: 3, pt: 4, pb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => router.back()}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Solicitudes
          </Typography>
        </Box>
        <Box sx={{ px: 3, pt: 8, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No tenés permisos para ver esta página.
          </Typography>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 10 }}>
      {/* Header */}
      <Box sx={{ px: 3, pt: 4, pb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => router.back()}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Solicitudes de ejercicios
        </Typography>
      </Box>

      <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {(allowed === null || loading) && (
          <Typography color="text.secondary">Cargando...</Typography>
        )}

        {allowed && !loading && requests.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              pt: 8,
            }}
          >
            <InboxIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Typography color="text.secondary">
              No hay solicitudes todavía.
            </Typography>
          </Box>
        )}

        {allowed &&
          !loading &&
          requests.map((req) => (
            <Card key={req.id}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, flex: 1 }}>
                    {req.name}
                  </Typography>
                  <Chip
                    label={STATUS_LABELS[req.status]}
                    size="small"
                    color={STATUS_COLORS[req.status]}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary">
                  {req.muscle?.name ?? 'Sin músculo'}
                </Typography>

                {req.notes && (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                    {req.notes}
                  </Typography>
                )}

                {req.status === 'pending' && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={busyId === req.id}
                      onClick={() => router.push(`/exercises/new?from_request=${req.id}`)}
                    >
                      Agregar ejercicio
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="inherit"
                      disabled={busyId === req.id}
                      onClick={() => handleReject(req)}
                    >
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
